import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true, // Important for cookies
});

// Initialize CSRF token
let csrfToken = null;

// Function to get CSRF token
const fetchCsrfToken = async () => {
  if (csrfToken) return csrfToken;
  
  try {
    // Use direct axios call instead of the api instance to avoid circular dependency
    const response = await axios.get('http://localhost:5000/api/csrf-token', {
      withCredentials: true
    });
    csrfToken = response.data.csrfToken;
    return csrfToken;
  } catch (error) {
    console.error('Failed to fetch CSRF token', error);
    return null;
  }
};

// Add request interceptor to include CSRF token
api.interceptors.request.use(async (config) => {
  // Skip CSRF for the token endpoint to avoid infinite loop
  if (config.url === '/csrf-token') {
    return config;
  }
  
  // Only add CSRF token for state-changing methods
  if (['post', 'put', 'delete'].includes(config.method)) {
    try {
      const token = await fetchCsrfToken();
      if (token) {
        config.headers['X-CSRF-Token'] = token;
      }
    } catch (error) {
      console.error('Error setting CSRF token:', error);
    }
  }
  
  return config;
});

export default api;