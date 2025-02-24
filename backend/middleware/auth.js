import jwt from 'jsonwebtoken';
import config from '../config/config.js';
import { logger } from '../logger.js';
import { AppError } from './error.js';

const authenticateToken = (req, res, next) => {
  // Try to get token from cookie first, then fall back to Authorization header
  const tokenFromCookie = req.cookies?.token;
  const tokenFromHeader = req.headers['authorization']?.split(' ')[1];
  const token = tokenFromCookie || tokenFromHeader;
  
  if (!token) {
    logger.warn('Authentication failed: No token provided', {
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
  }

  jwt.verify(token, config.jwtSecret, (err, user) => {
    if (err) {
      // Handle different JWT errors
      if (err.name === 'TokenExpiredError') {
        logger.warn('Authentication failed: Token expired', {
          path: req.path,
          method: req.method,
          ip: req.ip
        });
        return next(new AppError('Token expired', 401, 'TOKEN_EXPIRED'));
      } else {
        logger.warn('Authentication failed: Invalid token', {
          error: err.message,
          path: req.path,
          method: req.method,
          ip: req.ip
        });
        return next(new AppError('Invalid authentication token', 403, 'INVALID_TOKEN'));
      }
    }
    
    logger.debug('Authentication successful', {
      userId: user.id,
      path: req.path,
      method: req.method
    });
    
    req.user = user;
    next();
  });
};

const authenticateSocket = (socket, next) => {
  // Try to get token from cookies first (if available), then fall back to auth property
  const token = socket.handshake.auth.token;
  
  if (!token) {
    logger.warn('Socket authentication failed: No token provided', {
      socketId: socket.id,
      ip: socket.handshake.address
    });
    return next(new Error('Authentication required'));
  }

  jwt.verify(token, config.jwtSecret, (err, user) => {
    if (err) {
      // Handle different JWT errors
      if (err.name === 'TokenExpiredError') {
        logger.warn('Socket authentication failed: Token expired', {
          socketId: socket.id,
          ip: socket.handshake.address
        });
        return next(new Error('Token expired'));
      } else {
        logger.warn('Socket authentication failed: Invalid token', {
          error: err.message,
          socketId: socket.id,
          ip: socket.handshake.address
        });
        return next(new Error('Invalid authentication token'));
      }
    }
    
    logger.debug('Socket authentication successful', {
      userId: user.id,
      socketId: socket.id
    });
    
    socket.userId = user.id;
    socket.username = user.username; // Add username to socket for easy access
    next();
  });
};

export {
  authenticateToken,
  authenticateSocket
};