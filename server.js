require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL ? process.env.DISCORD_WEBHOOK_URL.trim() : '';
const DISCORD_LOGS_WEBHOOK_URL = process.env.DISCORD_LOGS_WEBHOOK_URL ? process.env.DISCORD_LOGS_WEBHOOK_URL.trim() : '';

// Lead QA Tester Target Role ID (Defaults to role 1533076808902119495)
const LEAD_ROLE_ID = (process.env.LEAD_ROLE_ID || process.env.LEAD_TESTER_ROLE_ID || '1533076808902119495').trim();

// In-memory cache for Discord member roles to mitigate API rate limits (5-min TTL)
const memberRoleCache = new Map();

// Centralized Casino Wager Limits
const MAX_CASINO_WAGER = parseInt(process.env.MAX_CASINO_WAGER || '100', 10);
const MIN_CASINO_WAGER = 1;

// Trust reverse proxy (Railway, Heroku, etc.)
app.set('trust proxy', 1);

// Middleware configuration
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'qa-portal-secret-salt-2026-auth',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: 'auto',
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
}));

app.use(express.static(path.join(__dirname, 'public')));

/**
 * Authentication Middleware
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in with Discord.'
    });
  }
  next();
}

/**
 * Role-Based Access Control: Lead QA Authorization Middleware
 */
function requireLeadTester(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in with Discord.'
    });
  }
  if (!req.session.user.isLeadTester) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Lead QA authorization required.'
    });
  }
  next();
}

/**
 * Check if a Discord member possesses the Lead QA Tester role (LEAD_ROLE_ID).
 * Returns true if the user holds the role, false otherwise.
 * Automatically synchronizes status to SQLite (db.setUserLeadStatus).
 */
async function checkDiscordMemberHasLeadRole(discordId) {
  if (!discordId) return false;
  const id = String(discordId).trim();
  const now = Date.now();

  const cached = memberRoleCache.get(id);
  if (cached && cached.expiresAt > now) {
    return cached.hasLeadRole;
  }

  const botToken = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID || process.env.GUILD_ID;

  if (botToken && guildId) {
    try {
      const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${id}`, {
        headers: { Authorization: `Bot ${botToken}` }
      });
      if (res.ok) {
        const member = await res.json();
        const memberRoles = Array.isArray(member.roles) ? member.roles : [];
        const hasLeadRole = memberRoles.includes(LEAD_ROLE_ID);
        memberRoleCache.set(id, { hasLeadRole, expiresAt: now + 5 * 60 * 1000 });
        db.setUserLeadStatus(id, hasLeadRole);
        return hasLeadRole;
      } else if (res.status === 404) {
        memberRoleCache.set(id, { hasLeadRole: false, expiresAt: now + 5 * 60 * 1000 });
        db.setUserLeadStatus(id, false);
        return false;
      }
    } catch (err) {
      console.warn(`[Discord Member Check Error for ${id}]:`, err.message);
    }
  }

  // Fallback to SQLite status if Discord API is unreachable / unconfigured
  const existing = db.getUser(id);
  const isLead = Boolean(existing && existing.is_lead_tester);
  return isLead;
}

/**
 * Validate URL string
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
 * Dispatches an embed notification strictly to Discord Webhook for QA tester point requests.
 * Uses DISCORD_WEBHOOK_URL ONLY (never bleeds into DISCORD_LOGS_WEBHOOK_URL).
 */
async function dispatchDiscordWebhook(data, id) {
  const webhookUrl = (process.env.DISCORD_WEBHOOK_URL && process.env.DISCORD_WEBHOOK_URL.trim()) || '';
  if (!webhookUrl || webhookUrl.includes('your_webhook_id')) {
    console.log(`[Discord Webhook] Skipped for request #${id} (DISCORD_WEBHOOK_URL not configured).`);
    return;
  }

  const { username, discord_id, points, description, proof_url } = data;

  const formattedDescription = description.length > 1020 
    ? description.substring(0, 1017) + '...' 
    : description;

  let proofFieldContent = 'None';
  if (proof_url) {
    const urls = String(proof_url)
      .split(/[\r\n,]+/)
      .map(u => u.trim())
      .filter(u => u.length > 0 && isValidHttpUrl(u));

    if (urls.length === 1) {
      proofFieldContent = `[Proof Link](${urls[0]})`;
    } else if (urls.length > 1) {
      proofFieldContent = urls.map((url, idx) => `[Proof ${idx + 1}](${url})`).join(' • ');
    }
  }

  if (proofFieldContent.length > 1020) {
    proofFieldContent = proofFieldContent.substring(0, 1017) + '...';
  }

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
    const response = await fetch(webhookUrl, {
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

/**
 * Dispatches an embed or payload to the dedicated system logs webhook (DISCORD_LOGS_WEBHOOK_URL).
 * Falls back to DISCORD_WEBHOOK_URL if DISCORD_LOGS_WEBHOOK_URL is not configured.
 */
async function sendLogWebhook(payload) {
  const webhookUrl = (process.env.DISCORD_LOGS_WEBHOOK_URL && process.env.DISCORD_LOGS_WEBHOOK_URL.trim())
    || (process.env.DISCORD_WEBHOOK_URL && process.env.DISCORD_WEBHOOK_URL.trim())
    || '';

  if (!webhookUrl || webhookUrl.includes('your_webhook_id')) {
    return;
  }

  const body = (payload && payload.embeds) ? payload : { embeds: [payload] };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.error(`[Logs Webhook Error] Status ${response.status} ${response.statusText}: ${errorBody}`);
    }
  } catch (err) {
    console.error('[Logs Webhook Network Error]:', err.message);
  }
}

/**
 * Logs notable high-multiplier casino wins to avoid spam and rate-limiting.
 * Suppresses all ordinary losses and low-tier payouts.
 * Only fires if the outcome is a high multiplier win (multiplier >= 3 and netChange > 0).
 */
async function logCasinoActivity({ user, game, bet, multiplier, payout, netChange, newBalance, itemWon, isItemDrop }) {
  // Suppress loss spam: strictly multiplier >= 3 and positive net payout, unless it's a rare item drop (Covert / Gold)
  if (!isItemDrop && (!multiplier || multiplier < 3 || (netChange !== undefined && netChange <= 0))) {
    return;
  }

  const isJackpot = (multiplier >= 10 || isItemDrop);
  const title = isJackpot ? '🎰 Casino Jackpot Win!' : '🎰 Casino Big Win!';
  const color = 0xFEE75C; // Gold

  const embed = {
    title,
    color,
    fields: [
      {
        name: 'Player',
        value: `<@${user.discord_id}> (${user.username})`,
        inline: true
      },
      {
        name: 'Game',
        value: game,
        inline: true
      },
      {
        name: 'Wager',
        value: `${bet} PTS`,
        inline: true
      },
      {
        name: 'Outcome',
        value: itemWon && isItemDrop ? `Unboxed [Covert] ${itemWon} (Item Drop)` : `Hit ${multiplier}x | Payout: ${payout} PTS`,
        inline: true
      },
      {
        name: 'Net',
        value: isItemDrop ? `🎁 ${itemWon} (Inventory)` : `+${netChange} PTS`,
        inline: true
      },
      {
        name: 'New Balance',
        value: `${newBalance} PTS`,
        inline: true
      }
    ],
    footer: {
      text: `User ID: ${user.discord_id} • Casino Activity`
    },
    timestamp: new Date().toISOString()
  };

  await sendLogWebhook({ embeds: [embed] });
}

/**
 * Strictly styled 403 Access Denied template for unauthorized testers (no invite links)
 */
function renderAccessDeniedHtml(username) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>403 Access Denied: Unauthorized Tester</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0c0f17;
      --surface: #141824;
      --border: #232a3d;
      --danger: #f85149;
      --danger-glow: rgba(248, 81, 73, 0.25);
      --text: #f0f6fc;
      --text-muted: #8b949e;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      background-color: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
    }
    .card {
      background-color: var(--surface);
      border: 1px solid var(--border);
      border-top: 4px solid var(--danger);
      border-radius: 12px;
      max-width: 480px;
      width: 100%;
      padding: 36px 28px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
      text-align: center;
    }
    .icon-wrap {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: var(--danger-glow);
      border: 1px solid rgba(248, 81, 73, 0.4);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      color: var(--danger);
    }
    h1 {
      font-size: 1.45rem;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 12px;
    }
    .badge {
      display: inline-block;
      background: rgba(248, 81, 73, 0.12);
      border: 1px solid rgba(248, 81, 73, 0.35);
      color: var(--danger);
      font-size: 0.78rem;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 9999px;
      margin-bottom: 16px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    p {
      color: var(--text-muted);
      font-size: 0.92rem;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .btn-return {
      display: inline-block;
      background: #21283b;
      color: #ffffff;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.88rem;
      padding: 10px 20px;
      border-radius: 6px;
      border: 1px solid var(--border);
      transition: background 0.18s ease;
    }
    .btn-return:hover {
      background: #2a344d;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-wrap">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
    </div>
    <br>
    <span class="badge">Gatekeeper Enforcement</span>
    <h1>403 Access Denied</h1>
    <p>
      Tester identity <strong>${username ? String(username).replace(/</g, '&lt;') : 'Authenticated User'}</strong> is not a verified member of the authorized QA testing guild.
      <br><br>
      Access to this portal is strictly restricted to active testing guild members.
    </p>
    <a href="/auth/logout" class="btn-return">Return to Login</a>
  </div>
</body>
</html>`;
}

// ---------------- AUTHENTICATION & OAUTH2 ----------------

/**
 * Initiate Discord OAuth2 login
 */
app.get('/auth/discord', (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID;
  if (!clientId) {
    return res.status(500).send('DISCORD_CLIENT_ID is not configured in server environment.');
  }

  const redirectUri = process.env.DISCORD_REDIRECT_URI || `${req.protocol}://${req.get('host')}/auth/discord/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify guilds'
  });

  res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
});

