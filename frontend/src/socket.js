import { io } from 'socket.io-client';
import axios from './utils/axios';

// Create a function to get a fresh token
async function refreshSocketToken() {
  try {
    // Attempt to refresh the token
    await axios.post('/users/refresh-token');
    return true;
  } catch (error) {
    console.error('Failed to refresh token for socket connection', error.message);
    return false;
  }
}

// Initialize socket
const socket = io('http://localhost:5000', {
  autoConnect: false,
  withCredentials: true, // Important for cookies
});

// Handle connection errors
socket.on('connect_error', async (error) => {
  console.error('Socket connection error:', error.message);
  
  if (error.message === 'invalid token') {
    // Try to refresh the token and reconnect
    const refreshed = await refreshSocketToken();
    if (refreshed) {
      socket.connect();
    } else {
      // Redirect to login if token refresh fails
      window.location.href = '/';
    }
  }
});

// Connect socket when needed
export const connectSocket = () => {
  if (!socket.connected) {
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