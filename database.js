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

    CREATE INDEX IF NOT EXISTS idx_point_requests_status ON point_requests(status);
    CREATE INDEX IF NOT EXISTS idx_point_requests_created_at ON point_requests(created_at DESC);
  `);
};

initSchema();

// Prepared statements for high performance and SQL injection prevention
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
 * Creates a new point request record in the database.
 * @param {Object} param0
 * @param {string} param0.username
 * @param {string} param0.discord_id
 * @param {number} param0.points
 * @param {string} param0.work_type
 * @param {string} param0.description
 * @param {string|null} param0.proof_url
 * @returns {number|bigint} lastInsertRowid
 */
function createRequest({ username, discord_id, points, work_type, description, proof_url }) {
  const result = insertStmt.run({
    username: String(username).trim(),
    discord_id: String(discord_id).trim(),
    points: parseInt(points, 10),
    work_type: String(work_type).trim(),
    description: String(description).trim(),
    proof_url: proof_url && String(proof_url).trim().length > 0 ? String(proof_url).trim() : null
  });
  return result.lastInsertRowid;
}

/**
 * Fetches recent point requests.
 * @param {number} [limit=50]
 * @returns {Array<Object>}
 */
function getAllRequests(limit = 50) {
  const sanitizedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 50, 500));
  return getAllStmt.all(sanitizedLimit);
}

/**
 * Fetches a single request record by its ID.
 * @param {number|string} id
 * @returns {Object|undefined}
 */
function getRequestById(id) {
  return getByIdStmt.get(parseInt(id, 10));
}

/**
 * Safely updates request status with validation.
 * @param {number|string} id
 * @param {'PENDING'|'APPROVED'|'REJECTED'} status
 * @returns {boolean} true if row was updated
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
  createRequest,
  getAllRequests,
  getRequestById,
  updateRequestStatus,
  close
};
