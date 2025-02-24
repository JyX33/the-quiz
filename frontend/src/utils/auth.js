/**
 * Auth utility functions for token handling and validation
 */
import axios from 'axios';

/**
 * Decodes and checks if a JWT token is expired
 * @param {string} token - JWT token to check
 * @returns {boolean} True if token is expired or invalid
 */
export const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    // Parse the token payload (second part of JWT)
    const payload = JSON.parse(atob(token.split('.')[1]));
    // Check if current time is past the expiration time
    return payload.exp * 1000 < Date.now();
  } catch (error) {
    console.error('Error decoding token:', error);
    return true;
  }
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
export const removeToken = () => {
  // Call logout endpoint to clear the cookie
  return axios.post('/api/users/logout');
};