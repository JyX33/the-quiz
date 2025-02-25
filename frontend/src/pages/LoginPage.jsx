// src/pages/LoginPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import FormInput from '../components/shared/FormInput';
import LoadingButton from '../components/shared/LoadingButton';
import Form from '../components/shared/Form';
import {
  Card,
  PageContainer,
  Title,
} from '../components/shared/StyledComponents';
import { validatePassword, validateUsername } from '../utils/validation';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { refreshCsrfToken } from '../utils/axios';

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

  // Refresh CSRF token on component mount
  useEffect(() => {
    refreshCsrfToken();
  }, []);

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
      return { valid: false, error: usernameValidation.message };
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return { valid: false, error: passwordValidation.message };
    }

    return { valid: true };
  };

  const handleLogin = async (e) => {
    const validation = validateForm();
    if (!validation.valid) {
      console.log(validation.error, e);
      setError(validation.error);
      return;
    }

    setError('');
    setIsLoggingIn(true);

    try {
      // Ensure fresh CSRF token
      await refreshCsrfToken();
      
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
        
        <Form onSubmit={handleLogin} error={error}>
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
        </Form>
      </LoginCard>
    </LoginContainer>
  );
};

export default LoginPage;