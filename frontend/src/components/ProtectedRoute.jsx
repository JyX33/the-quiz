import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { isTokenExpired } from '../utils/auth';
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
    const verifyAuth = () => {
      const token = localStorage.getItem('token');
      
      if (!token || isTokenExpired(token)) {
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(true);
      }
      
      setIsLoading(false);
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