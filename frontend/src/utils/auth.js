/**
 * Auth utility functions for token handling and validation
 */

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

/**
 * Gets the current token and validates it
 * @returns {string|null} Valid token or null if no valid token exists
 */
export const getValidToken = () => {
  const token = localStorage.getItem('token');
  if (token && !isTokenExpired(token)) {
    return token;
  }
  return null;
};

/**
 * Removes the current token from storage
 */
export const removeToken = () => {
  localStorage.removeItem('token');
};