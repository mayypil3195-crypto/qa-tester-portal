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

  const { username, discord_id, points, description, proof_url } = data;

  // Discord embed character limit safety (field max 1024)
  const formattedDescription = description.length > 1020 
    ? description.substring(0, 1017) + '...' 
    : description;

  const proofFieldContent = proof_url && isValidHttpUrl(proof_url)
    ? `[Link](${proof_url})`
    : 'None provided';

  const embed = {
    title: `📋 QA Points Request #${id}`,
    color: 0x5865f2,
    fields: [
      {
        name: 'Tester',
        value: `${username} (<@${discord_id}>)`,
        inline: true
      },
      {
        name: 'Points Requested',
        value: `+${points} PTS`,
        inline: true
      },
      {
        name: 'Report',
        value: formattedDescription,
        inline: false
      },
      {
        name: 'Proof',
        value: proofFieldContent,
        inline: false
      }
    ],
    footer: {
      text: `User ID: ${discord_id}`
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
 * Query recent submissions
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
      errors.push('Discord username is required.');
    }

    // Discord ID validation (Snowflake format: 17 to 20 digits)
    const sanitizedDiscordId = discord_id ? String(discord_id).trim() : '';
    if (!sanitizedDiscordId || !/^\d{17,20}$/.test(sanitizedDiscordId)) {
      errors.push('Discord User ID must be a 17-20 digit number.');
    }

    // Points validation (1 to 1000)
    const parsedPoints = Number(points);
    if (!Number.isInteger(parsedPoints) || parsedPoints < 1 || parsedPoints > 1000) {
      errors.push('Points requested must be a positive integer between 1 and 1000.');
    }

    // Description validation
    if (!description || typeof description !== 'string' || !description.trim()) {
      errors.push('Report details are required (minimum 5 characters).');
    } else if (description.trim().length < 5) {
      errors.push('Report details are too short (minimum 5 characters).');
    }

    // Proof URL validation (optional, but must be valid URL if provided)
    let sanitizedProofUrl = null;
    if (proof_url && typeof proof_url === 'string' && proof_url.trim().length > 0) {
      const trimmedUrl = proof_url.trim();
      if (!isValidHttpUrl(trimmedUrl)) {
        errors.push('Proof link must be a valid HTTP or HTTPS URL.');
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

    // Default fallback for work_type to maintain SQLite schema compatibility
    const sanitizedWorkType = (work_type && typeof work_type === 'string' && work_type.trim().length > 0)
      ? work_type.trim()
      : 'General Testing';

    const payload = {
      username: username.trim(),
      discord_id: sanitizedDiscordId,
      points: parsedPoints,
      work_type: sanitizedWorkType,
      description: description.trim(),
      proof_url: sanitizedProofUrl
    };

    // Store in SQLite
    const newId = db.createRequest(payload);

    // Asynchronously dispatch Discord Webhook notification
    dispatchDiscordWebhook(payload, newId).catch(err => {
      console.error('[Async Webhook Dispatch Error]:', err);
    });

    return res.status(201).json({
      success: true,
      id: Number(newId),
      message: 'Submitted successfully.'
    });
  } catch (error) {
    console.error('[API Error /api/request-points]:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while processing request.'
    });
  }
});

// Start listening
const server = app.listen(PORT, () => {
  console.log(`[QA Portal] Server running on port ${PORT}`);
  console.log(`[QA Portal] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[QA Portal] Webhook configured: ${Boolean(DISCORD_WEBHOOK_URL && !DISCORD_WEBHOOK_URL.includes('your_webhook_id'))}`);
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

  setTimeout(() => {
    console.error('[Process] Force termination timeout.');
    process.exit(1);
  }, 5000).unref();
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

module.exports = { app, server };
