import { logger } from '../logger.js';

// Custom error class for application errors
export class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true; // indicates this is an expected error
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handler middleware
export const errorHandler = (err, req, res, next) => {
  // Default status code and error message
  let statusCode = err.statusCode || 500;
  let errorMessage = err.message || 'Something went wrong';
  let errorCode = err.errorCode || null;
  
  // Determine if this is a known operational error or an unexpected error
  const isOperational = err.isOperational || false;
  
  // Log error based on whether it's operational or not
  if (isOperational) {
    // Expected error - log as warning
    logger.warn(`${statusCode} - ${errorMessage}`, {
      path: req.path,
      method: req.method,
      ip: req.ip,
      errorCode,
      userId: req.user?.id
    });
  } else {
    // Unexpected error - log as error with stack trace
    logger.error(`${statusCode} - ${errorMessage}`, {
      path: req.path,
      method: req.method,
      ip: req.ip,
      errorStack: err.stack,
      userId: req.user?.id
    });
  }
  
  // Send standardized error response
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message: errorMessage,
    ...(errorCode && { code: errorCode }), // Include errorCode only if it exists
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }) // Include stack trace in development
  });
};

// Not Found handler
export const notFoundHandler = (req, res, next) => {
  const err = new AppError(`Not Found - ${req.originalUrl}`, 404, 'RESOURCE_NOT_FOUND');
  next(err);
};

// Handle async errors without try/catch in every route
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};