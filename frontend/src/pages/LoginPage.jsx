// src/pages/LoginPage.jsx
import api from '../utils/axios';
import PropTypes from 'prop-types';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import FormInput from '../components/shared/FormInput';
import LoadingButton from '../components/shared/LoadingButton';
import {
  Card,
  PageContainer,
  Title,
} from '../components/shared/StyledComponents';
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
  const navigate = useNavigate();

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

  const handleLogin = async () => {
    if (!validateForm()) return;

    setError('');
    setIsLoading(true);

    try {
      // Use the API utility that includes withCredentials
      const res = await api.post('/users/login', { username, password });

      console.log('Login response:', res.data);
      console.log('Cookies after login:', document.cookie); // This will only show non-HttpOnly cookies
      
      // If the response includes user data directly, use it
      if (res.data.user) {
        setUser(res.data.user);
        navigate('/home');
      } else {
        // Token is handled via cookies now
        const userRes = await api.get('/users/me');
        
        setUser(userRes.data);
        navigate('/home');
      }
    } catch (error) {
      handleApiError(error, setError, setIsLoading);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <LoginContainer>
      <LoginCard>
        <Title>Welcome Back</Title>
        
        <FormInput
          id="username"
          label="Username"
          value={username}
          onChange={setUsername}
          onKeyPress={handleKeyPress}
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
          onKeyPress={handleKeyPress}
          validator={validatePassword}
          disabled={isLoading}
          required
        />

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <ButtonGroup>
          <LoadingButton 
            isLoading={isLoading}
            loadingText="Logging in..."
            onClick={handleLogin}
            style={{ flex: 1 }}
          >
            Login
          </LoadingButton>
          <LoadingButton 
            onClick={() => navigate('/register')} 
            $variant="secondary"
            disabled={isLoading}
            style={{ flex: 1 }}
          >
            Register
          </LoadingButton>
        </ButtonGroup>
      </LoginCard>
    </LoginContainer>
  );
};

LoginPage.propTypes = {
  setUser: PropTypes.func.isRequired
};

export default LoginPage;
