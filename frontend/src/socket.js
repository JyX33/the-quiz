// frontend/src/socket.js
import { io } from 'socket.io-client';
import { refreshToken } from './utils/auth';

// Get token from session storage
const getStoredToken = () => {
  try {
    const token = sessionStorage.getItem('socket_token');
    if (token) {
      // Only log the first few characters of the token for security
      const tokenPreview = token.substring(0, 10) + '...';
      console.log(`Found stored socket token: ${tokenPreview}`);
    } else {
      console.log('No socket token found in storage');
    }
    return token;
  } catch (error) {
    console.error('Error accessing session storage:', error);
    return null;
  }
};

// Initialize socket with auto-connect disabled to setup auth first
const socket = io('http://localhost:5000', {
  autoConnect: false, // Keep disabled until we set auth
  withCredentials: true // Important for cookies
  // Don't set headers here - we'll set them dynamically in connectSocket
});

// Socket will be connected externally by connectSocket function

// Handle connection errors with improved error handling
socket.on('connect_error', async (error) => {
  console.error('Socket connection error:', error.message);
  
  if (error.message === 'Authentication required' ||
      error.message === 'invalid token' ||
      error.message.includes('jwt')) {
    console.log('Token authentication failed, attempting to refresh token');
    
    // Try to refresh the token and reconnect
    const refreshed = await refreshToken();
    if (refreshed) {
      // Get the new token from storage
      const newToken = getStoredToken();
      if (newToken) {
        console.log('Token refreshed successfully, reconnecting socket');
        connectSocket(newToken);
      } else {
        console.error('No token available after refresh');
        window.location.href = '/';
      }
    } else {
      console.log('Token refresh failed, redirecting to login');
      window.location.href = '/';
    }
  }
});

// Log successful connection
socket.on('connect', () => {
  console.log('Socket connected successfully');
});

// Enhanced connect socket function with explicit token parameter
export const connectSocket = (token = null) => {
  // Use provided token or get from storage
  const authToken = token || getStoredToken();
  
  if (!authToken) {
    console.error('No authentication token available for socket connection');
    return false;
  }
  
  console.log('Setting up socket connection with auth token');
  
  // Always disconnect first to ensure clean state
  if (socket.connected) {
    socket.disconnect();
  }
  
  try {
    // Clear out old options
    delete socket.auth;
    
    // Set up new auth with token
    socket.auth = { token: authToken };
    
    console.log('Socket auth token set, connecting now');
    
    // Now connect
    socket.connect();
    return true;
  } catch (error) {
    console.error('Error setting up socket connection:', error);
    return false;
  }
};

// Enhanced disconnect function with token cleanup
export const disconnectSocket = () => {
  console.log('Disconnecting socket');
  try {
    if (socket.connected) {
      socket.disconnect();
    }
    // Clean up stored token
    sessionStorage.removeItem('socket_token');
    console.log('Socket disconnected and token cleaned up');
    return true;
  } catch (error) {
    console.error('Error during socket disconnect:', error);
    return false;
  }
};

// Check connection status
export const isSocketConnected = () => {
  return socket.connected;
};

// Socket event handler registration helper
export const onSocketEvent = (event, callback) => {
  socket.on(event, callback);
  // Return a function to remove the listener if needed
  return () => socket.off(event, callback);
};

// Setup socket reconnection functionality
socket.io.on("reconnect_attempt", (attempt) => {
  console.log(`Socket reconnection attempt: ${attempt}`);
  
  // Update authentication on reconnect attempts
  const token = getStoredToken();
  if (token) {
    socket.auth = { token };
    // Remove extraHeaders handling as we're using auth object exclusively
    console.log('Updated auth token for reconnection attempt');
  } else {
    console.log('No token available for reconnection');
  }
});

// Heartbeat mechanism with proper interval reference for cleanup
const heartbeatInterval = setInterval(() => {
  if (socket.connected) {
    socket.emit('heartbeat');
  }
}, 5000); // Emit heartbeat every 5 seconds

// Clean up interval and token on page unload
window.addEventListener('beforeunload', () => {
  clearInterval(heartbeatInterval);
  if (socket.connected) {
    socket.disconnect();
  }
  // Clean up stored token
  try {
    sessionStorage.removeItem('socket_token');
    console.log('Socket token cleaned up on unload');
  } catch (error) {
    console.error('Error cleaning up socket token:', error);
  }
});

export default socket;