require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL ? process.env.DISCORD_WEBHOOK_URL.trim() : '';

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
 * Dispatches an embed notification to Discord Webhook asynchronously
 */
async function dispatchDiscordWebhook(data, id) {
  if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.includes('your_webhook_id')) {
    console.log(`[Discord Webhook] Skipped for request #${id} (DISCORD_WEBHOOK_URL not configured).`);
    return;
  }

  const { username, discord_id, points, description, proof_url } = data;

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
      const memberRoles = memberData.roles || [];
      const leadRoleId = process.env.LEAD_TESTER_ROLE_ID;
      if (leadRoleId && memberRoles.includes(leadRoleId)) {
        isLeadTester = true;
      }
    }

    // 4. Authenticated & Verified: Upsert User & Establish Session
    const avatarUrl = userData.avatar
      ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(userData.discriminator || '0', 10) % 5}.png`;

    const displayName = userData.global_name || userData.username;

    const dbUser = db.upsertUser({
      discord_id: userData.id,
      username: displayName,
      avatar: avatarUrl
    });

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
    const isLeadTester = req.query.is_lead === 'true' || req.query.lead === 'true';

    const dbUser = db.upsertUser({ discord_id, username, avatar });
    req.session.user = {
      id: dbUser.discord_id,
      username: dbUser.username,
      avatar: dbUser.avatar,
      isLeadTester
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
  const leadRoleId = process.env.LEAD_TESTER_ROLE_ID;

  if (botToken && guildId && leadRoleId && req.session.user.id) {
    try {
      const memberRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${req.session.user.id}`, {
        headers: { Authorization: `Bot ${botToken}` }
      });
      if (memberRes.ok) {
        const memberData = await memberRes.json();
        const memberRoles = memberData.roles || [];
        req.session.user.isLeadTester = memberRoles.includes(leadRoleId);
      }
    } catch (err) {
      console.warn('[Role Refresh Error]:', err.message);
    }
  }

  res.json({
    authenticated: true,
    user: {
      discord_id: dbUser.discord_id,
      username: dbUser.username,
      avatar: dbUser.avatar,
      balance_pts: dbUser.balance_pts,
      isLeadTester: Boolean(req.session.user.isLeadTester),
      created_at: dbUser.created_at
    }
  });
});

/**
 * 3-Reel Slot Machine Mini-Game
 */
