import axios from 'axios';

// Create axios instance
const apiBaseUrl = import.meta.env.PROD 
  ? 'http://backend-service:5000/api' // This will be your backend URL
  : 'http://localhost:5000/api';

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

// Initialize CSRF token and timestamp
let csrfToken = null;
let csrfTokenTimestamp = null;
const CSRF_TOKEN_MAX_AGE = 30 * 60 * 1000; // 30 minutes
const MAX_RETRIES = 2;

/**
 * Function to get a fresh CSRF token 
 */
const fetchCsrfToken = async () => {
  try {
    // Use direct axios call instead of the api instance to avoid circular dependency
    const response = await axios.get('http://backend-service:5000/api/csrf-token', {
      withCredentials: true
    });
    csrfToken = response.data.csrfToken;
    csrfTokenTimestamp = Date.now();
    return csrfToken;
  } catch (error) {
    console.error('Failed to fetch CSRF token', error);
    throw error; // Re-throw to let caller handle
  }
};

/**
 * Check if the CSRF token has expired or is close to expiry
 */
const isTokenExpired = () => {
  if (!csrfTokenTimestamp) return true;
  
  const tokenAge = Date.now() - csrfTokenTimestamp;
  // Consider token expired if it's older than max age or close to it (within 1 minute)
  return tokenAge > (CSRF_TOKEN_MAX_AGE - 60000);
};

/**
 * Request interceptor that ensures CSRF token is present and fresh for state-changing methods
 */
api.interceptors.request.use(async (config) => {
  // Only add CSRF token for state-changing methods
  if (['post', 'put', 'delete', 'patch'].includes(config.method)) {
    
    // Skip CSRF for the token endpoint to avoid infinite loop
    if (config.url === '/csrf-token') {
      return config;
    }
    
    try {
      // If token doesn't exist or is about to expire, get a new one
      if (!csrfToken || isTokenExpired()) {
        csrfToken = await fetchCsrfToken();
      }
      
      // Set the CSRF token header
      config.headers['X-CSRF-Token'] = csrfToken;
    } catch (error) {
      console.error('Error setting CSRF token:', error);
      // Continue without CSRF token, backend will reject if needed
    }
  }
  
  return config;
});

/**
 * Response interceptor that handles CSRF token errors and retries requests
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Extract config and retry state
    const originalRequest = error.config;
    const retryCount = originalRequest._retryCount || 0;
    
    // Check if error is due to CSRF token issues and we haven't maxed out retries
    if (
      error.response?.status === 403 && 
      error.response?.data?.code === 'INVALID_CSRF_TOKEN' && 
      retryCount < MAX_RETRIES
    ) {
      try {
        // Increment retry counter
        originalRequest._retryCount = retryCount + 1;
        
        // Get fresh CSRF token
        await fetchCsrfToken();
        
        // Update token in the original request
        originalRequest.headers['X-CSRF-Token'] = csrfToken;
        
        // Retry the request
        return api(originalRequest);
      } catch (refreshError) {
        console.error('Failed to refresh CSRF token for retry', refreshError);
        return Promise.reject(error);
      }
    }
    
    // If not CSRF error or max retries reached, reject with original error
    return Promise.reject(error);
  }
);

/**
 * Manual method to refresh CSRF token
 * Useful for components that need a guaranteed fresh token
 */
export const refreshCsrfToken = async () => {
  try {
    await fetchCsrfToken();
    return true;
  } catch (error) {
    console.error('Failed to manually refresh CSRF token', error);
    return false;
  }
};

export default api;