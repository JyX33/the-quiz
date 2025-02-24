import { useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styled from 'styled-components';
import {
  PageContainer,
  Title,
  Button,
  FormGroup,
  Card,
} from '../components/shared/StyledComponents';
import FormInput from '../components/shared/FormInput';
import { validateUsername, validatePassword } from '../utils/validation';

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
      const res = await axios.post('http://localhost:5000/api/users/login', { username, password });
      localStorage.setItem('token', res.data.token);
      
      const userRes = await axios.get('http://localhost:5000/api/users/me', {
        headers: { Authorization: `Bearer ${res.data.token}` },
      });
      
      setUser(userRes.data);
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
      setIsLoading(false);
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
          <Button 
            onClick={handleLogin} 
            disabled={isLoading}
            style={{ flex: 1 }}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
          <Button 
            onClick={() => navigate('/register')} 
            $variant="secondary"
            disabled={isLoading}
            style={{ flex: 1 }}
          >
            Register
          </Button>
        </ButtonGroup>
      </LoginCard>
    </LoginContainer>
  );
};

LoginPage.propTypes = {
  setUser: PropTypes.func.isRequired
};

export default LoginPage;