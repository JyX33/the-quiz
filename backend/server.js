// Load environment variables from .env file
if (process.env.NODE_ENV !== 'production') {
  try {
    const dotenv = await import('dotenv');
    dotenv.default.config(); // Fix: Use .default.config() for ESM import
  } catch (error) {
    console.log('dotenv not available, using environment variables as is');
  }
}

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import http from 'http';
import morgan from 'morgan';
import { Server } from 'socket.io';
import config from './config/config.js';
import { logger, stream, initializeLogger } from './logger.js';
import db, { initDb } from './models/db.js';

// Initialize logger with db instance
initializeLogger(db);

// Import routes
import quizRoutes from './routes/quizzes.js';
import sessionRoutes from './routes/sessions.js';
import userRoutes from './routes/users.js';

// Import socket setup
import setupSockets from './sockets/index.js';

// Import error handling middleware
import csrf from 'csurf';
import { errorHandler, notFoundHandler } from './middleware/error.js';


// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Setup Morgan middleware with Winston stream
app.use(morgan(config.logging.morganFormat, { stream }));

// Log startup
logger.info('Server initialization started');
logger.info(`Using JWT_SECRET from environment: ${process.env.JWT_SECRET ? 'Yes' : 'No, using default'}`);

// Setup Socket.io with enhanced error handling and configuration
const io = new Server(server, {
  cors: {
    origin: config.corsOrigin,
    methods: config.socketMethods,
    credentials: true, // Allow cookies to be sent with requests
  },
  allowEIO3: true, // Allow Engine.IO v3 client to connect
  cookie: {
    name: "io",
    path: "/",
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production'
  },
  // Add pingTimeout and pingInterval configuration
  pingTimeout: 60000,
  pingInterval: 25000
});

// Improved error logging for socket connections
io.engine.on("connection_error", (err) => {
  logger.warn(`Socket.io connection error: ${err.code} - ${err.message}`, {
    code: err.code,
    message: err.message,
    context: err.context
  });
  // Prevent these errors from crashing the server
  // Just log them and continue
});

// Add global error handler for socket middleware
io.use((socket, next) => {
  try {
    // Continue to the next middleware
    next();
  } catch (error) {
    logger.error('Socket middleware error:', {
      error: error.message,
      socketId: socket.id
    });
    next(new Error('Internal server error'));
  }
});

// Middleware
const corsOptions = {
  origin: config.corsOrigin || 'http://localhost:5173',
  credentials: true, // Important for cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['X-CSRF-Token']
};

// Apply CORS to all routes
app.use(cors(corsOptions));

app.use(cookieParser()); // Add cookie-parser middleware before csrf

// Create CSRF protection middleware
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
});

// Apply to state-changing routes
app.use('/api/users/login', csrfProtection);
app.use('/api/users/register', csrfProtection);
app.use('/api/quizzes', csrfProtection);
app.use('/api/sessions', csrfProtection);

// Add route to get CSRF token
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/sessions', sessionRoutes);

// Initialize socket handlers
setupSockets(io);

// Error handling middleware - must be placed after routes
app.use(notFoundHandler); // Handle 404 errors for unmatched routes
app.use(errorHandler); // Global error handler

// Function to perform graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  // Close HTTP server (stop accepting new connections)
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  // Close Socket.IO connections
  io.close(() => {
    logger.info('Socket.IO connections closed');
  });
  
  // Close database connection
  db.close((err) => {
    if (err) {
      logger.error('Error closing database:', err);
    } else {
      logger.info('Database connection closed');
    }
    
    // Exit process after resources are closed
    logger.info('Graceful shutdown completed');
    process.exit(err ? 1 : 0);
  });
  
  // Force exit after timeout in case something hangs
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 5000); // 5 seconds timeout
};

// Initialize database before starting server
initDb().then(() => {
  // Start server
  server.listen(config.port, () => {
    logger.info(`Server running on port ${config.port}`);
  });
}).catch(err => {
  logger.error('Failed to initialize database:', err);
  process.exit(1);
});

// Handle process signals for graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions with graceful shutdown
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections without shutting down
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', {
    promise: promise.toString().substring(0, 100) + '...',
    reason: reason instanceof Error ? 
      { message: reason.message, stack: reason.stack } : 
      String(reason).substring(0, 200)
  });
  
  // Don't call gracefulShutdown - just log the error and continue
  // This prevents unhandled Socket.io errors from bringing down the server
  
  // If we determine it's a critical error that should cause a shutdown,
  // we can implement specific conditions here
  if (reason instanceof Error && 
      reason.message.includes('CRITICAL_DATABASE_FAILURE')) {
    logger.fatal('Critical error detected, initiating shutdown');
    gracefulShutdown('critical_error');
  }
});

// Handle uncaught exceptions - these are still serious enough to warrant shutdown
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack
  });
  gracefulShutdown('uncaughtException');
});