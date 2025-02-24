import { io } from 'socket.io-client';
import { getValidToken } from './utils/auth';

// Initialize socket with authentication
const socket = io('http://localhost:5000', {
  auth: {
    token: getValidToken(),
  },
  // Reconnect on token refresh or network issues
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Update token on reconnection attempts
socket.on('reconnect_attempt', () => {
  socket.auth = { token: getValidToken() };
});

// Handle authentication errors
socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error.message);
  
  // If error is due to invalid token, we could handle this specifically
  if (error.message === 'invalid token') {
    console.error('Authentication failed: Invalid token');
  }
});

// Heartbeat mechanism
setInterval(() => {
  if (socket.connected) {
    socket.emit('heartbeat');
  }
}, 5000); // Emit heartbeat every 5 seconds

export default socket;