/**
 * Discord OAuth2 Callback & Gatekeeper Verification
 */
app.get('/auth/discord/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) {
    return res.redirect(`/?auth_error=${encodeURIComponent(error || 'Authorization code missing')}`);
  }

  const clientId = process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET || process.env.CLIENT_SECRET;
  const botToken = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID || process.env.GUILD_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI || `${req.protocol}://${req.get('host')}/auth/discord/callback`;

  try {
    // 1. Exchange code for OAuth2 access token
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code: String(code),
      redirect_uri: redirectUri
    });

    const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString()
    });

    if (!tokenResponse.ok) {
      const tokenErr = await tokenResponse.text();
      console.error('[OAuth2 Token Exchange Failed]:', tokenErr);
      return res.status(400).send('Failed to exchange authorization code with Discord.');
    }

    const tokenData = await tokenResponse.json();

    // 2. Fetch User Identity
    const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    if (!userResponse.ok) {
      return res.status(400).send('Failed to fetch Discord user profile.');
    }

    const userData = await userResponse.json();

    // 3. Strict Gatekeeper: Verify Guild Membership & Lead QA Role via Bot Token
    let isLeadTester = false;
    if (botToken && guildId) {
      const memberResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userData.id}`, {
        headers: { Authorization: `Bot ${botToken}` }
      });

      if (!memberResponse.ok) {
        console.warn(`[Gatekeeper] Access Denied for User ID ${userData.id} (${userData.username}). Not a member of guild ${guildId}.`);
        return res.status(403).send(renderAccessDeniedHtml(userData.global_name || userData.username));
      }

      const memberData = await memberResponse.json();
      const memberRoles = Array.isArray(memberData.roles) ? memberData.roles : [];
      if (memberRoles.includes(LEAD_ROLE_ID)) {
        isLeadTester = true;
      }
      memberRoleCache.set(userData.id, { hasLeadRole: isLeadTester, expiresAt: Date.now() + 5 * 60 * 1000 });
    }

    // 4. Authenticated & Verified: Upsert User & Establish Session
    const avatarUrl = userData.avatar
      ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(userData.discriminator || '0', 10) % 5}.png`;

    const displayName = userData.global_name || userData.username;

    const dbUser = db.upsertUser({
      discord_id: userData.id,
      username: displayName,
      avatar: avatarUrl,
      is_lead_tester: isLeadTester
    });

    db.setUserLeadStatus(userData.id, isLeadTester);

    req.session.user = {
      id: userData.id,
      username: dbUser.username,
      avatar: dbUser.avatar,
      isLeadTester
    };

    res.redirect('/');
  } catch (err) {
    console.error('[OAuth2 Callback Error]:', err);
    res.status(500).send('Internal server error during authentication.');
  }
});

/**
 * Logout
 */
app.get('/auth/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(() => {
      res.redirect('/');
    });
  } else {
    res.redirect('/');
  }
});

// Development/testing login simulation (active if ALLOW_DEV_LOGIN is set or during local test execution)
if (process.env.ALLOW_DEV_LOGIN === 'true' || process.env.NODE_ENV === 'test') {
  app.get('/auth/dev-login', (req, res) => {
    const discord_id = req.query.discord_id || '1546968192264568883';
    const username = req.query.username || 'Test_QA_User';
    const avatar = req.query.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png';
    const rolesParam = req.query.roles ? req.query.roles.split(',') : [];
    const hasLeadRole = req.query.is_lead === 'true' || req.query.lead === 'true' || rolesParam.includes(LEAD_ROLE_ID);

    const dbUser = db.upsertUser({ 
      discord_id, 
      username, 
      avatar,
      is_lead_tester: hasLeadRole
    });
    db.setUserLeadStatus(discord_id, hasLeadRole);
    memberRoleCache.set(discord_id, { hasLeadRole, expiresAt: Date.now() + 5 * 60 * 1000 });

    req.session.user = {
      id: dbUser.discord_id,
      username: dbUser.username,
      avatar: dbUser.avatar,
      isLeadTester: hasLeadRole
    };
    res.redirect('/');
  });
}

// ---------------- USER & ECONOMY APIS ----------------

/**
 * Get current user & balance
 */
