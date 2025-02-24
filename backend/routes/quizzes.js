import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../models/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { logAction } from '../models/logger.js';
import { logger } from '../logger.js';

const router = express.Router();

// Create a new quiz
router.post('/', authenticateToken, async (req, res) => {
  const { questions, category, difficulty } = req.body;
  const quizId = uuidv4();
  
  logger.debug('Creating new quiz:', { 
    userId: req.user.id, 
    category, 
    difficulty,
    questionCount: questions.length 
  });

  db.run(
    'INSERT INTO quizzes (id, creator_id, questions, category, difficulty) VALUES (?, ?, ?, ?, ?)',
    [quizId, req.user.id, JSON.stringify(questions), category, difficulty],
    async function (err) {
      if (err) {
        logger.error('Failed to create quiz:', {
          error: err.message,
          userId: req.user.id
        });
        return res.status(400).json({ error: err.message });
      }
      await logAction(req.user.id, 'create_quiz');
      logger.info('Quiz created successfully:', { quizId, userId: req.user.id });
      res.json({ quizId });
    }
  );
});

// Get user's quizzes
router.get('/', authenticateToken, (req, res) => {
  logger.debug('Fetching user quizzes:', { userId: req.user.id });

  db.all(
    'SELECT id, category, difficulty FROM quizzes WHERE creator_id = ?',
    [req.user.id],
    (err, rows) => {
      if (err) {
        logger.error('Failed to fetch user quizzes:', {
          error: err.message,
          userId: req.user.id
        });
        return res.status(400).json({ error: err.message });
      }
      logger.info('User quizzes retrieved:', { 
        userId: req.user.id, 
        quizCount: rows.length 
      });
      res.json(rows);
    }
  );
});

// Get quiz by ID
router.get('/:id', authenticateToken, (req, res) => {
  logger.debug('Fetching quiz by ID:', { 
    quizId: req.params.id,
    userId: req.user.id 
  });

  db.get(
    'SELECT id, creator_id, questions, category, difficulty FROM quizzes WHERE id = ?',
    [req.params.id],
    (err, quiz) => {
      if (err) {
        logger.error('Failed to fetch quiz:', {
          error: err.message,
          quizId: req.params.id
        });
        return res.status(400).json({ error: err.message });
      }
      if (!quiz) {
        logger.warn('Quiz not found:', { 
          quizId: req.params.id,
          userId: req.user.id 
        });
        return res.status(404).json({ error: 'Quiz not found' });
      }
      logger.info('Quiz retrieved successfully:', { 
        quizId: req.params.id,
        userId: req.user.id 
      });
      res.json(quiz);
    }
  );
});

export default router;