app.post('/api/casino/spin', requireAuth, (req, res) => {
  try {
    const { bet } = req.body;
    const betAmount = parseInt(bet, 10);

    if (isNaN(betAmount) || betAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Bet must be a positive integer.' });
    }

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

    // Count occurrences
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
    } else if (counts['🍒'] === 2) {
      multiplier = 1.5;
      comboName = '🍒🍒 Any Two Cherries (1.5x)';
    }

    const winAmount = Math.round(betAmount * multiplier);
    if (winAmount > 0) {
      db.updateBalance(user.discord_id, winAmount);
    }

    const netChange = winAmount - betAmount;
    const updatedUser = db.getUser(user.discord_id);

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

    const betAmount = parseInt(bet, 10);
    if (isNaN(betAmount) || betAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Bet must be a positive integer.' });
    }

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
    const { bet } = req.body;
    const betAmount = parseInt(bet, 10);

    if (isNaN(betAmount) || betAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Bet must be a positive integer.' });
    }

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
 * Loot Box Opening Simulation (Nerfed RTP ~76% PTS Sink)
 */
app.post('/api/lootbox/open', requireAuth, (req, res) => {
  try {
    const { crateType } = req.body;
    const type = String(crateType || '').toLowerCase().trim();

    const user = db.getUser(req.session.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    let cost = 0;
    let pool = [];

    if (type === 'standard') {
      cost = 25;
      pool = [
        { weight: 60, name: 'Basic Testing Log', minPts: 5, maxPts: 12, rarity: 'Common' },
        { weight: 25, name: 'QA Defect Cache', minPts: 15, maxPts: 22, rarity: 'Uncommon' },
        { weight: 12, name: 'Bug Hunter Badge', minPts: 30, maxPts: 45, rarity: 'Rare' },
        { weight: 3,  name: 'Lead Reviewer Commendation', minPts: 75, maxPts: 100, rarity: 'Jackpot' }
      ];
    } else if (type === 'rare') {
      cost = 75;
      pool = [
        { weight: 55, name: 'Standard Component Cache', minPts: 15, maxPts: 35, rarity: 'Common' },
        { weight: 28, name: 'Diagnostic Toolkit', minPts: 45, maxPts: 65, rarity: 'Uncommon' },
        { weight: 13, name: 'Cybernetic Scanner', minPts: 90, maxPts: 130, rarity: 'Rare' },
        { weight: 4,  name: 'Apex QA Trophy', minPts: 200, maxPts: 300, rarity: 'Legendary' }
      ];
    } else {
      return res.status(400).json({ success: false, error: 'Invalid crate type. Must be "standard" or "rare".' });
    }

    if (user.balance_pts < cost) {
      return res.status(400).json({ success: false, error: `Insufficient PTS balance for this crate (Cost: ${cost} PTS, you have ${user.balance_pts} PTS).` });
    }

    // Roll reward item by weight
    const totalWeight = pool.reduce((acc, i) => acc + i.weight, 0);
    let rand = Math.random() * totalWeight;
    let selectedItem = pool[0];

    for (const item of pool) {
      if (rand < item.weight) {
        selectedItem = item;
        break;
      }
      rand -= item.weight;
    }

    // Calculate random points won
    const rewardPts = Math.floor(Math.random() * (selectedItem.maxPts - selectedItem.minPts + 1)) + selectedItem.minPts;
    const netDelta = rewardPts - cost;

    const updatedUser = db.updateBalance(user.discord_id, netDelta);

    return res.json({
      success: true,
      crateType: type,
      cost,
      rewardPts,
      netDelta,
      itemWon: selectedItem.name,
      rarity: selectedItem.rarity,
      newBalance: updatedUser.balance_pts,
      message: `Opened ${type.toUpperCase()} crate! Received [${selectedItem.rarity}] ${selectedItem.name} with ${rewardPts} PTS (Net: ${netDelta >= 0 ? '+' : ''}${netDelta} PTS).`
    });
  } catch (error) {
    console.error('[Lootbox Error]:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal lootbox error.' });
  }
});

// Full in-game shop catalog
const SHOP_CATALOG = {
  // In-Game Consumables & Upgrades
  'trait-reroll': {
    id: 'trait-reroll',
    name: 'Trait Reroll',
    price: 75,
    category: 'Consumables',
    badge: 'Consumable',
    desc: 'Reroll unit traits in-game to optimize combat synergies.',
    icon: '🎲'
  },
  'modifier-prism': {
    id: 'modifier-prism',
    name: 'Modifier Prism',
    price: 120,
    category: 'Consumables',
    badge: 'Enhancement',
    desc: 'Alter special unit modifiers and awaken hidden abilities.',
    icon: '🔮'
  },
  'stat-crystal': {
    id: 'stat-crystal',
    name: 'Stat Crystal',
    price: 150,
    category: 'Consumables',
    badge: 'Upgrade',
    desc: 'Permanently boost base unit attack and defense stats.',
    icon: '💎'
  },
  'magical-leaf': {
    id: 'magical-leaf',
    name: 'Magical Leaf',
    price: 250,
    category: 'Consumables',
    badge: 'Material',
    desc: 'Rare evolution catalyst required for high-tier unit ascensions.',
    icon: '🍃'
  },

  // Units & Rarities
  'unit-rare': {
    id: 'unit-rare',
    name: 'Rare Unit',
    price: 150,
    category: 'Units',
    badge: 'Rare Tier',
    desc: 'Guaranteed Rare tier unit delivered directly to your roster.',
    icon: '⚔️'
  },
  'unit-epic': {
    id: 'unit-epic',
    name: 'Epic Unit',
    price: 400,
    category: 'Units',
    badge: 'Epic Tier',
    desc: 'High-impact Epic tier unit featuring advanced skill sets.',
    icon: '🛡️'
  },
  'unit-legendary': {
    id: 'unit-legendary',
    name: 'Legendary Unit',
    price: 900,
    category: 'Units',
    badge: 'Legendary Tier',
    desc: 'Premier Legendary champion with battlefield-altering power.',
    icon: '👑'
  },
  'unit-mythic': {
    id: 'unit-mythic',
    name: 'Mythic Unit',
    price: 2000,
    category: 'Units',
    badge: 'Mythic Tier',
    desc: 'Extremely rare Mythic powerhouse with supreme combat scaling.',
    icon: '⚡'
  },
  'unit-secret': {
    id: 'unit-secret',
    name: 'Secret Unit',
    price: 5000,
    category: 'Units',
    badge: 'Secret Tier',
    desc: 'The ultimate hidden exclusive unit reserved for elite testers.',
    icon: '🌟'
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
  if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.includes('your_webhook_id')) {
    return;
  }

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

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });
    if (!response.ok) {
      console.error('[Shop Webhook Error] Status:', response.status);
    }
  } catch (err) {
    console.error('[Shop Webhook Network Error]:', err.message);
  }
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

    const item = SHOP_CATALOG[itemId];
    if (!item) {
      return res.status(400).json({ success: false, error: 'Unknown shop item.' });
    }

    if (user.balance_pts < item.price) {
      return res.status(400).json({
        success: false,
        error: `Insufficient PTS balance (Price: ${item.price} PTS, you have ${user.balance_pts} PTS).`
      });
    }

    // Atomically deduct balance
    const updatedUser = db.updateBalance(user.discord_id, -item.price);

    // Record purchase in database
    db.recordPurchase({
      discord_id: user.discord_id,
      item_id: item.id,
      item_name: item.name,
      cost: item.price
    });

    // Fire Discord notification
    dispatchShopWebhook({
      discord_id: user.discord_id,
      username: user.username,
      item,
      newBalance: updatedUser.balance_pts
    }).catch(err => console.error('[Shop Webhook Dispatch Error]:', err));

    return res.json({
      success: true,
      item,
      newBalance: updatedUser.balance_pts,
      message: `Purchased "${item.name}" for ${item.price} PTS! Your reward has been logged for delivery.`
    });
  } catch (error) {
    console.error('[Shop Buy Error]:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal shop error.' });
  }
});

/**
 * Leaderboard Ranking Endpoint
 */
app.get('/api/leaderboard', (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const leaderboard = db.getLeaderboard(limit);
    res.json({
      success: true,
      leaderboard
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
    const { points, description, proof_url } = req.body;
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
  if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.includes('your_webhook_id')) return;

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

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });
    if (!response.ok) {
      console.error('[Review Webhook Error] Status:', response.status);
    }
  } catch (err) {
    console.error('[Review Webhook Network Error]:', err.message);
  }
}

/**
 * Dispatches Discord Webhook for manual balance adjustments
 */
async function dispatchGrantWebhook({ targetUser, amount, newBalance, reason, leadUser }) {
  if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.includes('your_webhook_id')) return;

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

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });
    if (!response.ok) {
      console.error('[Grant Webhook Error] Status:', response.status);
    }
  } catch (err) {
    console.error('[Grant Webhook Network Error]:', err.message);
  }
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
