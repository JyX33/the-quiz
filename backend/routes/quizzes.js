import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger, logUserAction } from '../logger.js';
import { authenticateToken } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/error.js';
import db, { runTransactionAsync } from '../models/db.js';

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
    await runTransactionAsync(async () => {
      // Insert quiz using promise-based approach
      await db.runAsync(
        'INSERT INTO quizzes (id, creator_id, questions, category, difficulty) VALUES (?, ?, ?, ?, ?)',
        [quizId, req.user.id, JSON.stringify(questions), category, difficulty]
      );
      
      // Log the action within the transaction
      await logUserAction(req.user.id, 'create_quiz');
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

// Get user's quizzes with pagination
router.get('/', authenticateToken, asyncHandler(async (req, res, next) => {
  // Parse pagination parameters
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  // Validate pagination parameters
  if (page < 1 || limit < 1 || limit > 100) {
    throw new AppError('Invalid pagination parameters', 400, 'VALIDATION_ERROR');
  }
  
  // Calculate offset
  const offset = (page - 1) * limit;
  
  logger.debug('Fetching user quizzes with pagination:', { 
    userId: req.user.id,
    page,
    limit,
    offset
  });

  try {
    // Get total count for pagination info
    const countResult = await db.getAsync(
      'SELECT COUNT(*) as total FROM quizzes WHERE creator_id = ?',
      [req.user.id]
    );
    
    const total = countResult ? countResult.total : 0;
    const totalPages = Math.ceil(total / limit);
    
    // Get quizzes with pagination
    const quizzes = await db.allAsync(
      'SELECT id, category, difficulty FROM quizzes WHERE creator_id = ? LIMIT ? OFFSET ?',
      [req.user.id, limit, offset]
    );
    
    logger.info('User quizzes retrieved with pagination:', { 
      userId: req.user.id, 
      quizCount: quizzes.length,
      page,
      totalPages,
      total
    });
    
    // Return paginated response
    res.json({
      data: quizzes,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    logger.error('Failed to fetch quizzes:', {
      error: error.message,
      userId: req.user.id
    });
    throw new AppError('Failed to fetch quizzes', 500, 'DATABASE_ERROR');
  }
}));

// Get quiz by ID
router.get('/:id', authenticateToken, asyncHandler(async (req, res, next) => {
  const quizId = req.params.id;
  
  logger.debug('Fetching quiz by ID:', { 
    quizId,
    userId: req.user.id 
  });

  try {
    const quiz = await db.getAsync(
      'SELECT id, creator_id, questions, category, difficulty FROM quizzes WHERE id = ?',
      [quizId]
    );
    
    if (!quiz) {
      throw new AppError('Quiz not found', 404, 'QUIZ_NOT_FOUND');
    }
    
    logger.info('Quiz retrieved successfully:', { 
      quizId,
      userId: req.user.id 
    });
    
    res.json(quiz);
  } catch (error) {
    logger.error('Failed to fetch quiz:', {
      error: error.message,
      quizId,
      userId: req.user.id
    });
    throw new AppError('Failed to fetch quiz', 500, 'DATABASE_ERROR');
  }
}));

// Delete quiz
router.delete('/:id', authenticateToken, asyncHandler(async (req, res, next) => {
  const quizId = req.params.id;
  
  logger.debug('Deleting quiz:', { 
    quizId,
    userId: req.user.id 
  });

  try {
    // Check if quiz exists and belongs to user
    const quiz = await db.getAsync(
      'SELECT id, creator_id FROM quizzes WHERE id = ?',
      [quizId]
    );
    
    if (!quiz) {
      throw new AppError('Quiz not found', 404, 'QUIZ_NOT_FOUND');
    }
    
    if (quiz.creator_id !== req.user.id) {
      throw new AppError('You do not have permission to delete this quiz', 403, 'PERMISSION_DENIED');
    }
    
    // Use transaction to ensure quiz deletion and logging happens atomically
    await runTransactionAsync(async () => {
      // Delete any related sessions
      await db.runAsync(
        'DELETE FROM quiz_sessions WHERE quiz_id = ?',
        [quizId]
      );
      
      // Delete the quiz
      await db.runAsync(
        'DELETE FROM quizzes WHERE id = ?',
        [quizId]
      );
      
      // Log the action within the transaction
      await logUserAction(req.user.id, 'delete_quiz');
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
