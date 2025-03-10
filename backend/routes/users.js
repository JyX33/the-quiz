import bcrypt from 'bcrypt';
import express from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/config.js';
import { logUserAction, logger } from '../logger.js';
import { authenticateToken } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/error.js';
import db, { runTransaction } from '../models/db.js';

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
  const existingUser = await db.getAsync('SELECT id FROM users WHERE username = ?', [username]);
  
  if (existingUser) {
    throw new AppError('Username already exists', 409, 'DUPLICATE_USERNAME');
  }
  
  try {
    // Use transaction to ensure user creation and logging happens atomically
    const userId = await runTransaction(() => {
      return new Promise((resolve, reject) => {
        // Insert new user
        db.runAsync(
          'INSERT INTO users (username, password) VALUES (?, ?)',
          [username, hashedPassword]
        )
          .then(result => {
            const userId = result.lastID;
            
            // Log the registration action
            return logUserAction(userId, 'register')
              .then(() => resolve(userId));
          })
          .catch(err => reject(err));
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
  const user = await db.getAsync('SELECT * FROM users WHERE username = ?', [username]);
  
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
  
  // Set secure HttpOnly cookie for API authentication
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none', // Critical for cross-subdomain requests
    domain: '.82.29.170.182.sslip.io', // Common parent domain
    maxAge: 3600000
  });
  
  // Also set a non-HttpOnly cookie for socket auth
  res.cookie('socket_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none', // Critical for cross-subdomain requests
    domain: '.82.29.170.182.sslip.io', // Common parent domain
    maxAge: 3600000
  });
  
  try {
    await logUserAction(user.id, 'login');
    logger.info('User logged in successfully:', { userId: user.id, username });
    
    // Return user data and socket token in response body
    res.json({
      success: true,
      socket_token: token, // Include token for socket usage
      user: { id: user.id, username: user.username, theme: user.theme }
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
  
  const user = await db.getAsync('SELECT id, username, theme FROM users WHERE id = ?', [req.user.id]);
  
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
        db.runAsync(
          'UPDATE users SET theme = ? WHERE id = ?',
          [theme, req.user.id]
        )
          .then(() => {
            // Log the theme update action
            return logUserAction(req.user.id, 'update_theme')
              .then(() => resolve());
          })
          .catch(err => reject(err));
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
