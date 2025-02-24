import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import morgan from 'morgan';
import config from './config/config.js';
import { logger, stream } from './logger.js';

// Import routes
import userRoutes from './routes/users.js';
import quizRoutes from './routes/quizzes.js';
import sessionRoutes from './routes/sessions.js';

// Import socket setup
import setupSockets from './sockets/index.js';

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Setup Morgan middleware with Winston stream
app.use(morgan(config.logging.morganFormat, { stream }));

// Log startup
logger.info('Server initialization started');

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: config.corsOrigin,
    methods: config.socketMethods,
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/sessions', sessionRoutes);

// Initialize socket handlers
setupSockets(io);

// Start server
server.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
