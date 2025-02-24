import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true // Important for cookies
});

// Add request interceptor to include CSRF token
let csrfToken = null;

api.interceptors.request.use(async (config) => {
  // Skip for CSRF token endpoint to avoid infinite loop
  if (config.url === '/csrf-token') {
    return config;
  }
  
  // Get CSRF token if we don't have it yet
  if (!csrfToken) {
    try {
      const response = await axios.get('http://localhost:5000/api/csrf-token', { withCredentials: true });
      csrfToken = response.data.csrfToken;
    } catch (error) {
      console.error('Failed to fetch CSRF token', error);
    }
  }
  
  // Add CSRF token to request headers
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  
  return config;
});

export default api;