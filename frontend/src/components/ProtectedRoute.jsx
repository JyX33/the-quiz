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
  const location = useLocation();

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        // Make a request to verify authentication instead of checking localStorage
        await api.get('/users/me');
        setIsAuthenticated(true);
      } catch (error) {
        // If request fails, user is not authenticated
        setIsAuthenticated(false);
        console.error('Authentication check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    verifyAuth();
  }, []);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return <LoadingSpinner />;
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