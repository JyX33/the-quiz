import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logUserAction, logger } from '../logger.js';
import { authenticateToken } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/error.js';
import db, { runTransactionAsync } from '../models/db.js';

const router = express.Router();

// Create a new quiz session
router.post('/', authenticateToken, asyncHandler(async (req, res, next) => {
  const { quizId } = req.body;
  
  // Input validation
  if (!quizId) {
    throw new AppError('Quiz ID is required', 400, 'VALIDATION_ERROR');
  }
  
  // Verify that the quiz exists
  const quiz = await db.getAsync('SELECT id, creator_id FROM quizzes WHERE id = ?', [quizId]);
  
  if (!quiz) {
    throw new AppError('Quiz not found', 404, 'QUIZ_NOT_FOUND');
  }
  
  const sessionId = uuidv4();
  
  // Log detailed information about the creator
  logger.debug('Creating new quiz session:', { 
    quizId, 
    userId: req.user.id,
    quizCreatorId: quiz.creator_id
  });

  try {
    // Use transaction to ensure both operations succeed or fail together
    await runTransactionAsync(async () => {
      // Create the session with the authenticated user as creator
      await db.runAsync(
        'INSERT INTO quiz_sessions (id, quiz_id, creator_id, status) VALUES (?, ?, ?, ?)',
        [sessionId, quizId, req.user.id, 'waiting']
      );
      
      // Add the session creator to the quiz_session_players table
      await db.runAsync(
        'INSERT INTO quiz_session_players (session_id, user_id) VALUES (?, ?)',
        [sessionId, req.user.id]
      );
    });
    
    logger.info('Session creator added to quiz_session_players:', { 
      sessionId, 
      userId: req.user.id 
    });

    await logUserAction(req.user.id, 'create_session');
    logger.info('Quiz session created successfully:', { 
      sessionId, 
      quizId, 
      userId: req.user.id 
    });
    
    // Return more information about the session including creator_id
    res.status(201).json({ 
      sessionId,
      creator_id: req.user.id,
      quiz_id: quizId 
    });
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

  const session = await db.getAsync(
    `SELECT qs.*, q.questions, q.category, q.difficulty 
     FROM quiz_sessions qs 
     JOIN quizzes q ON qs.quiz_id = q.id 
     WHERE qs.id = ?`,
    [sessionId]
  );
  
  if (!session) {
    throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
  }
  
  logger.info('Session details retrieved successfully:', { 
    sessionId,
    userId: req.user.id 
  });
  
  res.json(session);
}));

// Debug route to check session ownership (add this for debugging)
router.get('/:id/debug', authenticateToken, asyncHandler(async (req, res, next) => {
  const sessionId = req.params.id;
  
  logger.debug('Debug request for session details:', { 
    sessionId,
    userId: req.user.id 
  });

  try {
    // Get detailed session information
    const session = await db.getAsync(
      `SELECT qs.*, q.questions, q.category, q.difficulty, u.username as creator_username
       FROM quiz_sessions qs 
       JOIN quizzes q ON qs.quiz_id = q.id 
       JOIN users u ON qs.creator_id = u.id
       WHERE qs.id = ?`,
      [sessionId]
    );
    
    if (!session) {
      throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
    }
    
    // Get players in the session
    const players = await db.allAsync(
      `SELECT qsp.user_id, u.username 
       FROM quiz_session_players qsp 
       JOIN users u ON qsp.user_id = u.id 
       WHERE qsp.session_id = ?`,
      [sessionId]
    );
    
    // Check if requesting user is creator
    const isCreator = session.creator_id === req.user.id;
    
    logger.info('Session details retrieved for debugging:', { 
      sessionId,
      requesterId: req.user.id,
      creatorId: session.creator_id,
      isCreator,
      playerCount: players.length
    });
    
    // Return detailed information
    res.json({
      session: {
        id: session.id,
        quiz_id: session.quiz_id,
        creator_id: session.creator_id,
        creator_username: session.creator_username,
        status: session.status,
        current_question: session.current_question,
        category: session.category,
        difficulty: session.difficulty
      },
      requestingUser: {
        id: req.user.id,
        isCreator
      },
      players: players
    });
  } catch (error) {
    logger.error('Failed to fetch session debug info:', {
      error: error.message,
      sessionId,
      userId: req.user.id
    });
    next(error);
  }
}));

// Get session players
router.get('/:id/players', authenticateToken, asyncHandler(async (req, res, next) => {
  const sessionId = req.params.id;
  
  logger.debug('Fetching session players:', { 
    sessionId,
    userId: req.user.id 
  });

  // Verify that the session exists
  const sessionExists = await db.getAsync('SELECT id FROM quiz_sessions WHERE id = ?', [sessionId]);
  
  if (!sessionExists) {
    throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
  }

  const players = await db.allAsync(
    `SELECT u.id, u.username 
     FROM quiz_session_players qsp 
     JOIN users u ON qsp.user_id = u.id 
     WHERE qsp.session_id = ?`,
    [sessionId]
  );
  
  logger.info('Session players retrieved successfully:', { 
    sessionId,
    playerCount: players.length 
  });
  
  res.json(players);
}));

// Get leaderboard
router.get('/leaderboard/global', asyncHandler(async (req, res, next) => {
  logger.debug('Fetching global leaderboard');

  const leaderboard = await db.allAsync(
    `SELECT u.username, SUM(s.score) as total_score 
     FROM scores s 
     JOIN users u ON s.user_id = u.id 
     GROUP BY u.id, u.username 
     ORDER BY total_score DESC 
     LIMIT 10`,
    []
  );
  
  logger.info('Global leaderboard retrieved successfully:', { 
    playerCount: leaderboard.length 
  });
  
  res.json(leaderboard);
}));

// Get user's sessions
router.get('/', authenticateToken, asyncHandler(async (req, res, next) => {
  logger.debug('Fetching user sessions:', { userId: req.user.id });

  const sessions = await db.allAsync(
    `SELECT qs.*, q.category, q.difficulty 
     FROM quiz_sessions qs 
     JOIN quizzes q ON qs.quiz_id = q.id 
     WHERE qs.creator_id = ?`,
    [req.user.id]
  );
  
  logger.info('User sessions retrieved successfully:', { 
    userId: req.user.id,
    sessionCount: sessions.length 
  });
  
  res.json(sessions);
}));

export default router;