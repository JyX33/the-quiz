import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db, { runTransaction } from '../models/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { logAction } from '../models/logger.js';
import { logger } from '../logger.js';
import { asyncHandler, AppError } from '../middleware/error.js';

const router = express.Router();

// Create a new quiz session
router.post('/', authenticateToken, asyncHandler(async (req, res, next) => {
  const { quizId } = req.body;
  
  // Input validation
  if (!quizId) {
    throw new AppError('Quiz ID is required', 400, 'VALIDATION_ERROR');
  }
  
  // Verify that the quiz exists
  const quiz = await new Promise((resolve, reject) => {
    db.get('SELECT id FROM quizzes WHERE id = ?', [quizId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
  
  if (!quiz) {
    throw new AppError('Quiz not found', 404, 'QUIZ_NOT_FOUND');
  }
  
  const sessionId = uuidv4();

  logger.debug('Creating new quiz session:', { 
    quizId, 
    userId: req.user.id 
  });

  try {
    // Use transaction to ensure both operations succeed or fail together
    await runTransaction(() => {
      // Create the session
      return new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO quiz_sessions (id, quiz_id, creator_id, status) VALUES (?, ?, ?, ?)',
          [sessionId, quizId, req.user.id, 'waiting'],
          function (err) {
            if (err) reject(err);
            else {
              // Add the session creator to the quiz_session_players table
              db.run(
                'INSERT INTO quiz_session_players (session_id, user_id) VALUES (?, ?)',
                [sessionId, req.user.id],
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
    
    logger.info('Session creator added to quiz_session_players:', { 
      sessionId, 
      userId: req.user.id 
    });

    await logAction(req.user.id, 'create_session');
    logger.info('Quiz session created successfully:', { 
      sessionId, 
      quizId, 
      userId: req.user.id 
    });
    
    res.status(201).json({ sessionId });
  } catch (error) {
    logger.error('Failed to create quiz session:', {
      error: error.message,
      quizId,
      userId: req.user.id
    });
    throw new AppError('Failed to create quiz session', 500, 'SESSION_CREATION_ERROR');
  }
}));

// Get session details
router.get('/:id', authenticateToken, asyncHandler(async (req, res, next) => {
  const sessionId = req.params.id;
  
  logger.debug('Fetching session details:', { 
    sessionId,
    userId: req.user.id 
  });

  const session = await new Promise((resolve, reject) => {
    db.get(
      `SELECT qs.*, q.questions, q.category, q.difficulty 
       FROM quiz_sessions qs 
       JOIN quizzes q ON qs.quiz_id = q.id 
       WHERE qs.id = ?`,
      [sessionId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
  
  if (!session) {
    throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
  }
  
  logger.info('Session details retrieved successfully:', { 
    sessionId,
    userId: req.user.id 
  });
  
  res.json(session);
}));

// Get session players
router.get('/:id/players', authenticateToken, asyncHandler(async (req, res, next) => {
  const sessionId = req.params.id;
  
  logger.debug('Fetching session players:', { 
    sessionId,
    userId: req.user.id 
  });

  // Verify that the session exists
  const sessionExists = await new Promise((resolve, reject) => {
    db.get('SELECT id FROM quiz_sessions WHERE id = ?', [sessionId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
  
  if (!sessionExists) {
    throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
  }

  const players = await new Promise((resolve, reject) => {
    db.all(
      `SELECT u.id, u.username 
       FROM quiz_session_players qsp 
       JOIN users u ON qsp.user_id = u.id 
       WHERE qsp.session_id = ?`,
      [sessionId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
  
  logger.info('Session players retrieved successfully:', { 
    sessionId,
    playerCount: players.length 
  });
  
  res.json(players);
}));

// Get leaderboard
router.get('/leaderboard/global', asyncHandler(async (req, res, next) => {
  logger.debug('Fetching global leaderboard');

  const leaderboard = await new Promise((resolve, reject) => {
    db.all(
      `SELECT u.username, SUM(s.score) as total_score 
       FROM scores s 
       JOIN users u ON s.user_id = u.id 
       GROUP BY u.id, u.username 
       ORDER BY total_score DESC 
       LIMIT 10`,
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
  
  logger.info('Global leaderboard retrieved successfully:', { 
    playerCount: leaderboard.length 
  });
  
  res.json(leaderboard);
}));

// Get user's sessions
router.get('/', authenticateToken, asyncHandler(async (req, res, next) => {
  logger.debug('Fetching user sessions:', { userId: req.user.id });

  const sessions = await new Promise((resolve, reject) => {
    db.all(
      `SELECT qs.*, q.category, q.difficulty 
       FROM quiz_sessions qs 
       JOIN quizzes q ON qs.quiz_id = q.id 
       WHERE qs.creator_id = ?`,
      [req.user.id],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
  
  logger.info('User sessions retrieved successfully:', { 
    userId: req.user.id,
    sessionCount: sessions.length 
  });
  
  res.json(sessions);
}));

export default router;