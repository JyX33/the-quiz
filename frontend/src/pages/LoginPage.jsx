// src/pages/LoginPage.jsx
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import FormInput from '../components/shared/FormInput';
import LoadingButton from '../components/shared/LoadingButton';
import {
  Card,
  PageContainer,
  Title,
} from '../components/shared/StyledComponents';
import { checkAuthentication } from '../utils/auth';
import api from '../utils/axios';
import { handleApiError } from '../utils/errorHandler';
import { validatePassword, validateUsername } from '../utils/validation';

const LoginCard = styled(Card)`
  max-width: 400px;
  width: 100%;
  margin: 2rem auto;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const ErrorMessage = styled.div`
  color: ${({ theme }) => theme.error};
  background: ${({ theme }) => `${theme.error}11`};
  padding: ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius};
  font-size: 0.9rem;
  text-align: center;
  animation: ${({ theme }) => theme.animation.pageTransition};
`;

const LoginContainer = styled(PageContainer)`
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => `linear-gradient(135deg, ${theme.background.main} 0%, ${theme.background.accent} 100%)`};
`;

const LoginPage = ({ setUser }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if user is already authenticated
  useEffect(() => {
    // Create abort controller to cancel request if component unmounts
    const abortController = new AbortController();
    
    const checkAuth = async () => {
      try {
        // Reset any previous redirect attempt tracking
        sessionStorage.setItem('redirectAttempts', '0');
        
        const isAuthenticated = await checkAuthentication();
        if (isAuthenticated) {
          // Get user data
          const userRes = await api.get('/users/me', { 
            signal: abortController.signal 
          });
          
          setUser(userRes.data);
          
          // Redirect to the intended destination or home
          const from = location.state?.from?.pathname || '/home';
          navigate(from, { replace: true });
        }
      } catch (error) {
        // Only handle if not aborted
        if (!abortController.signal.aborted) {
          // If it's not a 401/403 error, show it to the user
          if (error.response?.status !== 401 && error.response?.status !== 403) {
            setError('Error checking authentication status. Please try again.');
          }
        }
      } finally {
        // Only update state if not aborted
        if (!abortController.signal.aborted) {
          setIsCheckingAuth(false);
        }
      }
    };

    checkAuth();
    
    // Cleanup function
    return () => {
      abortController.abort();
    };
  }, [location, navigate, setUser]);

  const validateForm = () => {
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      setError(usernameValidation.message);
      return false;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.message);
      return false;
    }

    return true;
  };

  const handleLogin = async (e) => {
    // Prevent default form submission behavior
    if (e) e.preventDefault();
    
    if (!validateForm()) return;

    setError('');
    setIsLoading(true);

    try {
      // Reset any auth loop detection
      sessionStorage.setItem('redirectAttempts', '0');
      
      // Use the API utility that includes withCredentials
      const res = await api.post('/users/login', { username, password });
      
      // If the response includes user data directly, use it
      if (res.data.user) {
        setUser(res.data.user);
        navigate('/home');
      } else {
        // Token is handled via cookies now
        try {
          const userRes = await api.get('/users/me');
          setUser(userRes.data);
          navigate('/home');
        } catch (userError) {
          // If we can't get user data even after login
          handleApiError(userError, setError, setIsLoading);
        }
      }
    } catch (error) {
      handleApiError(error, setError, setIsLoading);
    }
  };

  if (isCheckingAuth) {
    return (
      <LoginContainer>
        <div>Checking authentication...</div>
      </LoginContainer>
    );
  }

  return (
    <LoginContainer>
      <LoginCard>
        <Title>Welcome Back</Title>
        
        {/* Wrap inputs in a form element and add onSubmit handler */}
        <form onSubmit={handleLogin}>
          <FormInput
            id="username"
            label="Username"
            value={username}
            onChange={setUsername}
            validator={validateUsername}
            disabled={isLoading}
            required
          />

          <FormInput
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            validator={validatePassword}
            disabled={isLoading}
            required
          />

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <ButtonGroup>
            <LoadingButton 
              type="submit"
              isLoading={isLoading}
              loadingText="Logging in..."
              style={{ flex: 1 }}
            >
              Login
            </LoadingButton>
            <LoadingButton 
              type="button"
              onClick={() => navigate('/register')} 
              $variant="secondary"
              disabled={isLoading}
              style={{ flex: 1 }}
            >
              Register
            </LoadingButton>
          </ButtonGroup>
        </form>
      </LoginCard>
    </LoginContainer>
  );
};

LoginPage.propTypes = {
  setUser: PropTypes.func.isRequired
};

export default LoginPage;