app.get('/api/me', async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.json({
      authenticated: false,
      user: null
    });
  }

  const dbUser = db.getUser(req.session.user.id);
  if (!dbUser) {
    req.session.destroy();
    return res.json({
      authenticated: false,
      user: null
    });
  }

  // Refresh role verification with Discord API if available
  const botToken = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID || process.env.GUILD_ID;

  if (botToken && guildId && req.session.user.id) {
    try {
      const memberRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${req.session.user.id}`, {
        headers: { Authorization: `Bot ${botToken}` }
      });
      if (memberRes.ok) {
        const memberData = await memberRes.json();
        const memberRoles = Array.isArray(memberData.roles) ? memberData.roles : [];
        const isLead = memberRoles.includes(LEAD_ROLE_ID);
        req.session.user.isLeadTester = isLead;
        db.setUserLeadStatus(req.session.user.id, isLead);
        memberRoleCache.set(req.session.user.id, { hasLeadRole: isLead, expiresAt: Date.now() + 5 * 60 * 1000 });
      }
    } catch (err) {
      console.warn('[Role Refresh Error]:', err.message);
    }
  }

  const asxKeyCount = db.getUserKeyCount(dbUser.discord_id, 'asx_case_key');

  res.json({
    authenticated: true,
    user: {
      discord_id: dbUser.discord_id,
      username: dbUser.username,
      avatar: dbUser.avatar,
      balance_pts: dbUser.balance_pts,
      asxKeyCount,
      isLeadTester: Boolean(req.session.user.isLeadTester),
      created_at: dbUser.created_at
    }
  });
});

/**
 * Get current user's ASX Case Key balance
 */
app.get('/api/casino/keys', requireAuth, (req, res) => {
  const asxKeyCount = db.getUserKeyCount(req.session.user.id, 'asx_case_key');
  res.json({ success: true, count: asxKeyCount, asxKeyCount });
});

/**
 * Evaluates the outcome of a 3-reel slot spin.
 * - 3 matching symbols award jackpot multipliers (77x, 30x, 15x, 8x, 5x, 3x).
 * - Any pair of 2 matching symbols awards a 1.5x payout.
 * - 3 distinct symbols result in 0x (No match / loss).
 */
function evaluateSlotSpin(reels, betAmount = 0) {
  const counts = {};
  for (const s of reels) counts[s] = (counts[s] || 0) + 1;

  let multiplier = 0;
  let comboName = '';

  if (counts['7️⃣'] === 3) {
    multiplier = 77;
    comboName = '7️⃣7️⃣7️⃣ Jackpot (77x)';
  } else if (counts['💎'] === 3) {
    multiplier = 30;
    comboName = '💎💎💎 3 Diamonds (30x)';
  } else if (counts['🔔'] === 3) {
    multiplier = 15;
    comboName = '🔔🔔🔔 3 Bells (15x)';
  } else if (counts['🍇'] === 3) {
    multiplier = 8;
    comboName = '🍇🍇🍇 3 Grapes (8x)';
  } else if (counts['🍋'] === 3) {
    multiplier = 5;
    comboName = '🍋🍋🍋 3 Lemons (5x)';
  } else if (counts['🍒'] === 3) {
    multiplier = 3;
    comboName = '🍒🍒🍒 3 Cherries (3x)';
  } else {
    // Check if any 2 reels match
    const hasPair = (reels[0] === reels[1]) || (reels[1] === reels[2]) || (reels[0] === reels[2]);
    if (hasPair) {
      let matchedSymbol = null;
      if (reels[0] === reels[1] || reels[0] === reels[2]) {
        matchedSymbol = reels[0];
      } else if (reels[1] === reels[2]) {
        matchedSymbol = reels[1];
      }
      multiplier = 1.5;
      comboName = `Pair of ${matchedSymbol} (1.5x)`;
    }
  }

  const winAmount = Math.round(betAmount * multiplier);
  const netChange = winAmount - betAmount;

  return {
    multiplier,
    comboName,
    winAmount,
    netChange,
    won: multiplier > 0
  };
}

/**
 * 3-Reel Slot Machine Mini-Game
 */
app.post('/api/casino/spin', requireAuth, (req, res) => {
  try {
    const rawWager = req.body.wager !== undefined ? req.body.wager : req.body.bet;
    const wager = parseInt(rawWager, 10);

    if (isNaN(wager) || wager < MIN_CASINO_WAGER || wager > MAX_CASINO_WAGER) {
      return res.status(400).json({ 
        success: false, 
        error: `Wager must be between ${MIN_CASINO_WAGER} and ${MAX_CASINO_WAGER} PTS.` 
      });
    }

    const betAmount = wager;
    const user = db.getUser(req.session.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    if (user.balance_pts < betAmount) {
      return res.status(400).json({ success: false, error: `Insufficient PTS balance (You have ${user.balance_pts} PTS).` });
    }

    // Deduct bet from SQLite immediately
    db.updateBalance(user.discord_id, -betAmount);

    // Reel symbol weights calibrated to ~78.3% RTP:
    // 🍒: 42, 🍋: 24, 🍇: 17, 🔔: 10, 💎: 5, 7️⃣: 4 (Total: 102)
    const symbols = [
      { symbol: '🍒', weight: 42 },
      { symbol: '🍋', weight: 24 },
      { symbol: '🍇', weight: 17 },
      { symbol: '🔔', weight: 10 },
      { symbol: '💎', weight: 5 },
      { symbol: '7️⃣', weight: 4 }
    ];
    const totalWeight = symbols.reduce((acc, s) => acc + s.weight, 0);

    function rollSymbol() {
      let r = Math.random() * totalWeight;
      for (const s of symbols) {
        if (r < s.weight) return s.symbol;
        r -= s.weight;
      }
      return symbols[0].symbol;
    }

    const reels = [rollSymbol(), rollSymbol(), rollSymbol()];
    const spinOutcome = evaluateSlotSpin(reels, betAmount);
    const { multiplier, comboName, winAmount, netChange } = spinOutcome;

    if (winAmount > 0) {
      db.updateBalance(user.discord_id, winAmount);
    }

    const updatedUser = db.getUser(user.discord_id);

    // Asynchronously log notable casino activity to logs webhook
    logCasinoActivity({
      user,
      game: '3-Reel Slots',
      bet: betAmount,
      multiplier,
      payout: winAmount,
      netChange,
      newBalance: updatedUser.balance_pts
    }).catch(err => console.error('[Casino Spin Webhook Error]:', err));

    return res.json({
      success: true,
      reels,
      bet: betAmount,
      multiplier,
      comboName,
      winAmount,
      netChange,
      newBalance: updatedUser.balance_pts,
      message: multiplier > 0
        ? `🎉 Winner! ${comboName} pays +${winAmount} PTS (Net: ${netChange >= 0 ? '+' : ''}${netChange} PTS)!`
        : `No match. You lost ${betAmount} PTS. Spin again!`
    });
  } catch (error) {
    console.error('[Slot Machine Error]:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal slot machine error.' });
  }
});

/**
 * Casino Coinflip (Legacy Fallback)
 */
app.post('/api/casino/coinflip', requireAuth, (req, res) => {
  try {
    const { bet, side } = req.body;
    const chosenSide = String(side || '').toLowerCase().trim();

    if (chosenSide !== 'heads' && chosenSide !== 'tails') {
      return res.status(400).json({ success: false, error: 'Side must be either "heads" or "tails".' });
    }

    const rawWager = req.body.wager !== undefined ? req.body.wager : req.body.bet;
    const wager = parseInt(rawWager, 10);

    if (isNaN(wager) || wager < MIN_CASINO_WAGER || wager > MAX_CASINO_WAGER) {
      return res.status(400).json({ 
        success: false, 
        error: `Wager must be between ${MIN_CASINO_WAGER} and ${MAX_CASINO_WAGER} PTS.` 
      });
    }

    const betAmount = wager;
    const user = db.getUser(req.session.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    if (user.balance_pts < betAmount) {
      return res.status(400).json({ success: false, error: `Insufficient PTS balance (You have ${user.balance_pts} PTS).` });
    }

    const outcome = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = (chosenSide === outcome);
    const delta = won ? betAmount : -betAmount;

    const updatedUser = db.updateBalance(user.discord_id, delta);

    return res.json({
      success: true,
      won,
      outcome,
      chosenSide,
      bet: betAmount,
      delta,
      newBalance: updatedUser.balance_pts,
      message: won ? `🎉 Victory! The coin landed on ${outcome}. You won +${betAmount} PTS!` : `💸 Bummer! The coin landed on ${outcome}. You lost -${betAmount} PTS.`
    });
  } catch (error) {
    console.error('[Casino Coinflip Error]:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal casino error.' });
  }
});

/**
 * Plinko Arcade Mini-Game (11 Rows, 12 Buckets)
 */
app.post('/api/casino/plinko', requireAuth, (req, res) => {
  try {
    const rawWager = req.body.wager !== undefined ? req.body.wager : req.body.bet;
    const wager = parseInt(rawWager, 10);

    if (isNaN(wager) || wager < MIN_CASINO_WAGER || wager > MAX_CASINO_WAGER) {
      return res.status(400).json({ 
        success: false, 
        error: `Wager must be between ${MIN_CASINO_WAGER} and ${MAX_CASINO_WAGER} PTS.` 
      });
    }

    const betAmount = wager;
    const user = db.getUser(req.session.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    if (user.balance_pts < betAmount) {
      return res.status(400).json({
        success: false,
        error: `Insufficient PTS balance (You have ${user.balance_pts} PTS).`
      });
    }

    // Deduct wager atomically from balance
    db.updateBalance(user.discord_id, -betAmount);

    // 11 Rows of pegs -> 11 deflections (0 = left, 1 = right) -> 12 buckets
    const rows = 11;
    const path = [];
    let rightTurns = 0;
    for (let i = 0; i < rows; i++) {
      const step = Math.random() < 0.5 ? 0 : 1;
      path.push(step);
      if (step === 1) rightTurns++;
    }

    const slotIndex = rightTurns; // 0 to 11
    const multipliers = [24, 6, 2.8, 1.2, 0.5, 0.2, 0.2, 0.5, 1.2, 2.8, 6, 24];
    const multiplier = multipliers[slotIndex];
    const payout = Math.floor(betAmount * multiplier);

    if (payout > 0) {
      db.updateBalance(user.discord_id, payout);
    }

    const updatedUser = db.getUser(user.discord_id);
    const netChange = payout - betAmount;

    // Asynchronously log notable casino activity to logs webhook
    logCasinoActivity({
      user,
      game: 'Plinko Arcade',
      bet: betAmount,
      multiplier,
      payout,
      netChange,
      newBalance: updatedUser.balance_pts
    }).catch(err => console.error('[Casino Plinko Webhook Error]:', err));

    return res.json({
      success: true,
      bet: betAmount,
      slotIndex,
      multiplier,
      payout,
      path,
      netChange,
      newBalance: updatedUser.balance_pts,
      message: multiplier >= 1.0
        ? `🟢 Plinko landed in ${multiplier}x bucket! Won +${payout} PTS (Net: ${netChange >= 0 ? '+' : ''}${netChange} PTS)!`
        : `Plinko landed in ${multiplier}x bucket. Returned ${payout} PTS (Net: ${netChange} PTS).`
    });
  } catch (error) {
    console.error('[Plinko Error]:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal Plinko error.' });
  }
});

/**
 * CS:GO / CS2 Style Case Opening Drop Table
 * Rarity Tiers & Weights:
 * - Mil-Spec (Blue): ~70% total
 * - Restricted (Purple): ~18% total
 * - Classified (Pink): ~8% total
 * - Covert (Red): ~3.5% total
 * - Special Rare (Gold ★): ~0.5% total
 */
const CASE_ITEMS = [
  // Mil-Spec (Blue, ~70%) - strictly raw PTS drops
  {
    id: 'milspec_10',
    name: '10 PTS',
    category: 'Mil-Spec',
    rarity: 'mil-spec',
    rarityColor: '#4b69ff',
    reward: 10,
    weight: 28,
    icon: '🪙',
    image: null
  },
  {
    id: 'milspec_15',
    name: '15 PTS',
    category: 'Mil-Spec',
    rarity: 'mil-spec',
    rarityColor: '#4b69ff',
    reward: 15,
    weight: 24,
    icon: '🪙',
    image: null
  },
  {
    id: 'milspec_25',
    name: '25 PTS',
    category: 'Mil-Spec',
    rarity: 'mil-spec',
    rarityColor: '#4b69ff',
    reward: 25,
    weight: 18,
    icon: '🪙',
    image: null
  },

  // Restricted (Purple, ~18%)
  {
    id: 'restricted_leaf',
    name: 'Magical Leaf',
    category: 'Restricted',
    rarity: 'restricted',
    rarityColor: '#8847ff',
    reward: 50,
    weight: 18,
    icon: '🍃',
    image: '/assets/magicleaf.webp'
  },

  // Classified (Pink, ~8%)
  {
    id: 'classified_stat',
    name: 'Stat Crystal',
    category: 'Classified',
    rarity: 'classified',
    rarityColor: '#d32ce6',
    reward: 100,
    weight: 4,
    icon: '💎',
    image: '/assets/stat.webp'
  },
  {
    id: 'classified_prism',
    name: 'Modifier Prism',
    category: 'Classified',
    rarity: 'classified',
    rarityColor: '#d32ce6',
    reward: 120,
    weight: 4,
    icon: '🔮',
    image: '/assets/modifirer.png'
  },

  // Covert (Red, ~3.5%) - Actual Trait Reroll item directly into user inventory (NOT raw PTS!)
  {
    id: 'covert_reroll',
    name: 'Trait Reroll',
    category: 'Covert',
    rarity: 'covert',
    rarityColor: '#eb4b4b',
    reward: 0,
    inventoryItem: {
      id: 'trait-reroll',
      name: 'Trait Reroll',
      category: 'Consumables',
      price: 50
    },
    weight: 3.5,
    icon: '🎲',
    image: '/assets/reroll.webp'
  },

  // Special Rare (Gold ★, ~0.5%) - p-chan drool
  {
    id: 'special_gold_pchan',
    name: 'p-chan drool',
    category: 'Special Rare',
    rarity: 'gold',
    rarityColor: '#ffd700',
    reward: 1000,
    weight: 0.5,
    icon: '🌟',
    image: '/assets/special_gold.webp',
    bundleItem: {
      id: 'bundle_of_choice',
      name: 'bundle of choice',
      category: 'Bundle',
      price: 1000
    }
  }
];

function rollCaseWinner() {
  const totalWeight = CASE_ITEMS.reduce((sum, item) => sum + item.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const item of CASE_ITEMS) {
    if (rand < item.weight) return item;
    rand -= item.weight;
  }
  return CASE_ITEMS[0];
}

function generateCaseTape(winner, winningIndex = 35, count = 50) {
  const tape = [];
  for (let i = 0; i < count; i++) {
    if (i === winningIndex) {
      tape.push(winner);
    } else {
      tape.push(rollCaseWinner());
    }
  }
  return tape;
}

const CASE_OPEN_COST = 0;

/**
 * ASX Case Opener Controller
 */
async function handleCaseOpening(req, res) {
  try {
    const user = db.getUser(req.session.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const keyCount = db.getUserKeyCount(user.discord_id, 'asx_case_key');
    if (keyCount < 1) {
      return res.status(400).json({
        success: false,
        error: 'You need an ASX Case Key to open this case! Buy one in the Shop.'
      });
    }

    // Atomically consume 1 ASX Case Key
    const consumed = db.consumeUserKey(user.discord_id, 'asx_case_key');
    if (!consumed) {
      return res.status(400).json({
        success: false,
        error: 'You need an ASX Case Key to open this case! Buy one in the Shop.'
      });
    }

    const remainingKeys = db.getUserKeyCount(user.discord_id, 'asx_case_key');
    const cost = 0;

    // Roll winner and generate 50-item tape with winner strictly at index 35
    const winner = (typeof module.exports.rollCaseWinner === 'function')
      ? module.exports.rollCaseWinner()
      : rollCaseWinner();
    const winningIndex = 35;
    const tape = (typeof module.exports.generateCaseTape === 'function')
      ? module.exports.generateCaseTape(winner, winningIndex, 50)
      : generateCaseTape(winner, winningIndex, 50);

    // Credit reward PTS only if > 0 (item drops do not credit raw balance)
    if (winner.reward > 0) {
      db.updateBalance(user.discord_id, winner.reward);
    }

    // If winner grants an item directly into user inventory (e.g. Trait Reroll):
    let itemAwarded = null;
    if (winner.inventoryItem) {
      try {
        db.addInventoryItem({
          discord_id: user.discord_id,
          item_id: winner.inventoryItem.id,
          item_name: winner.inventoryItem.name,
          category: winner.inventoryItem.category || 'Consumables',
          price_pts: winner.inventoryItem.price || 0
        });
        itemAwarded = winner.inventoryItem.name;

        db.createAuditLog({
          action_type: 'CASE_ITEM_DROP',
          actor_id: user.discord_id,
          actor_name: user.username,
          target_id: user.discord_id,
          target_name: user.username,
          details: `Unboxed [${winner.category}] ${winner.name}! Queued to inventory.`,
          delta_pts: winner.reward || 0
        });
      } catch (itemErr) {
        console.error('[Case Opening Item Error]:', itemErr);
      }
    }

    // If Gold ★ Special Rare: award exclusive bundle directly to user inventory/fulfillment queue
    let bundleAwarded = null;
    if (winner.rarity === 'gold') {
      const bundle = winner.bundleItem || {
        id: 'bundle_of_choice',
        name: 'bundle of choice',
        category: 'Bundle',
        price: 1000
      };
      try {
        db.addInventoryItem({
          discord_id: user.discord_id,
          item_id: bundle.id,
          item_name: bundle.name,
          category: bundle.category,
          price_pts: bundle.price || 1000
        });
        bundleAwarded = bundle.name;

        db.createAuditLog({
          action_type: 'CASE_JACKPOT',
          actor_id: user.discord_id,
          actor_name: user.username,
          target_id: user.discord_id,
          target_name: user.username,
          details: `Unboxed p-chan drool! Awarded 1,000 PTS + ${bundle.name} to inventory queue.`,
          delta_pts: winner.reward
        });
      } catch (invErr) {
        console.error('[Case Opening Bundle Error]:', invErr);
      }
    }

    const updatedUser = db.getUser(user.discord_id);
    const netChange = winner.reward;

    // Discord Webhook Logging: Fire embed to #economy-logs ONLY for Covert (Red) and Special Rare (Gold ★) drops.
    // Blue, Purple, and Pink drops must be silent and NOT send any webhook messages.
    if (winner.rarity === 'gold' || winner.rarity === 'covert') {
      const logger = (typeof module.exports.logCasinoActivity === 'function')
        ? module.exports.logCasinoActivity
        : logCasinoActivity;
      logger({
        user,
        game: 'ASX Case Opener',
        bet: 50,
        multiplier: winner.reward > 0 ? Number((winner.reward / 50).toFixed(2)) : 0,
        payout: winner.reward,
        netChange,
        newBalance: updatedUser.balance_pts,
        itemWon: winner.name,
        isItemDrop: !!winner.inventoryItem
      }).catch(err => console.error('[Case Webhook Error]:', err));
    }

    let messageText = '';
    if (winner.rarity === 'gold') {
      messageText = `🌟 JACKPOT! You unboxed ${winner.name}! (+${winner.reward} PTS & ${bundleAwarded || 'bundle of choice'} queued to Inventory)`;
    } else if (itemAwarded) {
      messageText = `Unboxed [${winner.category}] ${winner.name}! Added directly to your Inventory queue.`;
    } else {
      messageText = `Unboxed [${winner.category}] ${winner.name}! (+${winner.reward} PTS)`;
    }

    return res.json({
      success: true,
      cost,
      remainingKeys,
      winner,
      tape,
      winningIndex,
      rewardPts: winner.reward,
      netChange,
      newBalance: updatedUser.balance_pts,
      itemAwarded,
      bundleAwarded,
      message: messageText
    });
  } catch (error) {
    console.error('[Case Opening Error]:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal case opening error.' });
  }
}

app.post('/api/casino/open-case', requireAuth, handleCaseOpening);
app.post('/api/lootbox/open', requireAuth, handleCaseOpening);

// Full in-game shop catalog
const SHOP_CATALOG = {
  // Case Keys
  'asx_case_key': {
    id: 'asx_case_key',
    name: 'ASX Case Key',
    price: 50,
    category: 'Keys',
    badge: 'Consumable Key',
    desc: 'Used to unlock the ASX Case Opener. Consumable key.',
    description: 'Used to unlock the ASX Case Opener. Consumable key.',
    icon: '🔑',
    image: '/assets/key.webp',
    stackable: true
  },

  // In-Game Consumables & Upgrades
  'trait-reroll': {
    id: 'trait-reroll',
    name: 'Trait Reroll',
    price: 75,
    category: 'Consumables',
    badge: 'Consumable',
    desc: 'Reroll unit traits in-game to optimize combat synergies.',
    icon: '🎲',
    image: '/assets/reroll.webp',
    stackable: true
  },
  'modifier-prism': {
    id: 'modifier-prism',
    name: 'Modifier Prism',
    price: 120,
    category: 'Consumables',
    badge: 'Enhancement',
    desc: 'Alter special unit modifiers and awaken hidden abilities.',
    icon: '🔮',
    image: '/assets/modifirer.png',
    stackable: true
  },
  'stat-crystal': {
    id: 'stat-crystal',
    name: 'Stat Crystal',
    price: 150,
    category: 'Consumables',
    badge: 'Upgrade',
    desc: 'Permanently boost base unit attack and defense stats.',
    icon: '💎',
    image: '/assets/stat.webp',
    stackable: true
  },
  'magical-leaf': {
    id: 'magical-leaf',
    name: 'Magical Leaf',
    price: 250,
    category: 'Consumables',
    badge: 'Material',
    desc: 'Rare evolution catalyst required for high-tier unit ascensions.',
    icon: '🍃',
    image: '/assets/magicleaf.webp',
    stackable: true
  },

  // Units & Rarities
  'unit-rare': {
    id: 'unit-rare',
    name: 'Rare Unit',
    price: 150,
    category: 'Units',
    badge: 'Rare Tier',
    desc: 'Guaranteed Rare tier unit delivered directly to your roster.',
    icon: '⚔️',
    image: '/assets/rarebgg.png'
  },
  'unit-epic': {
    id: 'unit-epic',
    name: 'Epic Unit',
    price: 400,
    category: 'Units',
    badge: 'Epic Tier',
    desc: 'High-impact Epic tier unit featuring advanced skill sets.',
    icon: '🛡️',
    image: '/assets/epicbgg.png'
  },
  'unit-legendary': {
    id: 'unit-legendary',
    name: 'Legendary Unit',
    price: 900,
    category: 'Units',
    badge: 'Legendary Tier',
    desc: 'Premier Legendary champion with battlefield-altering power.',
    icon: '👑',
    image: '/assets/legbgg.png'
  },
  'unit-mythic': {
    id: 'unit-mythic',
    name: 'Mythic Unit',
    price: 2000,
    category: 'Units',
    badge: 'Mythic Tier',
    desc: 'Extremely rare Mythic powerhouse with supreme combat scaling.',
    icon: '⚡',
    image: '/assets/mythicbgg.png'
  },
  'unit-secret': {
    id: 'unit-secret',
    name: 'Secret Unit',
    price: 5000,
    category: 'Units',
    badge: 'Secret Tier',
    desc: 'The ultimate hidden exclusive unit reserved for elite testers.',
    icon: '🌟',
    image: '/assets/secretbgg.png'
  },

  // Robux & Bundles Conversion
  'skin-bundle': {
    id: 'skin-bundle',
    name: 'Skin & Item Bundles',
    price: 500,
    category: 'Robux & Bundles',
    badge: '1:1 Parity',
    desc: 'Custom in-game bundle parity value (1 PTS = 1 R$ value, 500 R$ package).',
    icon: '🎁'
  },
  'robux-payout': {
    id: 'robux-payout',
    name: 'Robux Payout',
    price: 200,
    category: 'Robux & Bundles',
    badge: 'Direct Payout',
    desc: 'Real Robux transfer (2 PTS = 1 R$, minimum package: 100 R$ for 200 PTS).',
    icon: '💰'
  }
};

/**
 * Dispatches a Discord Webhook notification upon shop purchase
 */
async function dispatchShopWebhook(data) {
  const { discord_id, username, item, newBalance } = data;
  const embed = {
    title: '🛍️ New Shop Purchase',
    color: 0xf59e0b, // Gold
    fields: [
      {
        name: 'Tester',
        value: `${username} (<@${discord_id}>)`,
        inline: true
      },
      {
        name: 'Item Purchased',
        value: item.name,
        inline: true
      },
      {
        name: 'Cost',
        value: `-${item.price} PTS`,
        inline: true
      },
      {
        name: 'Remaining Balance',
        value: `${newBalance} PTS`,
        inline: true
      }
    ],
    footer: {
      text: `User ID: ${discord_id} • Status: COMPLETED`
    },
    timestamp: new Date().toISOString()
  };

  await sendLogWebhook({ embeds: [embed] });
}

/**
 * Get Shop Catalog
 */
app.get('/api/shop/catalog', (req, res) => {
  res.json({
    success: true,
    catalog: Object.values(SHOP_CATALOG)
  });
});

/**
 * Shop Item Purchase
 */
app.post('/api/shop/buy', requireAuth, async (req, res) => {
  try {
    const { itemId } = req.body;
    const user = db.getUser(req.session.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const item = SHOP_CATALOG[itemId] || (itemId === 'asx-case-key' ? SHOP_CATALOG['asx_case_key'] : null);
    if (!item) {
      return res.status(400).json({ success: false, error: 'Unknown shop item.' });
    }

    const isStackable = Boolean(item.stackable || item.category === 'Consumables' || item.category === 'Keys');
    let quantity = Math.max(1, parseInt(req.body.quantity, 10) || 1);

    if (isStackable) {
      // Cap max batch purchase between 1 and 50 per transaction
      quantity = Math.min(50, quantity);
    } else {
      // For unique non-stackable items (like Units/Roles), enforce quantity = 1
      quantity = 1;
    }

    const totalCost = item.price * quantity;

    if (user.balance_pts < totalCost) {
      return res.status(400).json({
        success: false,
        error: `Insufficient PTS balance (Total Cost: ${totalCost} PTS for ${quantity > 1 ? `${quantity}x ` : ''}${item.name}, you have ${user.balance_pts} PTS).`
      });
    }

    // Atomically deduct total cost from balance
    const updatedUser = db.updateBalance(user.discord_id, -totalCost);

    const displayName = quantity > 1 ? `${item.name} (x${quantity})` : item.name;

    // Record purchase in database & insert into player inventory
    db.recordPurchase({
      discord_id: user.discord_id,
      item_id: item.id,
      item_name: displayName,
      cost: totalCost
    });

    if (item.id === 'asx_case_key') {
      for (let i = 0; i < quantity; i++) {
        db.addInventoryItem({
          discord_id: user.discord_id,
          item_id: item.id,
          item_name: item.name,
          category: item.category || 'Keys',
          price_pts: item.price,
          status: 'USABLE'
        });
      }
    } else {
      db.addInventoryItem({
        discord_id: user.discord_id,
        item_id: item.id,
        item_name: displayName,
        category: item.category,
        price_pts: totalCost
      });
    }

    const asxKeyCount = db.getUserKeyCount(user.discord_id, 'asx_case_key');

    // Fire Discord notification
    dispatchShopWebhook({
      discord_id: user.discord_id,
      username: user.username,
      item: { ...item, name: displayName, price: totalCost },
      quantity,
      newBalance: updatedUser.balance_pts
    }).catch(err => console.error('[Shop Webhook Dispatch Error]:', err));

    return res.json({
      success: true,
      item,
      quantity,
      totalCost,
      newBalance: updatedUser.balance_pts,
      asxKeyCount,
      message: `Purchased ${quantity > 1 ? `${quantity}x ` : ''}"${item.name}" for ${totalCost} PTS! ${item.id === 'asx_case_key' ? 'Key is ready to use in the ASX Case Opener.' : 'Your reward has been logged for delivery.'}`
    });
  } catch (error) {
    console.error('[Shop Buy Error]:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal shop error.' });
  }
});

/**
 * Leaderboard Ranking Endpoint
 * Dynamically ranks regular testers and displays Lead QA Testers (role ID 1533076808902119495)
 * at the bottom as disqualified (DSQ) while preserving their actual PTS balance.
 */
app.get('/api/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;

    const excludedIds = new Set();

    // 1. Configured Lead IDs from environment (LEAD_USER_IDS or LEAD_IDS)
    const envLeadIds = process.env.LEAD_USER_IDS || process.env.LEAD_IDS || '';
    if (envLeadIds) {
      envLeadIds.split(/[,\s]+/).forEach(id => {
        const trimmed = id.trim();
        if (trimmed) {
          excludedIds.add(trimmed);
          try {
            const matchedUser = db.db.prepare(`SELECT discord_id FROM users WHERE username = ? COLLATE NOCASE`).get(trimmed);
            if (matchedUser) {
              excludedIds.add(matchedUser.discord_id);
            }
          } catch (e) {}
        }
      });
    }

    // 2. If authenticated caller is a lead tester, mark as lead and persist in DB
    if (req.session && req.session.user && req.session.user.isLeadTester) {
      excludedIds.add(req.session.user.id);
      db.setUserLeadStatus(req.session.user.id, true);
    }

    // 3. Mark existing DB leads in excluded set
    try {
      const dbLeadUsers = db.db.prepare(`SELECT discord_id FROM users WHERE is_lead_tester = 1`).all();
      for (const u of dbLeadUsers) {
        excludedIds.add(u.discord_id);
      }
    } catch (e) {}

    // 4. Inspect users to dynamically verify any lead roles via Discord API
    const botToken = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID || process.env.GUILD_ID;
    if (botToken && guildId) {
      const allUsers = db.getAllUsers();
      for (const candidate of allUsers) {
        if (candidate.is_lead_tester === 1 || excludedIds.has(candidate.discord_id)) {
          excludedIds.add(candidate.discord_id);
          continue;
        }
        const isLead = await checkDiscordMemberHasLeadRole(candidate.discord_id);
        if (isLead) {
          excludedIds.add(candidate.discord_id);
        }
      }
    }

    const leadIdsArray = Array.from(excludedIds);
    const testers = db.getLeaderboard(limit, leadIdsArray);
    const disqualified = db.getLeadTesters(leadIdsArray);

    const unifiedLeaderboard = [
      ...testers.map(t => ({ ...t, isDsq: false })),
      ...disqualified.map(t => ({ ...t, rank: null, isDsq: true }))
    ];

    res.json({
      success: true,
      testers,
      disqualified,
      leaderboard: unifiedLeaderboard
    });
  } catch (error) {
    console.error('[Leaderboard API Error]:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve leaderboard.' });
  }
});

// ---------------- QA SUBMISSION APIS ----------------

/**
 * Submit point request (Protected via OAuth2 session)
 */
app.post('/api/request-points', requireAuth, async (req, res) => {
  try {
    const { points, description, proof_url, proofLink, proof_links } = req.body;
    const sessionUser = req.session.user;

    const errors = [];

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

    // Multiple Proof URLs parsing (optional)
    const rawProof = proof_url !== undefined ? proof_url : (proofLink !== undefined ? proofLink : proof_links);
    let sanitizedProofUrl = null;

    if (rawProof) {
      const items = Array.isArray(rawProof) ? rawProof : String(rawProof).split(/[\r\n,]+/);
      const validUrls = [];
      for (const item of items) {
        const trimmed = String(item || '').trim();
        if (!trimmed) continue;
        if (isValidHttpUrl(trimmed)) {
          validUrls.push(trimmed);
        }
      }
      if (validUrls.length > 0) {
        sanitizedProofUrl = validUrls.join('\n');
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        errors,
        message: errors.join(' ')
      });
    }

    // Always use session user identity to prevent spoofing
    const payload = {
      username: sessionUser.username,
      discord_id: sessionUser.id,
      points: parsedPoints,
      work_type: 'General Testing',
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

// ---------------- LEAD QA PANEL APIS & WEBHOOKS ----------------

/**
 * Dispatches Discord Webhook for QA report review verdicts (Approve / Decline)
 */
async function dispatchReviewWebhook(action, submission, leadUser) {
  const isApprove = (action === 'approve');
  const title = isApprove ? '✅ QA Request Approved' : '❌ QA Request Declined';
  const color = isApprove ? 0x57F287 : 0xED4245;

  const fields = isApprove
    ? [
        { name: 'Tester', value: `${submission.username} (<@${submission.discord_id}>)`, inline: true },
        { name: 'Points Awarded', value: `+${submission.points} PTS`, inline: true },
        { name: 'Approved By', value: `${leadUser.username} (<@${leadUser.id}>)`, inline: true },
        { name: 'Request ID', value: `#${submission.id}`, inline: true }
      ]
    : [
        { name: 'Tester', value: `${submission.username} (<@${submission.discord_id}>)`, inline: true },
        { name: 'Declined By', value: `${leadUser.username} (<@${leadUser.id}>)`, inline: true },
        { name: 'Request ID', value: `#${submission.id}`, inline: true }
      ];

  const embed = {
    title,
    color,
    fields,
    footer: {
      text: `Lead ID: ${leadUser.id} • Status: ${isApprove ? 'APPROVED' : 'DECLINED'}`
    },
    timestamp: new Date().toISOString()
  };

  await sendLogWebhook({ embeds: [embed] });
}

