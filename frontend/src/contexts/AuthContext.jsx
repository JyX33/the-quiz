import PropTypes from 'prop-types';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../utils/axios';

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
      return true;
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        // Auth error - user not authenticated
        setUser(null);
        setIsAuthenticated(false);
      } else {
        // Network error or server error
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

  // Log out the user - now without navigate
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await api.post('/users/logout');
      setUser(null);
      setIsAuthenticated(false);
      // Navigation will happen in components that use this function
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      setAuthError('Failed to log out properly. Try clearing your cookies.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login function - now without navigate
  const login = useCallback(async (username, password) => {
    setIsLoading(true);
    try {
      const res = await api.post('/users/login', { username, password });
      
      // If user data is included in response
      if (res.data.user) {
        setUser(res.data.user);
        setIsAuthenticated(true);
        return { success: true, user: res.data.user };
      } 
      // Otherwise, fetch user data separately
      else {
        await checkAuth(true);
        return { success: true, user: user };
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
  }, [checkAuth, user]);

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