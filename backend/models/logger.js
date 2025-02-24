import db from './db.js';
import { logger } from '../logger.js';

// Action logging function
const logAction = async (userId, action) => {
  try {
    const result = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO logs (user_id, action) VALUES (?, ?)',
        [userId, action],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // Log the action using Winston
    logger.info(`User Action: ${action}`, {
      userId,
      actionId: result,
      timestamp: new Date().toISOString()
    });

    return result;
  } catch (error) {
    logger.error('Database logging error:', {
      userId,
      action,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

export { logAction };
