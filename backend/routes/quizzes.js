import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db, { runTransaction } from '../models/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { logAction } from '../models/logger.js';
import { logger } from '../logger.js';
import { asyncHandler, AppError } from '../middleware/error.js';

const router = express.Router();

// Create a new quiz
router.post('/', authenticateToken, asyncHandler(async (req, res, next) => {
  const { questions, category, difficulty } = req.body;
  
  // Input validation
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    throw new AppError('Quiz must have at least one question', 400, 'VALIDATION_ERROR');
  }
  
  if (!category) {
    throw new AppError('Category is required', 400, 'VALIDATION_ERROR');
  }
  
  if (!difficulty) {
    throw new AppError('Difficulty is required', 400, 'VALIDATION_ERROR');
  }
  
  const quizId = uuidv4();
  
  logger.debug('Creating new quiz:', { 
    userId: req.user.id, 
    category, 
    difficulty,
    questionCount: questions.length 
  });

  try {
    // Use transaction to ensure quiz creation and logging happens atomically
    await runTransaction(() => {
      return new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO quizzes (id, creator_id, questions, category, difficulty) VALUES (?, ?, ?, ?, ?)',
          [quizId, req.user.id, JSON.stringify(questions), category, difficulty],
          function (err) {
            if (err) reject(err);
            else {
              // Log the action within the transaction
              db.run(
                'INSERT INTO logs (user_id, action) VALUES (?, ?)',
                [req.user.id, 'create_quiz'],
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
    
    logger.info('Quiz created successfully:', { quizId, userId: req.user.id });
    res.status(201).json({ quizId });
  } catch (error) {
    logger.error('Failed to create quiz:', {
      error: error.message,
      userId: req.user.id
    });
    throw new AppError('Failed to create quiz', 500, 'QUIZ_CREATION_ERROR');
  }
}));

// Get user's quizzes
router.get('/', authenticateToken, asyncHandler(async (req, res, next) => {
  logger.debug('Fetching user quizzes:', { userId: req.user.id });

  const quizzes = await new Promise((resolve, reject) => {
    db.all(
      'SELECT id, category, difficulty FROM quizzes WHERE creator_id = ?',
      [req.user.id],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
  
  logger.info('User quizzes retrieved:', { 
    userId: req.user.id, 
    quizCount: quizzes.length 
  });
  
  res.json(quizzes);
}));

// Get quiz by ID
router.get('/:id', authenticateToken, asyncHandler(async (req, res, next) => {
  const quizId = req.params.id;
  
  logger.debug('Fetching quiz by ID:', { 
    quizId,
    userId: req.user.id 
  });

  const quiz = await new Promise((resolve, reject) => {
    db.get(
      'SELECT id, creator_id, questions, category, difficulty FROM quizzes WHERE id = ?',
      [quizId],
      (err, quiz) => {
        if (err) reject(err);
        else resolve(quiz);
      }
    );
  });
  
  if (!quiz) {
    throw new AppError('Quiz not found', 404, 'QUIZ_NOT_FOUND');
  }
  
  logger.info('Quiz retrieved successfully:', { 
    quizId,
    userId: req.user.id 
  });
  
  res.json(quiz);
}));

// Delete quiz
router.delete('/:id', authenticateToken, asyncHandler(async (req, res, next) => {
  const quizId = req.params.id;
  
  logger.debug('Deleting quiz:', { 
    quizId,
    userId: req.user.id 
  });

  // Check if quiz exists and belongs to user
  const quiz = await new Promise((resolve, reject) => {
    db.get(
      'SELECT id, creator_id FROM quizzes WHERE id = ?',
      [quizId],
      (err, quiz) => {
        if (err) reject(err);
        else resolve(quiz);
      }
    );
  });
  
  if (!quiz) {
    throw new AppError('Quiz not found', 404, 'QUIZ_NOT_FOUND');
  }
  
  if (quiz.creator_id !== req.user.id) {
    throw new AppError('You do not have permission to delete this quiz', 403, 'PERMISSION_DENIED');
  }
  
  try {
    // Use transaction to ensure quiz deletion and logging happens atomically
    await runTransaction(() => {
      return new Promise((resolve, reject) => {
        // Delete any related sessions
        db.run(
          'DELETE FROM quiz_sessions WHERE quiz_id = ?',
          [quizId],
          function (err) {
            if (err) reject(err);
            else {
              // Delete the quiz
              db.run(
                'DELETE FROM quizzes WHERE id = ?',
                [quizId],
                function (err) {
                  if (err) reject(err);
                  else {
                    // Log the action within the transaction
                    db.run(
                      'INSERT INTO logs (user_id, action) VALUES (?, ?)',
                      [req.user.id, 'delete_quiz'],
                      (err) => {
                        if (err) reject(err);
                        else resolve();
                      }
                    );
                  }
                }
              );
            }
          }
        );
      });
    });
    
    logger.info('Quiz deleted successfully:', { quizId, userId: req.user.id });
    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete quiz:', {
      error: error.message,
      quizId,
      userId: req.user.id
    });
    throw new AppError('Failed to delete quiz', 500, 'QUIZ_DELETION_ERROR');
  }
}));

export default router;