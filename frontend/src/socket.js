// frontend/src/socket.js
import { io } from 'socket.io-client';
import { refreshToken } from './utils/auth';

// Get token from localStorage
const getStoredToken = () => {
  try {
    // Try to get token from localStorage instead of sessionStorage
    const token = localStorage.getItem('socket_token');
    if (token) {
      const tokenPreview = token.substring(0, 10) + '...';
      console.log(`Found stored socket token: ${tokenPreview}`);
    } else {
      console.log('No socket token found in storage');
    }
    return token;
  } catch (error) {
    console.error('Error accessing localStorage:', error);
    return null;
  }
};

const socketUrl = import.meta.env.PROD 
  ? 'http://sg0k0k4g0sw0k8goos804ok8.82.29.170.182.sslip.io' // This will be your backend URL
  : 'http://localhost:5000';

const socket = io(socketUrl, {
  autoConnect: false,
  withCredentials: true, // Important for cookies
  reconnectionAttempts: 5, // Limit reconnection attempts
  reconnectionDelay: 1000, // Start with 1s delay
  reconnectionDelayMax: 5000, // Max 5s delay
  timeout: 10000 // 10s connection timeout
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
  
  // Store the token in localStorage for future use
  try {
    localStorage.setItem('socket_token', authToken);
  } catch (error) {
    console.error('Error storing socket token:', error);
  }
  
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
    localStorage.removeItem('socket_token');
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
    console.log('Updated auth token for reconnection attempt');
  } else {
    console.log('No token available for reconnection');
  }
});

// Add error handling for socket events
socket.on('error', (error) => {
  console.error('Socket error received:', error);
  
  // For unauthorized errors, try to refresh token and reconnect
  if (error.includes('Unauthorized') || error.includes('authentication')) {
    // Attempt to refresh the auth token
    refreshToken()
      .then(success => {
        if (success) {
          console.log('Token refreshed after error, reconnecting socket');
          connectSocket();
        } else {
          console.error('Failed to refresh token after error');
        }
      })
      .catch(err => {
        console.error('Error refreshing token after socket error:', err);
      });
  }
});

// Add a custom error handler for session errors
socket.on('session_error', (error) => {
  console.error('Session error received:', error);
  
  // You can add custom handling for different session errors here
  // For example, redirecting to home page for invalid sessions
  if (error.includes('not found') || error.includes('invalid')) {
    console.log('Invalid session, redirecting to home');
    window.location.href = '/home';
  }
});

// Add a general reconnection strategy
socket.io.on('reconnect_failed', () => {
  console.error('Socket reconnection failed after multiple attempts');
  // Consider showing a modal to the user suggesting they refresh the page
});

// Heartbeat mechanism with proper interval reference for cleanup
const heartbeatInterval = setInterval(() => {
  if (socket.connected) {
    socket.emit('heartbeat');
  }
}, 5000); // Emit heartbeat every 5 seconds

// Helper function to emit events with timeout
export const emitWithTimeout = (eventName, data, timeoutMs = 10000) => {
  return new Promise((resolve, reject) => {
    // Set timeout
    const timer = setTimeout(() => {
      reject(new Error(`Timeout while waiting for response to ${eventName}`));
    }, timeoutMs);
    
    // Listen for ack or response
    socket.emit(eventName, data, (response) => {
      clearTimeout(timer);
      
      if (response && response.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    });
  });
};

// Clean up interval and token on page unload
window.addEventListener('beforeunload', () => {
  clearInterval(heartbeatInterval);
  if (socket.connected) {
    socket.disconnect();
  }
  // We don't clean up the token on unload as we want it to persist between sessions
});

export default socket;