import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import api from '../utils/axios';
import LoadingSpinner from './shared/LoadingSpinner';

/**
 * Protected route component that checks for authentication
 * before rendering children. Redirects to login if not authenticated.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render when authenticated
 * @returns {React.ReactNode} - Protected route component
 */
const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const location = useLocation();

  useEffect(() => {
    // Create an abort controller to cancel the request if the component unmounts
    const abortController = new AbortController();
    
    const verifyAuth = async () => {
      try {
        // Check for redirect loop detection in sessionStorage
        const redirectAttempts = sessionStorage.getItem('redirectAttempts') || '0';
        const redirectTimestamp = sessionStorage.getItem('redirectTimestamp') || '0';
        const currentTime = Date.now();
        
        // If we've had multiple redirects in a short time period (last 2 seconds)
        if (parseInt(redirectAttempts) > 3 && 
            currentTime - parseInt(redirectTimestamp) < 2000) {
          console.error('Detected authentication redirect loop. Breaking loop.');
          setAuthError('Authentication service is having issues. Please try again later.');
          setIsLoading(false);
          return;
        }
        
        // Make auth verification request with abort signal
        await api.get('/users/me', { signal: abortController.signal });
        
        // Reset redirect attempts on successful auth
        sessionStorage.setItem('redirectAttempts', '0');
        setIsAuthenticated(true);
      } catch (error) {
        // Only handle errors if not aborted
        if (!abortController.signal.aborted) {
          console.log('Auth check failed:', error.message);
          
          // Track redirect attempts for loop detection
          const redirectAttempts = parseInt(sessionStorage.getItem('redirectAttempts') || '0');
          sessionStorage.setItem('redirectAttempts', (redirectAttempts + 1).toString());
          sessionStorage.setItem('redirectTimestamp', Date.now().toString());
          
          if (error.response?.status === 401 || error.response?.status === 403) {
            setIsAuthenticated(false);
          } else {
            // For network errors or other unexpected errors
            setAuthError(`Authentication check failed: ${error.message}`);
          }
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    verifyAuth();

    // Cleanup function to abort any in-flight requests
    return () => {
      abortController.abort();
    };
  }, []);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Show error message if authentication check failed due to network issue
  if (authError) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        padding: '20px',
        textAlign: 'center' 
      }}>
        <h2>Authentication Error</h2>
        <p>{authError}</p>
        <button 
          onClick={() => {
            // Reset redirect detection
            sessionStorage.setItem('redirectAttempts', '0');
            window.location.href = '/';
          }}
          style={{
            marginTop: '20px',
            padding: '10px 15px',
            background: '#0070dd',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Return to Login
        </button>
      </div>
    );
  }

  // Redirect to login if not authenticated, preserving the intended location
  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Render children if authenticated
  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ProtectedRoute;