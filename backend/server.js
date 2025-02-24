const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const config = require('./config/config');

// Import routes
const userRoutes = require('./routes/users');
const quizRoutes = require('./routes/quizzes');
const sessionRoutes = require('./routes/sessions');

// Import socket setup
const setupSockets = require('./sockets');

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

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
  console.log(`Server running on port ${config.port}`);
});
