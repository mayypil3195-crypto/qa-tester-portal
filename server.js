require('dotenv').config();
const path = require('path');
const express = require('express');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL ? process.env.DISCORD_WEBHOOK_URL.trim() : '';

// Middleware configuration
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Validate URL string
 * @param {string} urlString
 * @returns {boolean}
 */
function isValidHttpUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Dispatches an embed notification to Discord Webhook asynchronously
 * @param {Object} data
 * @param {number|bigint} id
 */
async function dispatchDiscordWebhook(data, id) {
  if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.includes('your_webhook_id')) {
    console.log(`[Discord Webhook] Skipped for request #${id} (DISCORD_WEBHOOK_URL not configured).`);
    return;
  }

  const { username, discord_id, points, work_type, description, proof_url } = data;

  // Discord embed character safety limits: field value max 1024
  const formattedDescription = description.length > 1020 
    ? description.substring(0, 1017) + '...' 
    : description;

  const proofFieldContent = proof_url && isValidHttpUrl(proof_url)
    ? `[Ссылка на материалы](${proof_url})`
    : 'Не прикреплено';

  const embed = {
    title: `📋 Новая заявка на начисление PTS #${id}`,
    color: 0x5865f2, // Discord Blurple
    fields: [
      {
        name: 'Тестер',
        value: `${username} (<@${discord_id}>)`,
        inline: true
      },
      {
        name: 'Сумма PTS',
        value: `+${points} PTS`,
        inline: true
      },
      {
        name: 'Тип активности',
        value: work_type,
        inline: true
      },
      {
        name: 'Описание работы',
        value: formattedDescription,
        inline: false
      },
      {
        name: 'Доказательства',
        value: proofFieldContent,
        inline: false
      }
    ],
    footer: {
      text: `Discord ID: ${discord_id} • Status: PENDING`
    },
    timestamp: new Date().toISOString()
  };

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        embeds: [embed]
      })
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.error(`[Discord Webhook Error] Status ${response.status} ${response.statusText}: ${errorBody}`);
    } else {
      console.log(`[Discord Webhook] Notification dispatched successfully for request #${id}.`);
    }
  } catch (err) {
    console.error(`[Discord Webhook Network Error] Failed to send notification for request #${id}:`, err.message);
  }
}

// ---------------- API ENDPOINTS ----------------

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

/**
 * Query recent submissions for monitoring
 */
app.get('/api/requests', (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const requests = db.getAllRequests(limit);
    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('[API Error /api/requests]:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve requests.'
    });
  }
});

/**
 * Submit point request
 */
app.post('/api/request-points', async (req, res) => {
  try {
    const { username, discord_id, points, work_type, description, proof_url } = req.body;

    const errors = [];

    // Username validation
    if (!username || typeof username !== 'string' || !username.trim()) {
      errors.push('Поле "Имя пользователя / тег" обязательно для заполнения.');
    }

    // Discord ID validation (Snowflake format: 17 to 20 digits)
    const sanitizedDiscordId = discord_id ? String(discord_id).trim() : '';
    if (!sanitizedDiscordId || !/^\d{17,20}$/.test(sanitizedDiscordId)) {
      errors.push('Некорректный Discord ID. Он должен состоять из 17-20 цифр (например, 1533076808902119495).');
    }

    // Points validation
    const parsedPoints = Number(points);
    if (!Number.isInteger(parsedPoints) || parsedPoints <= 0) {
      errors.push('Количество PTS должно быть положительным целым числом больше нуля.');
    } else if (parsedPoints > 10000) {
      errors.push('Максимальный лимит за одну заявку — 10,000 PTS.');
    }

    // Work type validation
    if (!work_type || typeof work_type !== 'string' || !work_type.trim()) {
      errors.push('Выберите категорию выполненной активности.');
    }

    // Description validation
    if (!description || typeof description !== 'string' || !description.trim()) {
      errors.push('Описание работы обязательно и должно содержать подробный отчет.');
    } else if (description.trim().length < 5) {
      errors.push('Описание работы слишком короткое (минимум 5 символов).');
    }

    // Proof URL validation (optional, but must be valid URL if provided)
    let sanitizedProofUrl = null;
    if (proof_url && typeof proof_url === 'string' && proof_url.trim().length > 0) {
      const trimmedUrl = proof_url.trim();
      if (!isValidHttpUrl(trimmedUrl)) {
        errors.push('Ссылка на доказательства должна быть корректным URL-адресом (начинаться с http:// или https://).');
      } else {
        sanitizedProofUrl = trimmedUrl;
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        errors,
        message: errors.join(' ')
      });
    }

    const payload = {
      username: username.trim(),
      discord_id: sanitizedDiscordId,
      points: parsedPoints,
      work_type: work_type.trim(),
      description: description.trim(),
      proof_url: sanitizedProofUrl
    };

    // Store in SQLite
    const newId = db.createRequest(payload);

    // Asynchronously dispatch Discord Webhook notification without blocking API response
    dispatchDiscordWebhook(payload, newId).catch(err => {
      console.error('[Async Webhook Dispatch Error]:', err);
    });

    return res.status(201).json({
      success: true,
      id: Number(newId),
      message: 'Заявка успешно зарегистрирована и передана на рассмотрение лидам.'
    });
  } catch (error) {
    console.error('[API Error /api/request-points]:', error);
    return res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера при обработке заявки.'
    });
  }
});

// Start listening
const server = app.listen(PORT, () => {
  console.log(`[QA Tester Portal] Server running on http://localhost:${PORT}`);
  console.log(`[QA Tester Portal] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[QA Tester Portal] Webhook configured: ${Boolean(DISCORD_WEBHOOK_URL && !DISCORD_WEBHOOK_URL.includes('your_webhook_id'))}`);
});

// Graceful shutdown handling
function handleShutdown(signal) {
  console.log(`\n[Process] Received ${signal}. Initiating graceful shutdown...`);
  server.close(() => {
    console.log('[Process] HTTP server closed.');
    try {
      db.close();
      console.log('[Process] SQLite database connection closed.');
    } catch (err) {
      console.error('[Process] Error closing SQLite database:', err);
    }
    process.exit(0);
  });

  // Force close if graceful termination stalls
  setTimeout(() => {
    console.error('[Process] Forcefully terminating process after timeout.');
    process.exit(1);
  }, 5000).unref();
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

module.exports = { app, server };
