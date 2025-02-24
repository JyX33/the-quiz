import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../models/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { logAction } from '../models/logger.js';
import { logger } from '../logger.js';

const router = express.Router();

// Create a new quiz session
router.post('/', authenticateToken, async (req, res) => {
  const { quizId } = req.body;
  const sessionId = uuidv4();

  logger.debug('Creating new quiz session:', { 
    quizId, 
    userId: req.user.id 
  });

  db.run(
    'INSERT INTO quiz_sessions (id, quiz_id, creator_id, status) VALUES (?, ?, ?, ?)',
    [sessionId, quizId, req.user.id, 'waiting'],
    async function (err) {
      if (err) {
        logger.error('Failed to create quiz session:', {
          error: err.message,
          quizId,
          userId: req.user.id
        });
        return res.status(400).json({ error: err.message });
      }
      await logAction(req.user.id, 'create_session');
      logger.info('Quiz session created successfully:', { 
        sessionId, 
        quizId, 
        userId: req.user.id 
      });
      res.json({ sessionId });
    }
  );
});

// Get session details
router.get('/:id', authenticateToken, (req, res) => {
  logger.debug('Fetching session details:', { 
    sessionId: req.params.id,
    userId: req.user.id 
  });

  db.get(
    `SELECT qs.*, q.questions, q.category, q.difficulty 
     FROM quiz_sessions qs 
     JOIN quizzes q ON qs.quiz_id = q.id 
     WHERE qs.id = ?`,
    [req.params.id],
    (err, session) => {
      if (err) {
        logger.error('Failed to fetch session details:', {
          error: err.message,
          sessionId: req.params.id
        });
        return res.status(400).json({ error: err.message });
      }
      if (!session) {
        logger.warn('Session not found:', { 
          sessionId: req.params.id,
          userId: req.user.id 
        });
        return res.status(404).json({ error: 'Session not found' });
      }
      logger.info('Session details retrieved successfully:', { 
        sessionId: req.params.id,
        userId: req.user.id 
      });
      res.json(session);
    }
  );
});

// Get session players
router.get('/:id/players', authenticateToken, (req, res) => {
  logger.debug('Fetching session players:', { 
    sessionId: req.params.id,
    userId: req.user.id 
  });

  db.all(
    `SELECT u.id, u.username 
     FROM quiz_session_players qsp 
     JOIN users u ON qsp.user_id = u.id 
     WHERE qsp.session_id = ?`,
    [req.params.id],
    (err, players) => {
      if (err) {
        logger.error('Failed to fetch session players:', {
          error: err.message,
          sessionId: req.params.id
        });
        return res.status(400).json({ error: err.message });
      }
      logger.info('Session players retrieved successfully:', { 
        sessionId: req.params.id,
        playerCount: players.length 
      });
      res.json(players);
    }
  );
});

// Get leaderboard
router.get('/leaderboard/global', (req, res) => {
  logger.debug('Fetching global leaderboard');

  db.all(
    `SELECT u.username, SUM(s.score) as total_score 
     FROM scores s 
     JOIN users u ON s.user_id = u.id 
     GROUP BY u.id, u.username 
     ORDER BY total_score DESC 
     LIMIT 10`,
    [],
    (err, rows) => {
      if (err) {
        logger.error('Failed to fetch global leaderboard:', { error: err.message });
        return res.status(400).json({ error: err.message });
      }
      logger.info('Global leaderboard retrieved successfully:', { 
        playerCount: rows.length 
      });
      res.json(rows);
    }
  );
});

export default router;
