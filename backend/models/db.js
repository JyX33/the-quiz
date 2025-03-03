import sqlite3 from 'sqlite3';
import config from '../config/config.js';
import { logger } from '../logger.js';

const db = new sqlite3.Database(config.dbPath, (err) => {
  if (err) {
    logger.error('Database connection error:', { error: err.message, stack: err.stack });
  } else {
    logger.info('Connected to SQLite database');
  }
});

/**
 * Promisify SQLite db.run method
 * @param {string} sql - SQL query to run
 * @param {Array} params - Parameters for the SQL query
 * @returns {Promise<object>} - Promise that resolves with the result object
 */
db.runAsync = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    this.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
};

/**
 * Promisify SQLite db.get method
 * @param {string} sql - SQL query to run
 * @param {Array} params - Parameters for the SQL query
 * @returns {Promise<object>} - Promise that resolves with a single row
 */
db.getAsync = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    this.get(sql, params, function(err, row) {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

/**
 * Promisify SQLite db.all method
 * @param {string} sql - SQL query to run
 * @param {Array} params - Parameters for the SQL query
 * @returns {Promise<Array>} - Promise that resolves with all rows
 */
db.allAsync = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    this.all(sql, params, function(err, rows) {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Initialize database schema
const initDb = async () => {
  logger.info('Initializing database schema');
  
  try {
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        theme TEXT DEFAULT 'Alliance'
      )
    `);

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS quizzes (
        id TEXT PRIMARY KEY,
        creator_id INTEGER,
        questions TEXT NOT NULL,
        category TEXT,
        difficulty TEXT,
        FOREIGN KEY (creator_id) REFERENCES users(id)
      )
    `);

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS quiz_sessions (
        id TEXT PRIMARY KEY,
        quiz_id TEXT,
        creator_id INTEGER,
        status TEXT DEFAULT 'waiting',
        current_question INTEGER DEFAULT 0,
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id),
        FOREIGN KEY (creator_id) REFERENCES users(id)
      )
    `);

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS quiz_session_players (
        session_id TEXT,
        user_id INTEGER,
        PRIMARY KEY (session_id, user_id),
        FOREIGN KEY (session_id) REFERENCES quiz_sessions(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS scores (
        session_id TEXT,
        user_id INTEGER,
        score INTEGER NOT NULL,
        correct_answers INTEGER NOT NULL,
        time_taken INTEGER NOT NULL,
        PRIMARY KEY (session_id, user_id),
        FOREIGN KEY (session_id) REFERENCES quiz_sessions(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS player_bonuses (
        session_id TEXT,
        user_id INTEGER,
        bonuses_used INTEGER DEFAULT 0,
        bonus_active BOOLEAN DEFAULT 0,
        PRIMARY KEY (session_id, user_id),
        FOREIGN KEY (session_id) REFERENCES quiz_sessions(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    
    logger.info('Database schema initialized successfully');
  } catch (err) {
    logger.error('Schema initialization error:', { error: err.message, stack: err.stack });
  }
};

/**
 * Executes a function within a database transaction
 * @param {Function} operations - A function containing database operations to execute within the transaction
 * @returns {Promise<any>} - Resolves with the result of the operations or rejects with an error
 */
const runTransaction = async (operations) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      try {
        const results = operations();
        db.run('COMMIT', (err) => {
          if (err) {
            logger.error('Transaction commit error:', { error: err.message, stack: err.stack });
            db.run('ROLLBACK');
            reject(err);
          } else {
            resolve(results);
          }
        });
      } catch (error) {
        logger.error('Transaction error:', { error: error.message, stack: error.stack });
        db.run('ROLLBACK');
        reject(error);
      }
    });
  });
};

// Convert the runTransaction function to use async/await pattern
const runTransactionAsync = async (operations) => {
  await db.runAsync('BEGIN TRANSACTION');
  
  try {
    const results = await operations();
    await db.runAsync('COMMIT');
    logger.debug('Transaction committed successfully');
    return results;
  } catch (error) {
    await db.runAsync('ROLLBACK');
    logger.error('Transaction rolled back due to error:', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

// Don't initialize database here - moved to server.js
// initDb();

export { runTransaction, runTransactionAsync, initDb };
export default db;