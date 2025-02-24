import jwt from 'jsonwebtoken';
import config from '../config/config.js';
import { logger } from '../logger.js';

const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    logger.warn('Authentication failed: No token provided', {
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    return res.sendStatus(401);
  }

  jwt.verify(token, config.jwtSecret, (err, user) => {
    if (err) {
      logger.warn('Authentication failed: Invalid token', {
        error: err.message,
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      return res.sendStatus(403);
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
  const token = socket.handshake.auth.token;
  
  if (!token) {
    logger.warn('Socket authentication failed: No token provided', {
      socketId: socket.id,
      ip: socket.handshake.address
    });
    return next(new Error('Authentication error'));
  }

  jwt.verify(token, config.jwtSecret, (err, user) => {
    if (err) {
      logger.warn('Socket authentication failed: Invalid token', {
        error: err.message,
        socketId: socket.id,
        ip: socket.handshake.address
      });
      return next(new Error('Authentication error'));
    }
    
    logger.debug('Socket authentication successful', {
      userId: user.id,
      socketId: socket.id
    });
    
    socket.userId = user.id;
    next();
  });
};

export {
  authenticateToken,
  authenticateSocket
};
