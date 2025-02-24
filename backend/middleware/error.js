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
  // Convert all errors to AppError format
  const appError = err.isOperational 
    ? err 
    : new AppError(
        err.message || 'Something went wrong',
        err.status || 500,
        err.code || 'SERVER_ERROR'
      );
  
  // Log error based on whether it's operational or not
  if (appError.isOperational) {
    logger.warn(`${appError.statusCode} - ${appError.message}`, {
      path: req.path,
      method: req.method,
      ip: req.ip,
      errorCode: appError.errorCode,
      userId: req.user?.id
    });
  } else {
    logger.error(`${appError.statusCode} - ${appError.message}`, {
      path: req.path,
      method: req.method,
      ip: req.ip,
      errorStack: err.stack,
      userId: req.user?.id
    });
  }
  
  // Send standardized error response
  res.status(appError.statusCode).json({
    status: 'error',
    statusCode: appError.statusCode,
    message: appError.message,
    code: appError.errorCode,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
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