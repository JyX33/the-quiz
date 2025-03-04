// frontend/src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import api from '../utils/axios';
import { connectSocket, disconnectSocket } from '../socket';

// Create context
const AuthContext = createContext(null);

/**
 * AuthProvider component that manages authentication state for the entire app
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {React.ReactNode} - AuthProvider component
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Extract token from cookies helper function
  const extractTokenFromCookies = () => {
    try {
      const cookies = document.cookie.split(';');
      console.log('Cookies found:', cookies); // Debug cookies
      const socketTokenCookie = cookies.find(c => c.trim().startsWith('socket_token='));
      if (socketTokenCookie) {
        console.log('Socket token cookie found:', socketTokenCookie);
        return socketTokenCookie.split('=')[1];
      }
      return null;
    } catch (error) {
      console.error('Error extracting token from cookies:', error);
      return null;
    }
  };

  // Function to check authentication status
  const checkAuth = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
    }
    
    try {
      const res = await api.get('/users/me');
      setUser(res.data);
      setIsAuthenticated(true);
      setAuthError(null);
      
      // Connect socket with authentication
      // First try to get token from localStorage
      let token = localStorage.getItem('socket_token');
      
      // If no token in localStorage, try to extract from cookies
      if (!token) {
        token = extractTokenFromCookies();
        
        // If found in cookies, store in localStorage for future use
        if (token) {
          localStorage.setItem('socket_token', token);
        }
      }
      
      // Connect socket with the token
      if (token) {
        connectSocket(token);
        console.log('Connected socket after successful authentication');
      } else {
        console.warn('No token available for socket connection');
      }
      
      return true;
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        // Auth error - user not authenticated
        setUser(null);
        setIsAuthenticated(false);
        disconnectSocket(); // Disconnect socket on auth error
      } else {
        // Network error or server error
        console.error('Auth check error:', error);
        setAuthError(
          `Authentication service error: ${error.message || 'Unknown error'}`
        );
      }
      return false;
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, []);

  // Log out the user
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await api.post('/users/logout');
      setUser(null);
      setIsAuthenticated(false);
      
      // Clean up socket connection and token
      disconnectSocket();
      localStorage.removeItem('socket_token');
      
      // Clear any authentication cookies manually as well
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'socket_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      setAuthError('Failed to log out properly. Try clearing your cookies.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login function
  const login = useCallback(async (username, password) => {
    setIsLoading(true);
    
    try {
      const res = await api.post('/users/login', { username, password });
      
      // If user data is included in response
      if (res.data.user) {
        setUser(res.data.user);
        setIsAuthenticated(true);
        
        // Store socket token in localStorage for socket auth
        if (res.data.socket_token) {
          localStorage.setItem('socket_token', res.data.socket_token);
          console.log('Socket token stored in localStorage');
          
          // Connect socket with authentication after successful login
          const socketConnected = connectSocket(res.data.socket_token);
          console.log('Socket connection after login:', socketConnected ? 'successful' : 'failed');
        } else {
          console.error('No socket token received from server');
          
          // Try to extract token from cookies as fallback
          const cookieToken = extractTokenFromCookies();
          if (cookieToken) {
            localStorage.setItem('socket_token', cookieToken);
            connectSocket(cookieToken);
            console.log('Socket token extracted from cookies');
          }
        }
        
        return { success: true, user: res.data.user };
      }
      // Otherwise, fetch user data separately
      else {
        try {
          const userRes = await api.get('/users/me');
          setUser(userRes.data);
          setIsAuthenticated(true);
          
          // Try to extract token from cookies
          const tokenFromCookie = extractTokenFromCookies();
          if (tokenFromCookie) {
            localStorage.setItem('socket_token', tokenFromCookie);
            const socketConnected = connectSocket(tokenFromCookie);
            console.log('Socket connection using cookie token:', socketConnected ? 'successful' : 'failed');
          } else {
            // Try a general connect with any available token
            const socketConnected = connectSocket();
            console.log('Socket connection after login (alternative path):', 
                      socketConnected ? 'successful' : 'failed');
          }
          
          return { success: true, user: userRes.data };
        } catch (userError) {
          // If we can't get the user data, still return success but no user
          console.error('Error fetching user after login:', userError);
          return { success: true, user: null };
        }
      }
    } catch (error) {
      let errorMessage = 'Login failed';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return { 
        success: false, 
        error: errorMessage 
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Set up periodic auth check (every 5 minutes)
  useEffect(() => {
    let authCheckInterval;
    
    if (isAuthenticated) {
      authCheckInterval = setInterval(() => {
        checkAuth(true); // Silent check
      }, 5 * 60 * 1000); // 5 minutes
    }
    
    return () => {
      if (authCheckInterval) {
        clearInterval(authCheckInterval);
      }
    };
  }, [isAuthenticated, checkAuth]);

  // Initial auth check on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Context value
  const contextValue = {
    user,
    setUser,
    isAuthenticated,
    isLoading,
    authError,
    checkAuth,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};

/**
 * Custom hook to use authentication context
 * @returns {Object} Auth context value
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;