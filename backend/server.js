// Load environment variables from .env file
if (process.env.NODE_ENV !== 'production') {
  try {
    const dotenv = await import('dotenv');
    dotenv.config();
  } catch (error) {
    console.log('dotenv not available, using environment variables as is');
  }
}

import csrf from 'csurf';

// Setup CSRF middleware with cookies
const csrfProtection = csrf({ cookie: true });

// Apply to state-changing routes
app.use('/api/users/login', csrfProtection);
app.use('/api/users/register', csrfProtection);
app.use('/api/quizzes', csrfProtection);
app.use('/api/sessions', csrfProtection);

// Add route to get CSRF token
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import morgan from 'morgan';
import config from './config/config.js';
import { logger, stream } from './logger.js';
import db from './models/db.js';

// Try loading cookie-parser (it might not be installed yet)
let cookieParser;
try {
  cookieParser = (await import('cookie-parser')).default;
} catch (error) {
  logger.warn('cookie-parser not available, cookie authentication will not work');
  cookieParser = (req, res, next) => next(); // Fallback middleware that does nothing
}

// Import routes
import userRoutes from './routes/users.js';
import quizRoutes from './routes/quizzes.js';
import sessionRoutes from './routes/sessions.js';

// Import socket setup
import setupSockets from './sockets/index.js';

// Import error handling middleware
import { errorHandler, notFoundHandler } from './middleware/error.js';

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Setup Morgan middleware with Winston stream
app.use(morgan(config.logging.morganFormat, { stream }));

// Log startup
logger.info('Server initialization started');
logger.info(`Using JWT_SECRET from environment: ${process.env.JWT_SECRET ? 'Yes' : 'No, using default'}`);

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: config.corsOrigin,
    methods: config.socketMethods,
    credentials: true, // Allow cookies to be sent with requests
  },
});

// Middleware
app.use(cors({ 
  origin: config.corsOrigin,
  credentials: true, // Enable CORS with credentials
}));
app.use(express.json());
app.use(cookieParser()); // Add cookie-parser middleware

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

// Start server
server.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`);
});

// Handle process signals for graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions with graceful shutdown
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections with graceful shutdown
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});