import PropTypes from 'prop-types';
import { Navigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './shared/LoadingSpinner';

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: 20px;
  text-align: center;
`;

const ErrorMessage = styled.div`
  color: ${({ theme }) => theme.error};
  background: ${({ theme }) => `${theme.error}11`};
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius};
  margin-bottom: 20px;
  max-width: 600px;
`;

const RetryButton = styled.button`
  padding: 10px 16px;
  background: ${({ theme }) => theme.primary};
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  
  &:hover {
    background: ${({ theme }) => theme.button.hoverBg};
  }
`;

/**
 * Protected route component that checks for authentication
 * before rendering children. Redirects to login if not authenticated.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render when authenticated
 * @returns {React.ReactNode} - Protected route component
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading, authError, checkAuth } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Show error message if authentication check failed due to network issue
  if (authError) {
    return (
      <ErrorContainer>
        <ErrorMessage>
          <h2>Authentication Error</h2>
          <p>{authError}</p>
        </ErrorMessage>
        <RetryButton onClick={() => checkAuth()}>
          Retry Authentication
        </RetryButton>
      </ErrorContainer>
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