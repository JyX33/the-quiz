import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../models/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { logAction } from '../models/logger.js';
import config from '../config/config.js';
import { logger } from '../logger.js';

const router = express.Router();

// Register a new user
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword],
      async function (err) {
      if (err) {
        logger.error('User registration failed:', { error: err.message, username });
        return res.status(400).json({ error: err.message });
      }
      await logAction(this.lastID, 'register');
      logger.info('User registered successfully:', { userId: this.lastID, username });
      res.json({ id: this.lastID });
      }
    );
  } catch (err) {
    logger.error('User registration error:', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Error creating user' });
  }
});

// Login user
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get(
    'SELECT * FROM users WHERE username = ?',
    [username],
    async (err, user) => {
      if (err) {
        logger.error('Database error during login:', { error: err.message, username });
        return res.status(500).json({ error: 'Login error' });
      }
      if (!user) {
        logger.warn('Login attempt with non-existent user:', { username });
        return res.status(400).json({ error: 'User not found' });
      }
      
      try {
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
          logger.warn('Invalid password attempt:', { username });
          return res.status(400).json({ error: 'Invalid password' });
        }
        
        const token = jwt.sign(
          { id: user.id, username: user.username },
          config.jwtSecret,
          { expiresIn: '1h' }
        );
        
        await logAction(user.id, 'login');
        logger.info('User logged in successfully:', { userId: user.id, username });
        res.json({ token });
      } catch (err) {
        res.status(500).json({ error: 'Login error' });
      }
    }
  );
});

// Get current user profile
router.get('/me', authenticateToken, (req, res) => {
  logger.debug('Fetching user profile:', { userId: req.user.id });
  db.get(
    'SELECT id, username, theme FROM users WHERE id = ?',
    [req.user.id],
    (err, user) => {
      if (err) {
        logger.error('Error fetching user profile:', { 
          userId: req.user.id, 
          error: err.message 
        });
        return res.status(400).json({ error: err.message });
      }
      logger.info('User profile retrieved:', { userId: req.user.id });
      res.json(user);
    }
  );
});

// Update user theme
router.put('/me/theme', authenticateToken, async (req, res) => {
  const { theme } = req.body;
  logger.debug('Updating user theme:', { userId: req.user.id, theme });
  db.run(
    'UPDATE users SET theme = ? WHERE id = ?',
    [theme, req.user.id],
    async function (err) {
      if (err) {
        logger.error('Error updating user theme:', {
          userId: req.user.id,
          theme,
          error: err.message
        });
        return res.status(400).json({ error: err.message });
      }
      await logAction(req.user.id, 'update_theme');
      logger.info('User theme updated successfully:', {
        userId: req.user.id,
        theme
      });
      res.json({ message: 'Theme updated' });
    }
  );
});

export default router;
