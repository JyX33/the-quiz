const db = require('./db');

const logAction = (userId, action) => {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO logs (user_id, action) VALUES (?, ?)',
      [userId, action],
      function (err) {
        if (err) {
          console.error('Logging error:', err);
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
};

module.exports = {
  logAction
};
