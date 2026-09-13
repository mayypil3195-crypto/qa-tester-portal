# QA Tester Portal

Production-ready, standalone web portal for the QA Tester Economy system featuring strict Discord OAuth2 gatekeeper authentication, session-locked submission forms, live user balances (PTS), and interactive mini-games.

---

## 🚀 Key Features & Architecture

* **Strict Discord OAuth2 Gatekeeper**:
  * Scopes: `identify guilds`
  * Validates active guild membership using Discord Bot Token API (`/guilds/{id}/members/{user_id}`).
  * Non-members receive a strict `403 Access Denied: Unauthorized Tester` response without invite links.
* **Persistent Session & Economy (SQLite + WAL)**:
  * Manages `users` and `point_requests` tables via `better-sqlite3`.
  * Initial grant: **50 PTS** upon first login.
  * Atomic PTS balance increments/decrements with negative overdraft protection.
* **Navigation Tabs**:
  * **Home**: Tester overview, live balance pill, and fast navigation shortcuts.
  * **Submit Report**: Report submission form with locked, verified Discord Username and User ID from session.
  * **Shop**: Redeem PTS for cosmetic perks, custom tester roles, color pings, and boosters.
  * **Casino (3-Reel Slots)**: Interactive 3-reel slot machine with animated spinning reels (~78.5% RTP, up to 77x jackpot).
  * **Loot Boxes**: Standard (25 PTS) and Rare (75 PTS) testing crates rebalanced as PTS sinks (~76% RTP).
* **Discord Webhook Dispatch**:
  * Sends rich Embed notifications to lead reviewers upon submission.

---

## 📁 Directory Tree

```text
qa-tester-portal/
├── .env.example          # Environment variables template
├── .env                  # Local environment configuration
├── database.js           # SQLite manager (WAL mode, users, point_requests)
├── package.json          # Express, better-sqlite3, dotenv, express-session
├── server.js             # OAuth2 flow, gatekeeper, casino, lootboxes, shop, submission API
├── README.md             # Documentation
└── public/               # Client-side single page app
    ├── index.html        # App skeleton, top navbar, gatekeeper, tab panels
    ├── styles.css        # Modern dark UI (#0c0f17, #141824, #232a3d, #5865f2)
    └── app.js            # Tab switching, session syncing, and game logic
```

---

## ⚙️ Configuration (.env)

```env
PORT=3000
SESSION_SECRET=your_session_secret_key

# Discord OAuth2 Credentials
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_REDIRECT_URI=http://localhost:3000/auth/discord/callback

# Discord Bot Token & Target Guild Verification
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_GUILD_ID=your_guild_id

# Persistent Storage (Optional: defaults to ./requests.db)
DATABASE_PATH=/data/requests.db

# Discord Webhooks
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/... # Strictly for QA tester reports
DISCORD_LOGS_WEBHOOK_URL=https://discord.com/api/webhooks/... # Dedicated for audit logs & casino activity
```

---

## 📡 API Endpoints

* `GET /auth/discord`: Initiates OAuth2 login.
* `GET /auth/discord/callback`: Handles token exchange and guild membership verification.
* `GET /auth/logout`: Destroys session and logs out.
* `GET /api/me`: Returns current user session and PTS balance.
* `POST /api/request-points`: Submits a point request (session protected).
* `POST /api/casino/spin`: Wagers PTS on 3-reel slot machine (~78.5% RTP).
* `POST /api/lootbox/open`: Opens standard (25 PTS) or rare (75 PTS) crate.
* `POST /api/shop/buy`: Purchases role/perk rewards.
* `GET /health`: Health and uptime check.
