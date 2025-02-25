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
    await api.get('/users/me');
    return true;
  } catch (error) {
    console.error('Error checking authentication:', error);
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