/**
 * Dispatches Discord Webhook for manual balance adjustments
 */
async function dispatchGrantWebhook({ targetUser, amount, newBalance, reason, leadUser }) {
  const sign = amount >= 0 ? '+' : '';
  const embed = {
    title: '⚖️ Manual Balance Adjustment',
    color: 0xFEE75C, // Gold
    fields: [
      { name: 'Tester', value: `${targetUser.username} (<@${targetUser.discord_id}>)`, inline: true },
      { name: 'Adjustment', value: `${sign}${amount} PTS`, inline: true },
      { name: 'New Balance', value: `${newBalance} PTS`, inline: true },
      { name: 'Reason', value: reason || 'No reason provided', inline: false },
      { name: 'Lead', value: `${leadUser.username} (<@${leadUser.id}>)`, inline: true }
    ],
    footer: {
      text: `Lead ID: ${leadUser.id} • User ID: ${targetUser.discord_id}`
    },
    timestamp: new Date().toISOString()
  };

  await sendLogWebhook({ embeds: [embed] });
}

/**
 * Lead QA: Fetch all QA submissions
 */
app.get('/api/admin/submissions', requireLeadTester, (req, res) => {
  try {
    const submissions = db.getAllRequests(200);
    res.json({
      success: true,
      submissions
    });
  } catch (error) {
    console.error('[Admin Submissions Error]:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve submissions.' });
  }
});

