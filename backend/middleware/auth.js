import jwt from 'jsonwebtoken';
import config from '../config/config.js';
import { logger } from '../logger.js';
import { AppError } from './error.js';

const authenticateToken = (req, res, next) => {
  // Try to get token from cookie first, then fall back to Authorization header
  const tokenFromCookie = req.cookies?.token;
  const tokenFromHeader = req.headers['authorization']?.split(' ')[1];
  const token = tokenFromCookie || tokenFromHeader;

  // In your auth middleware
  console.log('Cookies received:', req.cookies);
  console.log('Headers received:', req.headers);
  
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
  try {
    // Try different methods to get the token
    const tokenFromAuth = socket.handshake.auth?.token;
    const authHeader = socket.handshake.headers?.authorization || '';
    let tokenFromHeader = null;
    
    // Extract Bearer token properly
    if (authHeader.startsWith('Bearer ')) {
      tokenFromHeader = authHeader.substring(7);
    }
    
    const token = tokenFromAuth || tokenFromHeader;
    
    logger.debug('Socket auth attempt', {
      socketId: socket.id,
      ip: socket.handshake.address,
      hasAuthToken: !!tokenFromAuth,
      hasHeaderToken: !!tokenFromHeader,
      authHeader: authHeader ? `${authHeader.substr(0, 15)}...` : 'none' // Log partial header for debugging
    });
    
    if (!token) {
      logger.warn('Socket authentication failed: No token provided', {
        socketId: socket.id,
        ip: socket.handshake.address
      });
      return next(new Error('Authentication required'));
    }
  } catch (error) {
    logger.error('Error in socket authentication processing:', {
      error: error.message,
      socketId: socket.id
    });
    return next(new Error('Authentication error'));
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