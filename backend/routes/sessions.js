const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../models/db');
const { authenticateToken } = require('../middleware/auth');
const { logAction } = require('../models/logger');

// Create a new quiz session
router.post('/', authenticateToken, async (req, res) => {
  const { quizId } = req.body;
  const sessionId = uuidv4();

  db.run(
    'INSERT INTO quiz_sessions (id, quiz_id, creator_id, status) VALUES (?, ?, ?, ?)',
    [sessionId, quizId, req.user.id, 'waiting'],
    async function (err) {
      if (err) return res.status(400).json({ error: err.message });
      await logAction(req.user.id, 'create_session');
      res.json({ sessionId });
    }
  );
});

// Get session details
router.get('/:id', authenticateToken, (req, res) => {
  db.get(
    `SELECT qs.*, q.questions, q.category, q.difficulty 
     FROM quiz_sessions qs 
     JOIN quizzes q ON qs.quiz_id = q.id 
     WHERE qs.id = ?`,
    [req.params.id],
    (err, session) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!session) return res.status(404).json({ error: 'Session not found' });
      res.json(session);
    }
  );
});

// Get session players
router.get('/:id/players', authenticateToken, (req, res) => {
  db.all(
    `SELECT u.id, u.username 
     FROM quiz_session_players qsp 
     JOIN users u ON qsp.user_id = u.id 
     WHERE qsp.session_id = ?`,
    [req.params.id],
    (err, players) => {
      if (err) return res.status(400).json({ error: err.message });
      res.json(players);
    }
  );
});

// Get leaderboard
router.get('/leaderboard/global', (req, res) => {
  db.all(
    `SELECT u.username, SUM(s.score) as total_score 
     FROM scores s 
     JOIN users u ON s.user_id = u.id 
     GROUP BY u.id, u.username 
     ORDER BY total_score DESC 
     LIMIT 10`,
    [],
    (err, rows) => {
      if (err) return res.status(400).json({ error: err.message });
      res.json(rows);
    }
  );
});

module.exports = router;
