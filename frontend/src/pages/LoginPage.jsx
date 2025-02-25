// src/pages/LoginPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import FormInput from '../components/shared/FormInput';
import LoadingButton from '../components/shared/LoadingButton';
import {
  Card,
  PageContainer,
  Title,
} from '../components/shared/StyledComponents';
import { validatePassword, validateUsername } from '../utils/validation';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/shared/LoadingSpinner';

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

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const { isAuthenticated, isLoading, login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const from = location.state?.from?.pathname || '/home';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location, user]);

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
    setIsLoggingIn(true);

    try {
      // Use the login function from auth context
      const result = await login(username, password);
      
      if (result.success) {
        // Navigate on successful login
        navigate('/home');
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (error) {
      setError('An unexpected error occurred during login');
      console.error('Login error:', error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // If we're checking auth, show loading spinner
  if (isLoading && !isLoggingIn) {
    return (
      <LoginContainer>
        <LoadingSpinner />
      </LoginContainer>
    );
  }

  return (
    <LoginContainer>
      <LoginCard>
        <Title>Welcome Back</Title>
        
        <form onSubmit={handleLogin}>
          <FormInput
            id="username"
            label="Username"
            value={username}
            onChange={setUsername}
            validator={validateUsername}
            disabled={isLoggingIn}
            required
          />

          <FormInput
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            validator={validatePassword}
            disabled={isLoggingIn}
            required
          />

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <ButtonGroup>
            <LoadingButton 
              type="submit"
              isLoading={isLoggingIn}
              loadingText="Logging in..."
              style={{ flex: 1 }}
            >
              Login
            </LoadingButton>
            <LoadingButton 
              type="button"
              onClick={() => navigate('/register')} 
              $variant="secondary"
              disabled={isLoggingIn}
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

export default LoginPage;