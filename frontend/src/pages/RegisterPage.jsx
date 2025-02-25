import api from '../utils/axios';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import FormInput from '../components/shared/FormInput';
import {
  Button,
  Card,
  PageContainer,
  Title,
} from '../components/shared/StyledComponents';
import { handleApiError } from '../utils/errorHandler';
import { validatePassword, validatePasswordConfirmation, validateUsername } from '../utils/validation';

const RegisterContainer = styled(PageContainer)`
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => `linear-gradient(135deg, ${theme.background.main} 0%, ${theme.background.accent} 100%)`};
`;

const RegisterCard = styled(Card)`
  max-width: 400px;
  width: 100%;
  margin: 2rem auto;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const PasswordStrengthMeter = styled.div`
  height: 4px;
  background: ${({ theme }) => `${theme.error}22`};
  border-radius: 2px;
  margin-top: ${({ theme }) => theme.spacing.xs};
  overflow: hidden;
`;

const PasswordStrengthBar = styled.div`
  height: 100%;
  width: ${({ strength }) => strength}%;
  background: ${({ theme, strength }) => {
    if (strength < 33) return theme.error;
    if (strength < 66) return theme.warning;
    return theme.success;
  }};
  transition: all 0.3s ease;
`;

const PasswordRequirements = styled.ul`
  list-style: none;
  padding: 0;
  margin: ${({ theme }) => `${theme.spacing.xs} 0`};
  font-size: 0.9rem;
  color: ${({ theme }) => theme.text.secondary};
`;

const Requirement = styled.li`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  margin-bottom: 2px;
  
  &:before {
    content: '${({ met }) => met ? '✓' : '○'}';
    color: ${({ theme, met }) => met ? theme.success : theme.text.secondary};
  }
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

const BackToLogin = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.text.secondary};
  font-size: 0.9rem;
  cursor: pointer;
  text-decoration: underline;
  margin-top: ${({ theme }) => theme.spacing.sm};
  
  &:hover {
    color: ${({ theme }) => theme.text.primary};
  }
`;

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const passwordRequirements = [
    { text: 'At least 8 characters long', test: pwd => pwd.length >= 8 },
    { text: 'Contains a number', test: pwd => /\d/.test(pwd) },
    { text: 'Contains an uppercase letter', test: pwd => /[A-Z]/.test(pwd) },
    { text: 'Contains a lowercase letter', test: pwd => /[a-z]/.test(pwd) },
    { text: 'Contains a special character', test: pwd => /[!@#$%^&*]/.test(pwd) },
  ];

  const getPasswordStrength = () => {
    const metRequirements = passwordRequirements.filter(req => req.test(password));
    return (metRequirements.length / passwordRequirements.length) * 100;
  };

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

    const confirmValidation = validatePasswordConfirmation(password, confirmPassword);
    if (!confirmValidation.isValid) {
      setError(confirmValidation.message);
      return false;
    }

    if (getPasswordStrength() < 60) {
      setError('Please create a stronger password');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setError('');
    setIsLoading(true);

    try {
      await api.post('/users/register', { 
        username, 
        password 
      });
      navigate('/');
    } catch (error) {
      handleApiError(error, setError, setIsLoading);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleRegister();
    }
  };

  return (
    <RegisterContainer>
      <RegisterCard>
        <Title>Create Account</Title>

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

        <div>
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
          <PasswordStrengthMeter>
            <PasswordStrengthBar strength={getPasswordStrength()} />
          </PasswordStrengthMeter>
          <PasswordRequirements>
            {passwordRequirements.map((req, index) => (
              <Requirement key={index} met={req.test(password)}>
                {req.text}
              </Requirement>
            ))}
          </PasswordRequirements>
        </div>

        <FormInput
          id="confirm-password"
          label="Confirm Password"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          onKeyPress={handleKeyPress}
          validator={(value) => validatePasswordConfirmation(password, value)}
          disabled={isLoading}
          required
        />

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <Button 
          onClick={handleRegister}
          disabled={isLoading}
        >
          {isLoading ? 'Creating account...' : 'Register'}
        </Button>

        <BackToLogin onClick={() => navigate('/')}>
          Already have an account? Login
        </BackToLogin>
      </RegisterCard>
    </RegisterContainer>
  );
};

export default RegisterPage;