/**
 * Lead QA: Review QA submission (Approve / Decline)
 */
app.post('/api/admin/submissions/:id/review', requireLeadTester, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { action } = req.body;
    const act = String(action || '').toLowerCase().trim();

    if (act !== 'approve' && act !== 'decline') {
      return res.status(400).json({ success: false, error: 'Action must be "approve" or "decline".' });
    }

    const submission = db.getRequestById(id);
    if (!submission) {
      return res.status(404).json({ success: false, error: 'Submission not found.' });
    }

    if (submission.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: `Submission has already been reviewed (${submission.status}).`
      });
    }

    const leadUser = req.session.user;

    if (act === 'approve') {
      // Atomically credit points to submitter's balance
      const updatedTarget = db.updateBalance(submission.discord_id, submission.points);
      db.updateRequestStatus(id, 'APPROVED');

      db.createAuditLog({
        action_type: 'REPORT_APPROVE',
        actor_id: leadUser.id,
        actor_name: leadUser.username,
        target_id: submission.discord_id,
        target_name: submission.username,
        details: `Approved QA report #${id} (+${submission.points} PTS)`,
        delta_pts: submission.points
      });

      dispatchReviewWebhook('approve', submission, leadUser).catch(err => {
        console.error('[Async Review Webhook Error]:', err);
      });

      return res.json({
        success: true,
        status: 'APPROVED',
        newBalance: updatedTarget.balance_pts,
        message: `Submission #${id} approved! Credited ${submission.points} PTS to ${submission.username}.`
      });
    } else {
      // Decline
      db.updateRequestStatus(id, 'DECLINED');

      db.createAuditLog({
        action_type: 'REPORT_DECLINE',
        actor_id: leadUser.id,
        actor_name: leadUser.username,
        target_id: submission.discord_id,
        target_name: submission.username,
        details: `Declined QA report #${id}`,
        delta_pts: 0
      });

      dispatchReviewWebhook('decline', submission, leadUser).catch(err => {
        console.error('[Async Review Webhook Error]:', err);
      });

      return res.json({
        success: true,
        status: 'DECLINED',
        message: `Submission #${id} declined.`
      });
    }
  } catch (error) {
    console.error('[Review Submission Error]:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to review submission.' });
  }
});

