import * as sqlite3 from 'sqlite3';
import config from '../config/config.js';
import { logger } from '../logger.js';

const db = new sqlite3.Database(config.dbPath, (err) => {
  if (err) {
    logger.error('Database connection error:', { error: err.message, stack: err.stack });
  } else {
    logger.info('Connected to SQLite database');
  }
});

// Initialize database schema
const initDb = () => {
  logger.info('Initializing database schema');
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        theme TEXT DEFAULT 'Alliance'
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS quizzes (
        id TEXT PRIMARY KEY,
        creator_id INTEGER,
        questions TEXT NOT NULL,
        category TEXT,
        difficulty TEXT,
        FOREIGN KEY (creator_id) REFERENCES users(id)
      )
    `);

    db.run(`
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

    db.run(`
      CREATE TABLE IF NOT EXISTS quiz_session_players (
        session_id TEXT,
        user_id INTEGER,
        PRIMARY KEY (session_id, user_id),
        FOREIGN KEY (session_id) REFERENCES quiz_sessions(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    db.run(`
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

    db.run(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
  }, (err) => {
    if (err) {
      logger.error('Schema initialization error:', { error: err.message, stack: err.stack });
    } else {
      logger.info('Database schema initialized successfully');
    }
  });
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

// Initialize database
initDb();

export { runTransaction };
export default db;