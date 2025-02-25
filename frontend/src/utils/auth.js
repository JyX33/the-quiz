/**
 * Auth utility functions for token handling and validation
 */
import api from './axios';

/**
 * Checks if the user has a valid authentication session
 * @returns {Promise<boolean>} True if user is authenticated
 */
export const checkAuthentication = async () => {
  try {
    // Add a timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    await api.get('/users/me', { signal: controller.signal });
    clearTimeout(timeoutId);
    return true;
  } catch (error) {
    // Check if it's a normal auth error (401/403) vs. a network/timeout error
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      return false;
    }
    
    // For network errors, throw to allow custom handling
    if (error.name === 'AbortError') {
      throw new Error('Authentication check timed out');
    } else if (error.code === 'ERR_NETWORK') {
      throw new Error('Network error during authentication');
    }
    
    return false;
  }
};



/**
 * Removes the current token from storage
 * @returns {Promise<boolean>} Success status
 */
export const removeToken = async () => {
  // Call the logout endpoint to clear the cookie
  try {
    await api.post('/users/logout');
    
    // Reset redirect attempts tracking
    sessionStorage.setItem('redirectAttempts', '0');
    return true;
  } catch (error) {
    console.error('Error logging out:', error);
    return false;
  }
};

/**
 * Refreshes the authentication token
 * @returns {Promise<boolean>} Success status
 */
export const refreshToken = async () => {
  try {
    await api.post('/users/refresh-token');
    return true;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return false;
  }
};

/**
 * Get the current redirect attempt count
 * @returns {number} Current redirect attempt count
 */
export const getRedirectAttempts = () => {
  return parseInt(sessionStorage.getItem('redirectAttempts') || '0');
};

/**
 * Increment redirect attempt counter
 */
export const incrementRedirectAttempts = () => {
  const current = getRedirectAttempts();
  sessionStorage.setItem('redirectAttempts', (current + 1).toString());
  sessionStorage.setItem('redirectTimestamp', Date.now().toString());
};

/**
 * Check if we're in a redirect loop
 * @returns {boolean} True if in a redirect loop
 */
export const isInRedirectLoop = () => {
  const attempts = getRedirectAttempts();
  const timestamp = parseInt(sessionStorage.getItem('redirectTimestamp') || '0');
  const currentTime = Date.now();
  
  // If we've had multiple redirects in a short time period (last 3 seconds)
  return attempts > 3 && currentTime - timestamp < 3000;
};