/**
 * Lead QA: Get all registered testers
 */
app.get('/api/admin/users', requireLeadTester, (req, res) => {
  try {
    const users = db.getAllUsers();
    res.json({
      success: true,
      users: users.map(u => ({
        discord_id: u.discord_id,
        username: u.username,
        avatar: u.avatar,
        balance_pts: u.balance_pts
      }))
    });
  } catch (error) {
    console.error('[Admin Users Error]:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve registered testers.' });
  }
});

/**
 * Lead QA: Direct Token Grant / Revoke
 */
app.post('/api/admin/grant-pts', requireLeadTester, async (req, res) => {
  try {
    const { targetDiscordId, amount, reason } = req.body;
    const pts = parseInt(amount, 10);
    const sanitizedReason = String(reason || '').trim();

    if (!targetDiscordId || typeof targetDiscordId !== 'string') {
      return res.status(400).json({ success: false, error: 'Target tester Discord ID is required.' });
    }

    if (isNaN(pts) || pts === 0) {
      return res.status(400).json({ success: false, error: 'PTS adjustment amount must be a non-zero integer.' });
    }

    if (!sanitizedReason) {
      return res.status(400).json({ success: false, error: 'Reason for balance adjustment is required.' });
    }

    const targetUser = db.getUser(targetDiscordId);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'Target tester not found.' });
    }

    if (targetUser.balance_pts + pts < 0) {
      return res.status(400).json({
        success: false,
        error: `Adjustment would cause balance to drop below 0 (Current: ${targetUser.balance_pts} PTS, adjustment: ${pts} PTS).`
      });
    }

    const updatedUser = db.updateBalance(targetDiscordId, pts);
    const leadUser = req.session.user;

    db.createAuditLog({
      action_type: 'MANUAL_GRANT',
      actor_id: leadUser.id,
      actor_name: leadUser.username,
      target_id: targetUser.discord_id,
      target_name: targetUser.username,
      details: sanitizedReason,
      delta_pts: pts
    });

    dispatchGrantWebhook({
      targetUser,
      amount: pts,
      newBalance: updatedUser.balance_pts,
      reason: sanitizedReason,
      leadUser
    }).catch(err => {
      console.error('[Async Grant Webhook Error]:', err);
    });

    return res.json({
      success: true,
      targetUser: {
        discord_id: updatedUser.discord_id,
        username: updatedUser.username,
        balance_pts: updatedUser.balance_pts
      },
      delta: pts,
      newBalance: updatedUser.balance_pts,
      message: `Successfully adjusted balance for ${targetUser.username} by ${pts >= 0 ? '+' : ''}${pts} PTS (New balance: ${updatedUser.balance_pts} PTS).`
    });
  } catch (error) {
    console.error('[Grant PTS Error]:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to adjust balance.' });
  }
});

