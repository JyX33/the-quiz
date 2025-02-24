import winston from 'winston';
import path from 'path';
import config from './config/config.js';

// Define custom log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each log level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston about our colors
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.json(),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
  winston.format.printf(info => {
    const { timestamp, level, message, metadata } = info;
    const metaStr = Object.keys(metadata).length ? 
      ` | ${JSON.stringify(metadata)}` : '';
    return `${timestamp} ${level}: ${message}${metaStr}`;
  })
);

// Create the logger
const logger = winston.createLogger({
  level: config.logging.level,
  levels,
  format,
  transports: [
    // Console transport for development
    new winston.transports.Console(),
    
    // File transport for errors
    new winston.transports.File({
      filename: config.logging.files.error,
      level: 'error',
    }),
    
    // File transport for all logs
    new winston.transports.File({ 
      filename: config.logging.files.combined 
    }),
  ],
});

// Create a stream object for Morgan
const stream = {
  write: (message) => logger.http(message.trim()),
};

/**
 * Log user actions to the database
 * Moved from models/logger.js to consolidate logging functionality
 * @param {Object} db - Database connection
 * @param {number} userId - User ID
 * @param {string} action - Description of the action
 * @returns {Promise<number>} - ID of the logged action
 */
const logUserAction = async (db, userId, action) => {
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

// Add environment info to startup
logger.info('Logger initialized', {
  environment: process.env.NODE_ENV || 'development',
  logLevel: config.logging.level,
  logFiles: config.logging.files
});

export { logger, stream, logUserAction };