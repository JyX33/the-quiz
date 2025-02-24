import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db, { runTransaction } from '../models/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { logAction } from '../models/logger.js';
import config from '../config/config.js';
import { logger } from '../logger.js';
import { asyncHandler, AppError } from '../middleware/error.js';

const router = express.Router();

// Register a new user
router.post('/register', asyncHandler(async (req, res, next) => {
  const { username, password } = req.body;
  
  // Input validation
  if (!username || !password) {
    throw new AppError('Username and password are required', 400, 'VALIDATION_ERROR');
  }
  
  if (password.length < 6) {
    throw new AppError('Password must be at least 6 characters long', 400, 'VALIDATION_ERROR');
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // Check if username already exists
  const existingUser = await new Promise((resolve, reject) => {
    db.get('SELECT id FROM users WHERE username = ?', [username], (err, user) => {
      if (err) reject(err);
      else resolve(user);
    });
  });
  
  if (existingUser) {
    throw new AppError('Username already exists', 409, 'DUPLICATE_USERNAME');
  }
  
  try {
    // Use transaction to ensure user creation and logging happens atomically
    const userId = await runTransaction(() => {
      return new Promise((resolve, reject) => {
        // Insert new user
        db.run(
          'INSERT INTO users (username, password) VALUES (?, ?)',
          [username, hashedPassword],
          function (err) {
            if (err) reject(err);
            else {
              const userId = this.lastID;
              
              // Log the registration action
              db.run(
                'INSERT INTO logs (user_id, action) VALUES (?, ?)',
                [userId, 'register'],
                (err) => {
                  if (err) reject(err);
                  else resolve(userId);
                }
              );
            }
          }
        );
      });
    });
    
    logger.info('User registered successfully:', { userId, username });
    res.status(201).json({ id: userId });
  } catch (error) {
    logger.error('Failed to register user:', {
      error: error.message,
      username
    });
    throw new AppError('Failed to register user', 500, 'REGISTRATION_ERROR');
  }
}));

// Login user
router.post('/login', asyncHandler(async (req, res, next) => {
  const { username, password } = req.body;
  
  // Input validation
  if (!username || !password) {
    throw new AppError('Username and password are required', 400, 'VALIDATION_ERROR');
  }
  
  // Get user from database
  const user = await new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
      if (err) reject(err);
      else resolve(user);
    });
  });
  
  if (!user) {
    throw new AppError('Invalid username or password', 401, 'INVALID_CREDENTIALS');
  }
  
  // Verify password
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    logger.warn('Invalid password attempt:', { username });
    throw new AppError('Invalid username or password', 401, 'INVALID_CREDENTIALS');
  }
  
  // Generate token
  const token = jwt.sign(
    { id: user.id, username: user.username },
    config.jwtSecret,
    { expiresIn: '1h' }
  );
  
  // Set token as HttpOnly cookie
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000 // 1 hour in milliseconds
  });
  
  try {
    await logAction(user.id, 'login');
    logger.info('User logged in successfully:', { userId: user.id, username });
    
    // Return user data but NOT the token in response body
    res.json({ 
      success: true, 
      user: { id: user.id, username: user.username } 
    });
  } catch (error) {
    // Login succeeded but logging failed, continue anyway
    logger.error('Failed to log login action:', {
      error: error.message,
      userId: user.id
    });
    res.json({ token });
  }
}));

// Logout user
router.post('/logout', (req, res) => {
  // Clear the auth cookie
  res.clearCookie('token');
  logger.info('User logged out');
  res.json({ message: 'Logged out successfully' });
});

// Get current user profile
router.get('/me', authenticateToken, asyncHandler(async (req, res, next) => {
  logger.debug('Fetching user profile:', { userId: req.user.id });
  
  const user = await new Promise((resolve, reject) => {
    db.get(
      'SELECT id, username, theme FROM users WHERE id = ?',
      [req.user.id],
      (err, user) => {
        if (err) reject(err);
        else resolve(user);
      }
    );
  });
  
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }
  
  logger.info('User profile retrieved:', { userId: req.user.id });
  res.json(user);
}));

router.post('/refresh-token', (req, res) => {
  const token = req.cookies.token;
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, config.jwtSecret, { ignoreExpiration: true });
    
    // Check if token is close to expiration (within 5 minutes)
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp - now > 300) {
      // Token still has more than 5 minutes, return success
      return res.json({ success: true });
    }
    
    // Generate new token
    const newToken = jwt.sign(
      { id: decoded.id, username: decoded.username },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
    
    // Set new token as cookie
    res.cookie('token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000 // 1 hour
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Update user theme
router.put('/me/theme', authenticateToken, asyncHandler(async (req, res, next) => {
  const { theme } = req.body;
  
  // Input validation
  if (!theme) {
    throw new AppError('Theme is required', 400, 'VALIDATION_ERROR');
  }
  
  logger.debug('Updating user theme:', { userId: req.user.id, theme });
  
  try {
    // Use transaction to ensure theme update and logging happens atomically
    await runTransaction(() => {
      return new Promise((resolve, reject) => {
        db.run(
          'UPDATE users SET theme = ? WHERE id = ?',
          [theme, req.user.id],
          function (err) {
            if (err) reject(err);
            else {
              // Log the theme update action
              db.run(
                'INSERT INTO logs (user_id, action) VALUES (?, ?)',
                [req.user.id, 'update_theme'],
                (err) => {
                  if (err) reject(err);
                  else resolve();
                }
              );
            }
          }
        );
      });
    });
    
    logger.info('User theme updated successfully:', {
      userId: req.user.id,
      theme
    });
    
    res.json({ message: 'Theme updated' });
  } catch (error) {
    logger.error('Failed to update user theme:', {
      error: error.message,
      userId: req.user.id,
      theme
    });
    throw new AppError('Failed to update theme', 500, 'THEME_UPDATE_ERROR');
  }
}));

export default router;