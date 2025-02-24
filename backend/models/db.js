const sqlite3 = require('sqlite3').verbose();
const config = require('../config/config');

const db = new sqlite3.Database(config.dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Initialize database schema
const initDb = () => {
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
  });
};

// Initialize database
initDb();

module.exports = db;
