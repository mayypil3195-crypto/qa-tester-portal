const path = require('path');
const Database = require('better-sqlite3');

// Resolve database file path relative to this module
const DB_PATH = path.join(__dirname, 'requests.db');

// Initialize better-sqlite3 instance
const db = new Database(DB_PATH);

// Enforce Write-Ahead Logging (WAL) and Foreign Keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
const initSchema = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      discord_id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      avatar TEXT,
      balance_pts INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS point_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      discord_id TEXT NOT NULL,
      points INTEGER NOT NULL CHECK(points > 0),
      work_type TEXT NOT NULL,
      description TEXT NOT NULL,
      proof_url TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shop_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      cost INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_users_balance ON users(balance_pts DESC);
    CREATE INDEX IF NOT EXISTS idx_point_requests_status ON point_requests(status);
    CREATE INDEX IF NOT EXISTS idx_point_requests_created_at ON point_requests(created_at DESC);
  `);
};

initSchema();

// Prepared statements
const getUserStmt = db.prepare(`
  SELECT discord_id, username, avatar, balance_pts, created_at
  FROM users
  WHERE discord_id = ?
`);

const upsertUserStmt = db.prepare(`
  INSERT INTO users (discord_id, username, avatar, balance_pts)
  VALUES (@discord_id, @username, @avatar, 0)
  ON CONFLICT(discord_id) DO UPDATE SET
    username = excluded.username,
    avatar = excluded.avatar
`);

const updateBalanceStmt = db.prepare(`
  UPDATE users
  SET balance_pts = balance_pts + ?
  WHERE discord_id = ? AND (balance_pts + ? >= 0)
`);

const getLeaderboardStmt = db.prepare(`
  SELECT discord_id, username, avatar, balance_pts
  FROM users
  ORDER BY balance_pts DESC, created_at ASC
  LIMIT ?
`);

const insertPurchaseStmt = db.prepare(`
  INSERT INTO shop_purchases (discord_id, item_id, item_name, cost)
  VALUES (@discord_id, @item_id, @item_name, @cost)
`);

const insertStmt = db.prepare(`
  INSERT INTO point_requests (username, discord_id, points, work_type, description, proof_url)
  VALUES (@username, @discord_id, @points, @work_type, @description, @proof_url)
`);

const getAllStmt = db.prepare(`
  SELECT id, username, discord_id, points, work_type, description, proof_url, status, created_at
  FROM point_requests
  ORDER BY id DESC
  LIMIT ?
`);

const getByIdStmt = db.prepare(`
  SELECT id, username, discord_id, points, work_type, description, proof_url, status, created_at
  FROM point_requests
  WHERE id = ?
`);

const updateStatusStmt = db.prepare(`
  UPDATE point_requests
  SET status = ?
  WHERE id = ?
`);

/**
 * Fetch a user by Discord ID
 * @param {string} discordId 
 * @returns {Object|undefined}
 */
function getUser(discordId) {
  if (!discordId) return undefined;
  return getUserStmt.get(String(discordId).trim());
}

/**
 * Upserts a user on login. Starting balance defaults to 0 PTS.
 * If existing, updates username & avatar while retaining balance.
 * @param {Object} param0 
 * @param {string} param0.discord_id
 * @param {string} param0.username
 * @param {string|null} param0.avatar
 * @returns {Object}
 */
function upsertUser({ discord_id, username, avatar }) {
  const id = String(discord_id).trim();
  upsertUserStmt.run({
    discord_id: id,
    username: String(username).trim(),
    avatar: avatar ? String(avatar).trim() : null
  });
  return getUser(id);
}

/**
 * Atomically updates a user's PTS balance (positive or negative).
 * Prevents balance from dropping below 0.
 * @param {string} discordId 
 * @param {number} deltaPoints 
 * @returns {Object} Updated user object
 */
function updateBalance(discordId, deltaPoints) {
  const id = String(discordId).trim();
  const delta = parseInt(deltaPoints, 10);
  if (isNaN(delta)) {
    throw new Error('Invalid delta points value');
  }

  const result = updateBalanceStmt.run(delta, id, delta);
  if (result.changes === 0) {
    const existing = getUser(id);
    if (!existing) {
      throw new Error('User not found');
    }
    if (existing.balance_pts + delta < 0) {
      throw new Error('Insufficient PTS balance');
    }
  }

  return getUser(id);
}

/**
 * Get top ranking users by balance
 * @param {number} [limit=20] 
 * @returns {Array<Object>}
 */
function getLeaderboard(limit = 20) {
  const lim = Math.max(1, Math.min(parseInt(limit, 10) || 20, 100));
  const rows = getLeaderboardStmt.all(lim);
  return rows.map((row, index) => ({
    rank: index + 1,
    discord_id: row.discord_id,
    username: row.username,
    avatar: row.avatar,
    balance_pts: row.balance_pts
  }));
}

/**
 * Records a shop purchase in the audit log
 * @param {Object} param0 
 * @param {string} param0.discord_id
 * @param {string} param0.item_id
 * @param {string} param0.item_name
 * @param {number} param0.cost
 * @returns {number|bigint}
 */
function recordPurchase({ discord_id, item_id, item_name, cost }) {
  const res = insertPurchaseStmt.run({
    discord_id: String(discord_id).trim(),
    item_id: String(item_id).trim(),
    item_name: String(item_name).trim(),
    cost: parseInt(cost, 10)
  });
  return res.lastInsertRowid;
}

/**
 * Creates a new point request record in the database.
 */
function createRequest({ username, discord_id, points, work_type, description, proof_url }) {
  const result = insertStmt.run({
    username: String(username).trim(),
    discord_id: String(discord_id).trim(),
    points: parseInt(points, 10),
    work_type: work_type && String(work_type).trim().length > 0 ? String(work_type).trim() : 'General Testing',
    description: String(description).trim(),
    proof_url: proof_url && String(proof_url).trim().length > 0 ? String(proof_url).trim() : null
  });
  return result.lastInsertRowid;
}

/**
 * Fetches recent point requests.
 */
function getAllRequests(limit = 50) {
  const sanitizedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 50, 500));
  return getAllStmt.all(sanitizedLimit);
}

/**
 * Fetches a single request record by its ID.
 */
function getRequestById(id) {
  return getByIdStmt.get(parseInt(id, 10));
}

/**
 * Safely updates request status with validation.
 */
function updateRequestStatus(id, status) {
  const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
  const upperStatus = String(status).trim().toUpperCase();
  if (!validStatuses.includes(upperStatus)) {
    throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
  }
  const result = updateStatusStmt.run(upperStatus, parseInt(id, 10));
  return result.changes > 0;
}

/**
 * Gracefully close database connection.
 */
function close() {
  if (db && db.open) {
    db.close();
  }
}

module.exports = {
  db,
  getUser,
  upsertUser,
  updateBalance,
  getLeaderboard,
  recordPurchase,
  createRequest,
  getAllRequests,
  getRequestById,
  updateRequestStatus,
  close
};
