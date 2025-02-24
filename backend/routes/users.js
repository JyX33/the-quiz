const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = require('../models/db');
const { authenticateToken } = require('../middleware/auth');
const { logAction } = require('../models/logger');
const config = require('../config/config');

// Register a new user
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword],
      async function (err) {
        if (err) return res.status(400).json({ error: err.message });
        await logAction(this.lastID, 'register');
        res.json({ id: this.lastID });
      }
    );
  } catch (err) {
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
      if (err || !user) return res.status(400).json({ error: 'User not found' });
      
      try {
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Invalid password' });
        
        const token = jwt.sign(
          { id: user.id, username: user.username },
          config.jwtSecret,
          { expiresIn: '1h' }
        );
        
        await logAction(user.id, 'login');
        res.json({ token });
      } catch (err) {
        res.status(500).json({ error: 'Login error' });
      }
    }
  );
});

// Get current user profile
router.get('/me', authenticateToken, (req, res) => {
  db.get(
    'SELECT id, username, theme FROM users WHERE id = ?',
    [req.user.id],
    (err, user) => {
      if (err) return res.status(400).json({ error: err.message });
      res.json(user);
    }
  );
});

// Update user theme
router.put('/me/theme', authenticateToken, async (req, res) => {
  const { theme } = req.body;
  db.run(
    'UPDATE users SET theme = ? WHERE id = ?',
    [theme, req.user.id],
    async function (err) {
      if (err) return res.status(400).json({ error: err.message });
      await logAction(req.user.id, 'update_theme');
      res.json({ message: 'Theme updated' });
    }
  );
});

module.exports = router;
