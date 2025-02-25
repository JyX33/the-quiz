// frontend/src/socket.js
import { io } from 'socket.io-client';
import { refreshToken } from './utils/auth';

// Get token from cookie before initializing socket
const getTokenFromCookie = () => {
  return document.cookie.replace(/(?:(?:^|.*;\s*)token\s*=\s*([^;]*).*$)|^.*$/, "$1") || null;
};

// Initialize socket with auto-connect disabled to setup auth first
const socket = io('http://localhost:5000', {
  autoConnect: false, // Keep disabled until we set auth
  withCredentials: true, // Important for cookies
});

// Set auth token before connecting
const token = getTokenFromCookie();
if (token) {
  console.log('Setting auth token before connect');
  socket.auth = { token };
}

// Now connect
socket.connect();

// Handle connection errors
socket.on('connect_error', async (error) => {
  console.error('Socket connection error:', error.message);
  
  if (error.message === 'invalid token') {
    // Try to refresh the token and reconnect
    const refreshed = await refreshToken();
    if (refreshed) {
      socket.auth = { token: document.cookie.replace(/(?:(?:^|.*;\s*)token\s*=\s*([^;]*).*$)|^.*$/, "$1") }; 
      socket.connect();
    } else {
      // Redirect to login if token refresh fails
      window.location.href = '/';
    }
  }
});

// Log successful connection
socket.on('connect', () => {
  console.log('Socket connected successfully');
});

// Connect socket when needed
export const connectSocket = () => {
  if (!socket.connected) {
    // Set the auth token from cookie
    const token = getTokenFromCookie();
    if (token) {
      console.log('Refreshing auth token before reconnect');
      // Need to disconnect to update auth
      socket.disconnect();
      socket.auth = { token };
    }
    socket.connect();
  }
};

// Disconnect socket
export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

// Heartbeat mechanism
setInterval(() => {
  if (socket.connected) {
    socket.emit('heartbeat');
  }
}, 5000); // Emit heartbeat every 5 seconds

export default socket;