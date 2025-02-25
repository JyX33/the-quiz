/**
 * Auth utility functions for token handling and validation
 */
import api from './axios';

export const isTokenExpired = () => {
  // With HttpOnly cookies, we can't check token expiration on the client side
  // We'll rely on the server's verification
  return false;
};

// Update to work with cookies instead of localStorage
export const getValidToken = () => {
  // With HttpOnly cookies, we can't access the token directly
  // Instead, we'll use a separate endpoint to check authentication
  return true; // Just return true, the cookie will be sent automatically
};

/**
 * Removes the current token from storage
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
