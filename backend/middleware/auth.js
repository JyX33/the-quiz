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
    
    // Try to get token from cookies as a last resort
    let tokenFromCookie = null;
    if (socket.handshake.headers.cookie) {
      const cookies = socket.handshake.headers.cookie.split(';')
        .map(cookie => cookie.trim())
        .reduce((acc, curr) => {
          if (curr.includes('=')) {
            const [key, value] = curr.split('=');
            acc[key] = value;
          }
          return acc;
        }, {});
      
      tokenFromCookie = cookies.token || cookies.socket_token;
    }
    
    const token = tokenFromAuth || tokenFromHeader || tokenFromCookie;
    
    logger.debug('Socket auth attempt', {
      socketId: socket.id,
      ip: socket.handshake.address,
      hasAuthToken: !!tokenFromAuth,
      hasHeaderToken: !!tokenFromHeader,
      hasCookieToken: !!tokenFromCookie
    });
    
    if (!token) {
      logger.warn('Socket authentication failed: No token provided', {
        socketId: socket.id,
        ip: socket.handshake.address
      });
      return next(new Error('Authentication required'));
    }

    try {
      // Use try/catch around verify to ensure we handle any JWT parsing errors
      const user = jwt.verify(token, config.jwtSecret);
      
      if (!user || !user.id) {
        logger.warn('Socket authentication failed: Invalid user data in token', {
          socketId: socket.id,
          ip: socket.handshake.address
        });
        return next(new Error('Invalid user data'));
      }
      
      logger.debug('Socket authentication successful', {
        userId: user.id,
        socketId: socket.id
      });
      
      // Store user data in socket
      socket.userId = user.id;
      socket.username = user.username || 'Unknown User';
      next();
    } catch (jwtError) {
      // Handle different JWT errors
      if (jwtError.name === 'TokenExpiredError') {
        logger.warn('Socket authentication failed: Token expired', {
          socketId: socket.id,
          ip: socket.handshake.address
        });
        return next(new Error('Token expired'));
      } else {
        logger.warn('Socket authentication failed: Invalid token', {
          error: jwtError.message,
          socketId: socket.id,
          ip: socket.handshake.address
        });
        return next(new Error('Invalid authentication token'));
      }
    }
  } catch (error) {
    logger.error('Error in socket authentication processing:', {
      error: error.message,
      stack: error.stack,
      socketId: socket.id || 'unknown'
    });
    return next(new Error('Authentication error'));
  }
};

export {
  authenticateSocket, authenticateToken
};
