const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../models/db');
const { authenticateToken } = require('../middleware/auth');
const { logAction } = require('../models/logger');

// Create a new quiz
router.post('/', authenticateToken, async (req, res) => {
  const { questions, category, difficulty } = req.body;
  const quizId = uuidv4();
  
  db.run(
    'INSERT INTO quizzes (id, creator_id, questions, category, difficulty) VALUES (?, ?, ?, ?, ?)',
    [quizId, req.user.id, JSON.stringify(questions), category, difficulty],
    async function (err) {
      if (err) return res.status(400).json({ error: err.message });
      await logAction(req.user.id, 'create_quiz');
      res.json({ quizId });
    }
  );
});

// Get user's quizzes
router.get('/', authenticateToken, (req, res) => {
  db.all(
    'SELECT id, category, difficulty FROM quizzes WHERE creator_id = ?',
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(400).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Get quiz by ID
router.get('/:id', authenticateToken, (req, res) => {
  db.get(
    'SELECT id, creator_id, questions, category, difficulty FROM quizzes WHERE id = ?',
    [req.params.id],
    (err, quiz) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
      res.json(quiz);
    }
  );
});

module.exports = router;