/**
 * Lead QA: Unified live audit logs feed
 */
app.get('/api/admin/logs', requireLeadTester, (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const logs = db.getAuditLogs(limit);
    res.json({
      success: true,
      logs
    });
  } catch (error) {
    console.error('[Admin Logs Error]:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve audit logs.' });
  }
});

// ---------------- PLAYER INVENTORY & FULFILLMENT APIS ----------------

/**
 * Get current user's inventory
 */
app.get('/api/inventory/me', requireAuth, (req, res) => {
  try {
    const items = db.getUserInventory(req.session.user.id);
    res.json({
      success: true,
      inventory: items
    });
  } catch (error) {
    console.error('[Get Inventory Error]:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve inventory.' });
  }
});

/**
 * Lead QA: Fetch all tester purchases for fulfillment queue
 */
app.get('/api/admin/inventory', requireLeadTester, (req, res) => {
  try {
    const status = req.query.status || 'ALL';
    const items = db.getAllInventory(status);
    res.json({
      success: true,
      inventory: items
    });
  } catch (error) {
    console.error('[Admin Inventory Error]:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve fulfillment queue.' });
  }
});

/**
 * Lead QA: Fulfill an inventory item (delivered in-game)
 */
app.post('/api/admin/inventory/:id/fulfill', requireLeadTester, async (req, res) => {
  try {
    const { id } = req.params;
    const leadUser = req.session.user;
    const item = db.getInventoryById(id);

    if (!item) {
      return res.status(404).json({ success: false, error: 'Inventory item not found.' });
    }

    if (item.status === 'FULFILLED') {
      return res.status(400).json({ success: false, error: 'Item has already been marked as fulfilled.' });
    }

    db.fulfillInventoryItem(id, leadUser.id);

    // Create audit log
    db.createAuditLog({
      action_type: 'ITEM_FULFILL',
      actor_id: leadUser.id,
      actor_name: leadUser.username,
      target_id: item.discord_id,
      target_name: item.username || item.discord_id,
      details: `Delivered ${item.item_name} (ID #${id}) in-game`,
      delta_pts: 0
    });

    // Dispatch Discord Webhook embed to DISCORD_LOGS_WEBHOOK_URL
    const embed = {
      title: '📦 Item Delivered In-Game',
      color: 0x2ECC71, // Emerald
      fields: [
        { name: 'Item', value: `${item.item_name} (${item.category})`, inline: true },
        { name: 'Recipient', value: `<@${item.discord_id}>`, inline: true },
        { name: 'Fulfilled By', value: `${leadUser.username} (<@${leadUser.id}>)`, inline: true },
        { name: 'Purchase ID', value: `#${item.id}`, inline: true },
        { name: 'Cost', value: `${item.price_pts} PTS`, inline: true }
      ],
      footer: {
        text: `Lead ID: ${leadUser.id} • User ID: ${item.discord_id}`
      },
      timestamp: new Date().toISOString()
    };

    sendLogWebhook({ embeds: [embed] }).catch(err => {
      console.error('[Async Fulfill Webhook Error]:', err);
    });

    return res.json({
      success: true,
      message: `Item #${id} (${item.item_name}) marked as delivered in-game!`
    });
  } catch (error) {
    console.error('[Fulfill Inventory Error]:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fulfill item.' });
  }
});

