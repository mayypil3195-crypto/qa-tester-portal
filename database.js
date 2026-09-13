const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Resolve database file path with dynamic environment variable support (e.g. Railway volume mount)
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'requests.db');

// Ensure target directory exists before initializing SQLite (e.g. create parent folder if using /data/requests.db)
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize better-sqlite3 instance
const db = new Database(dbPath);

// Enforce Write-Ahead Logging (WAL) and Foreign Keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
const initSchema = () => {
  // Check and migrate point_requests table if DECLINED is not yet in CHECK constraint
  try {
    const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'point_requests'").get();
    if (tableInfo && !tableInfo.sql.includes('DECLINED')) {
      db.exec(`
        CREATE TABLE point_requests_migration (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL,
          discord_id TEXT NOT NULL,
          points INTEGER NOT NULL CHECK(points > 0),
          work_type TEXT NOT NULL,
          description TEXT NOT NULL,
          proof_url TEXT,
          status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED', 'DECLINED')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO point_requests_migration SELECT * FROM point_requests;
        DROP TABLE point_requests;
        ALTER TABLE point_requests_migration RENAME TO point_requests;
      `);
    }
  } catch (err) {
    console.warn('[DB Migration Warning]:', err.message);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      discord_id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      avatar TEXT,
      balance_pts INTEGER DEFAULT 0,
      is_lead_tester INTEGER DEFAULT 0,
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
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED', 'DECLINED')),
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

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action_type TEXT NOT NULL,
      actor_id TEXT,
      actor_name TEXT,
      target_id TEXT,
      target_name TEXT,
      details TEXT,
      delta_pts INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      category TEXT NOT NULL,
      price_pts INTEGER NOT NULL,
      status TEXT DEFAULT 'PENDING',
      fulfilled_by TEXT,
      fulfilled_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(discord_id) REFERENCES users(discord_id)
    );

    CREATE INDEX IF NOT EXISTS idx_users_balance ON users(balance_pts DESC);
    CREATE INDEX IF NOT EXISTS idx_point_requests_status ON point_requests(status);
    CREATE INDEX IF NOT EXISTS idx_point_requests_created_at ON point_requests(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_inventory_discord_id ON inventory(discord_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(status);
    CREATE INDEX IF NOT EXISTS idx_inventory_created_at ON inventory(created_at DESC);
  `);

  try {
    const userCols = db.prepare(`PRAGMA table_info(users)`).all();
    if (!userCols.some(col => col.name === 'is_lead_tester')) {
      db.exec(`ALTER TABLE users ADD COLUMN is_lead_tester INTEGER DEFAULT 0;`);
    }
  } catch (err) {
    console.warn('[DB Users Migration Warning]:', err.message);
  }
};

initSchema();

// Prepared statements
const getUserStmt = db.prepare(`
  SELECT discord_id, username, avatar, balance_pts, is_lead_tester, created_at
  FROM users
  WHERE discord_id = ?
`);

const upsertUserStmt = db.prepare(`
  INSERT INTO users (discord_id, username, avatar, balance_pts, is_lead_tester)
  VALUES (@discord_id, @username, @avatar, 0, COALESCE(@is_lead_tester, 0))
  ON CONFLICT(discord_id) DO UPDATE SET
    username = excluded.username,
    avatar = excluded.avatar,
    is_lead_tester = CASE WHEN @is_lead_tester IS NOT NULL THEN @is_lead_tester ELSE users.is_lead_tester END
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

const getAllUsersStmt = db.prepare(`
  SELECT discord_id, username, avatar, balance_pts, created_at
  FROM users
  ORDER BY username COLLATE NOCASE ASC
`);

const insertAuditLogStmt = db.prepare(`
  INSERT INTO audit_logs (action_type, actor_id, actor_name, target_id, target_name, details, delta_pts)
  VALUES (@action_type, @actor_id, @actor_name, @target_id, @target_name, @details, @delta_pts)
`);

const getAuditLogsStmt = db.prepare(`
  SELECT id, action_type, actor_id, actor_name, target_id, target_name, details, delta_pts, created_at
  FROM audit_logs
  ORDER BY id DESC
  LIMIT ?
`);

const insertInventoryStmt = db.prepare(`
  INSERT INTO inventory (discord_id, item_id, item_name, category, price_pts, status)
  VALUES (@discord_id, @item_id, @item_name, @category, @price_pts, COALESCE(@status, 'PENDING'))
`);

const countKeysStmt = db.prepare(`
  SELECT COUNT(*) as count FROM inventory
  WHERE discord_id = ? AND item_id = ? AND status IN ('USABLE', 'OWNED')
`);

const consumeKeyStmt = db.prepare(`
  UPDATE inventory
  SET status = 'CONSUMED'
  WHERE id = (
    SELECT id FROM inventory
    WHERE discord_id = ? AND item_id = ? AND status IN ('USABLE', 'OWNED')
    ORDER BY id ASC
    LIMIT 1
  )
`);

const getUserInventoryStmt = db.prepare(`
  SELECT id, discord_id, item_id, item_name, category, price_pts, status, fulfilled_by, fulfilled_at, created_at
  FROM inventory
  WHERE discord_id = ?
  ORDER BY created_at DESC, id DESC
`);

const getAllInventoryStmt = db.prepare(`
  SELECT 
    inv.id,
    inv.discord_id,
    inv.item_id,
    inv.item_name,
    inv.category,
    inv.price_pts,
    inv.status,
    inv.fulfilled_by,
    inv.fulfilled_at,
    inv.created_at,
    u.username,
    u.avatar
  FROM inventory inv
  LEFT JOIN users u ON inv.discord_id = u.discord_id
  ORDER BY 
    CASE WHEN inv.status = 'PENDING' THEN 0 ELSE 1 END,
    inv.created_at DESC,
    inv.id DESC
  LIMIT ?
`);

const getPendingInventoryStmt = db.prepare(`
  SELECT 
    inv.id,
    inv.discord_id,
    inv.item_id,
    inv.item_name,
    inv.category,
    inv.price_pts,
    inv.status,
    inv.fulfilled_by,
    inv.fulfilled_at,
    inv.created_at,
    u.username,
    u.avatar
  FROM inventory inv
  LEFT JOIN users u ON inv.discord_id = u.discord_id
  WHERE inv.status = 'PENDING'
  ORDER BY inv.created_at DESC, inv.id DESC
  LIMIT ?
`);

const getInventoryByIdStmt = db.prepare(`
  SELECT 
    inv.id,
    inv.discord_id,
    inv.item_id,
    inv.item_name,
    inv.category,
    inv.price_pts,
    inv.status,
    inv.fulfilled_by,
    inv.fulfilled_at,
    inv.created_at,
    u.username,
    u.avatar
  FROM inventory inv
  LEFT JOIN users u ON inv.discord_id = u.discord_id
  WHERE inv.id = ?
`);

const fulfillInventoryStmt = db.prepare(`
  UPDATE inventory
  SET status = 'FULFILLED', fulfilled_by = ?, fulfilled_at = CURRENT_TIMESTAMP
  WHERE id = ?
`);

const deleteInventoryStmt = db.prepare(`
  DELETE FROM inventory
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
function upsertUser({ discord_id, username, avatar, is_lead_tester }) {
  const id = String(discord_id).trim();
  upsertUserStmt.run({
    discord_id: id,
    username: String(username).trim(),
    avatar: avatar ? String(avatar).trim() : null,
    is_lead_tester: is_lead_tester !== undefined ? (is_lead_tester ? 1 : 0) : null
  });
  return getUser(id);
}

/**
 * Set lead status for a user
 * @param {string} discordId 
 * @param {boolean} isLead 
 */
function setUserLeadStatus(discordId, isLead) {
  const stmt = db.prepare(`UPDATE users SET is_lead_tester = ? WHERE discord_id = ?`);
  return stmt.run(isLead ? 1 : 0, String(discordId).trim());
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
 * Get top ranking users by balance, excluding lead QA members
 * @param {number} [limit=20] 
 * @param {Array<string>} [excludeDiscordIds=[]]
 * @returns {Array<Object>}
 */
function getLeaderboard(limit = 20, excludeDiscordIds = []) {
  const lim = Math.max(1, Math.min(parseInt(limit, 10) || 20, 100));

  const cleanExclude = (Array.isArray(excludeDiscordIds) ? excludeDiscordIds : [])
    .map(id => String(id).trim())
    .filter(Boolean);

  let query = `
    SELECT discord_id, username, avatar, balance_pts
    FROM users
    WHERE (is_lead_tester IS NULL OR is_lead_tester = 0)
  `;
  const params = [];

  if (cleanExclude.length > 0) {
    const placeholders = cleanExclude.map(() => '?').join(',');
    query += ` AND discord_id NOT IN (${placeholders})`;
    params.push(...cleanExclude);
  }

  query += `
    ORDER BY balance_pts DESC, created_at ASC
    LIMIT ?
  `;
  params.push(lim);

  const rows = db.prepare(query).all(...params);
  return rows.map((row, index) => ({
    rank: index + 1,
    discord_id: row.discord_id,
    username: row.username,
    avatar: row.avatar,
    balance_pts: row.balance_pts
  }));
}

/**
 * Fetch all Lead QA members (disqualified from rankings), sorted by balance_pts DESC
 * @param {Array<string>} [includeDiscordIds=[]]
 * @returns {Array<Object>}
 */
function getLeadTesters(includeDiscordIds = []) {
  const cleanInclude = (Array.isArray(includeDiscordIds) ? includeDiscordIds : [])
    .map(id => String(id).trim())
    .filter(Boolean);

  let query = `
    SELECT discord_id, username, avatar, balance_pts
    FROM users
    WHERE (is_lead_tester = 1)
  `;
  const params = [];

  if (cleanInclude.length > 0) {
    const placeholders = cleanInclude.map(() => '?').join(',');
    query = `
      SELECT discord_id, username, avatar, balance_pts
      FROM users
      WHERE (is_lead_tester = 1 OR discord_id IN (${placeholders}))
    `;
    params.push(...cleanInclude);
  }

  query += `
    ORDER BY balance_pts DESC, created_at ASC
  `;

  const rows = db.prepare(query).all(...params);
  return rows.map(row => ({
    discord_id: row.discord_id,
    username: row.username,
    avatar: row.avatar,
    balance_pts: row.balance_pts,
    isDsq: true
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
  const id = String(discord_id).trim();
  const res = insertPurchaseStmt.run({
    discord_id: id,
    item_id: String(item_id).trim(),
    item_name: String(item_name).trim(),
    cost: parseInt(cost, 10)
  });

  try {
    const user = getUser(id);
    createAuditLog({
      action_type: 'SHOP_PURCHASE',
      actor_id: id,
      actor_name: user ? user.username : 'Tester',
      target_id: id,
      target_name: user ? user.username : 'Tester',
      details: `Purchased ${item_name}`,
      delta_pts: -parseInt(cost, 10)
    });
  } catch (err) {
    console.warn('[Audit Log Purchase Error]:', err.message);
  }

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
  const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'DECLINED'];
  const upperStatus = String(status).trim().toUpperCase();
  if (!validStatuses.includes(upperStatus)) {
    throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
  }
  const result = updateStatusStmt.run(upperStatus, parseInt(id, 10));
  return result.changes > 0;
}

/**
 * Fetch all registered users
 */
function getAllUsers() {
  return getAllUsersStmt.all();
}

/**
 * Record an audit log entry
 */
function createAuditLog({ action_type, actor_id, actor_name, target_id, target_name, details, delta_pts }) {
  const res = insertAuditLogStmt.run({
    action_type: String(action_type || 'SYSTEM').toUpperCase().trim(),
    actor_id: actor_id ? String(actor_id).trim() : null,
    actor_name: actor_name ? String(actor_name).trim() : null,
    target_id: target_id ? String(target_id).trim() : null,
    target_name: target_name ? String(target_name).trim() : null,
    details: details ? String(details).trim() : null,
    delta_pts: parseInt(delta_pts, 10) || 0
  });
  return res.lastInsertRowid;
}

/**
 * Fetch recent audit logs
 */
function getAuditLogs(limit = 50) {
  const sanitizedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 50, 200));
  return getAuditLogsStmt.all(sanitizedLimit);
}

/**
 * Adds an item to the player inventory with optional status (default PENDING)
 */
function addInventoryItem({ discord_id, item_id, item_name, category, price_pts, status = 'PENDING' }) {
  const res = insertInventoryStmt.run({
    discord_id: String(discord_id).trim(),
    item_id: String(item_id).trim(),
    item_name: String(item_name).trim(),
    category: String(category || 'General').trim(),
    price_pts: parseInt(price_pts, 10),
    status: status ? String(status).trim().toUpperCase() : 'PENDING'
  });
  return res.lastInsertRowid;
}

/**
 * Get count of usable keys for a user
 */
function getUserKeyCount(discordId, keyId = 'asx_case_key') {
  if (!discordId) return 0;
  const row = countKeysStmt.get(String(discordId).trim(), String(keyId).trim());
  return row ? row.count : 0;
}

/**
 * Atomically consumes 1 usable key from user inventory
 */
function consumeUserKey(discordId, keyId = 'asx_case_key') {
  if (!discordId) return false;
  const res = consumeKeyStmt.run(String(discordId).trim(), String(keyId).trim());
  return res.changes > 0;
}

/**
 * Get a specific user's inventory
 */
function getUserInventory(discordId) {
  if (!discordId) return [];
  return getUserInventoryStmt.all(String(discordId).trim());
}

/**
 * Get all inventory records for lead queue
 */
function getAllInventory(statusFilter = 'ALL', limit = 200) {
  const lim = Math.max(1, Math.min(parseInt(limit, 10) || 200, 500));
  if (String(statusFilter).toUpperCase() === 'PENDING') {
    return getPendingInventoryStmt.all(lim);
  }
  return getAllInventoryStmt.all(lim);
}

/**
 * Get a single inventory item by ID
 */
function getInventoryById(id) {
  return getInventoryByIdStmt.get(parseInt(id, 10));
}

/**
 * Fulfill an inventory item
 */
function fulfillInventoryItem(id, fulfilledByDiscordId) {
  const res = fulfillInventoryStmt.run(String(fulfilledByDiscordId).trim(), parseInt(id, 10));
  return res.changes > 0;
}

/**
 * Delete / revoke an inventory item
 */
function deleteInventoryItem(id) {
  const res = deleteInventoryStmt.run(parseInt(id, 10));
  return res.changes > 0;
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
  dbPath,
  getUser,
  upsertUser,
  setUserLeadStatus,
  updateBalance,
  getLeaderboard,
  getLeadTesters,
  recordPurchase,
  addInventoryItem,
  getUserKeyCount,
  consumeUserKey,
  getUserInventory,
  getAllInventory,
  getInventoryById,
  fulfillInventoryItem,
  deleteInventoryItem,
  createRequest,
  getAllRequests,
  getRequestById,
  updateRequestStatus,
  getAllUsers,
  createAuditLog,
  getAuditLogs,
  close
};
