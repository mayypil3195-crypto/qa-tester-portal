# QA Submission Portal

Minimal, high-performance web portal for QA testers to submit points requests, storing records in SQLite and dispatching real-time embed notifications via Discord Webhooks.

---

## Architecture & Stack

- **Runtime**: Node.js (v18+ LTS / v24, CommonJS)
- **Backend**: Express.js (REST API, static asset hosting)
- **Database**: SQLite via `better-sqlite3` (WAL mode enabled, foreign keys ON)
- **Discord Integration**: Discord Webhook API via native `fetch`
- **Frontend**: Vanilla HTML5, modern CSS3 (custom properties, dark card layout), Vanilla JS

---

## Directory Structure

```text
qa-tester-portal/
├── .env.example          # Environment variables template
├── .env                  # Local environment configuration
├── database.js           # SQLite database manager
├── package.json          # Dependencies and scripts
├── server.js             # Express REST API & Discord webhook dispatcher
├── README.md             # Documentation
└── public/               # Static frontend assets
    ├── index.html        # Minimal submission form
    ├── styles.css        # Compact modern dark styling
    └── app.js            # Client submission handler
```

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Set `PORT` and your Discord webhook URL in `.env`:
```env
PORT=3000
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

### 3. Start Server
```bash
npm start
```

Open `http://localhost:3000` in your browser.

---

## API Endpoints

### `POST /api/request-points`
Submits a points request.

**Request Payload:**
```json
{
  "username": "username",
  "discord_id": "123456789012345678",
  "points": 10,
  "description": "Describe the bugs found or testing done...",
  "proof_url": "https://..."
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "id": 1,
  "message": "Submitted successfully."
}
```

### `GET /health`
Returns health check status and uptime.