/**
 * Lead QA: Delete / revoke an inventory item
 */
app.post('/api/admin/inventory/:id/delete', requireLeadTester, (req, res) => {
  try {
    const { id } = req.params;
    const leadUser = req.session.user;
    const item = db.getInventoryById(id);

    if (!item) {
      return res.status(404).json({ success: false, error: 'Inventory item not found.' });
    }

    db.deleteInventoryItem(id);

    db.createAuditLog({
      action_type: 'ITEM_REVOKE',
      actor_id: leadUser.id,
      actor_name: leadUser.username,
      target_id: item.discord_id,
      target_name: item.username || item.discord_id,
      details: `Revoked/deleted ${item.item_name} (ID #${id}) from inventory`,
      delta_pts: 0
    });

    return res.json({
      success: true,
      message: `Item #${id} (${item.item_name}) removed from inventory.`
    });
  } catch (error) {
    console.error('[Delete Inventory Error]:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to delete item.' });
  }
});

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

// Start listening
const server = app.listen(PORT, () => {
  console.log(`[QA Portal] Server running on port ${PORT}`);
  console.log(`[QA Portal] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[QA Portal] Database Path: ${db.dbPath}`);
  console.log(`[QA Portal] QA Reports Webhook: ${Boolean(process.env.DISCORD_WEBHOOK_URL && !process.env.DISCORD_WEBHOOK_URL.includes('your_webhook_id'))}`);
  console.log(`[QA Portal] System Logs Webhook: ${Boolean(process.env.DISCORD_LOGS_WEBHOOK_URL && !process.env.DISCORD_LOGS_WEBHOOK_URL.includes('your_webhook_id'))}`);
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

module.exports = { 
  app, 
  server, 
  sendLogWebhook, 
  logCasinoActivity, 
  dispatchDiscordWebhook,
  checkDiscordMemberHasLeadRole,
  LEAD_ROLE_ID,
  memberRoleCache,
  MAX_CASINO_WAGER,
  MIN_CASINO_WAGER,
  evaluateSlotSpin,
  CASE_ITEMS,
  rollCaseWinner,
  generateCaseTape,
  CASE_OPEN_COST,
  handleCaseOpening,
  SHOP_CATALOG
};
