// src/utils/errorHandler.js
import axios from 'axios';

/**
 * Utility for handling API errors consistently
 * 
 * @param {Error} error - The error object
 * @param {Function} setError - State setter for error message
 * @param {Function} setIsLoading - Optional state setter for loading state
 * @returns {string} The formatted error message
 */
export const handleApiError = (error, setError, setIsLoading = null) => {
  // Reset loading state if provided
  if (setIsLoading) {
    setIsLoading(false);
  }
  
  // Handle Axios errors specifically
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const errorMessage = error.response?.data?.message || 'Network error occurred';
    
    // Handle specific status codes
    if (status === 401 || status === 403) {
      setError('Authentication error: ' + errorMessage);
    } else if (status === 404) {
      setError('Resource not found: ' + errorMessage);
    } else if (status === 422 || status === 400) {
      setError('Validation error: ' + errorMessage);
    } else if (status === 429) {
      setError('Too many requests. Please try again later.');
    } else if (status >= 500) {
      setError('Server error. Please try again later.');
    } else {
      setError(errorMessage);
    }
    
    return errorMessage;
  } else {
    // Handle non-Axios errors
    const message = error.message || 'An unexpected error occurred';
    setError(message);
    console.error('Unexpected error:', error);
    return message;
  }
};