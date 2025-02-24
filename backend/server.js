// Load environment variables from .env file
if (process.env.NODE_ENV !== 'production') {
  try {
    const dotenv = await import('dotenv');
    dotenv.config();
  } catch (error) {
    console.log('dotenv not available, using environment variables as is');
  }
}

import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import morgan from 'morgan';
import config from './config/config.js';
import { logger, stream } from './logger.js';

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

// Start server
server.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`);
});

// Handle uncaught exceptions with graceful shutdown
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Attempt graceful shutdown
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Handle unhandled promise rejections with graceful shutdown
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Attempt graceful shutdown
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});