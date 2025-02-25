import api, { refreshCsrfToken } from '../utils/axios';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import FormInput from '../components/shared/FormInput';
import LoadingButton from '../components/shared/LoadingButton';
import Form from '../components/shared/Form';
import {
  Card,
  PageContainer,
  Title,
} from '../components/shared/StyledComponents';
import { validatePassword, validatePasswordConfirmation, validateUsername } from '../utils/validation';
import { executeAsync} from '../utils/asyncUtils';

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

/**
 * RegisterPage component with standardized async patterns
 */
const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(null);
  const navigate = useNavigate();

  // Refresh CSRF token on component mount
  useEffect(() => {
    return safeAsyncEffect(
      () => refreshCsrfToken(),
      () => {}, // No action needed on success
      (error) => console.error('Failed to refresh CSRF token:', error)
    );
  }, []);

  // Handle redirect countdown
  useEffect(() => {
    let timer;
    if (redirectCountdown !== null && redirectCountdown > 0) {
      timer = setTimeout(() => {
        setRedirectCountdown(redirectCountdown - 1);
      }, 1000);
    } else if (redirectCountdown === 0) {
      navigate('/');
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [redirectCountdown, navigate]);

  const passwordRequirements = [
    { text: 'At least 8 characters long', test: pwd => pwd.length >= 8 },
    { text: 'Contains a number', test: pwd => /\d/.test(pwd) },
    { text: 'Contains an uppercase letter', test: pwd => /[A-Z]/.test(pwd) },
    { text: 'Contains a lowercase letter', test: pwd => /[a-z]/.test(pwd) },
    { text: 'Contains a special character', test: pwd => /[!@#$%^&*]/.test(pwd) },
  ];

  const getPasswordStrength = () => {
    if (!password) return 0;
    const metRequirements = passwordRequirements.filter(req => req.test(password)).length;
    return (metRequirements / passwordRequirements.length) * 100;
  };

  const validateForm = () => {
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      return { valid: false, error: usernameValidation.message };
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return { valid: false, error: passwordValidation.message };
    }

    const confirmValidation = validatePasswordConfirmation(password, confirmPassword);
    if (!confirmValidation.isValid) {
      return { valid: false, error: confirmValidation.message };
    }

    if (getPasswordStrength() < 60) {
      return { valid: false, error: 'Please create a stronger password' };
    }

    return { valid: true };
  };

  const handleRegister = async () => {
    // Validate form
    const validation = validateForm();
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    // Use standardized executeAsync utility
    await executeAsync(
      async () => {
        // Refresh CSRF token first
        await refreshCsrfToken();
        
        // Perform registration
        return await api.post('/users/register', { 
          username, 
          password 
        });
      },
      setIsLoading,
      setError,
      setSuccess,
      {
        onSuccess: () => {
          setSuccess('Account created successfully! Redirecting to login in 3 seconds...');
          setRedirectCountdown(3);
        }
      }
    );
  };

  return (
    <RegisterContainer>
      <RegisterCard>
        <Title>Create Account</Title>
        
        <Form 
          onSubmit={handleRegister}
          error={error}
          success={success}
        >
          <FormInput
            id="username"
            label="Username"
            value={username}
            onChange={setUsername}
            validator={validateUsername}
            disabled={isLoading || redirectCountdown !== null}
            required
          />

          <div>
            <FormInput
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              validator={validatePassword}
              disabled={isLoading || redirectCountdown !== null}
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
            validator={(value) => validatePasswordConfirmation(password, value)}
            disabled={isLoading || redirectCountdown !== null}
            required
          />

          <LoadingButton 
            type="submit"
            isLoading={isLoading}
            loadingText="Creating account..."
            disabled={isLoading || redirectCountdown !== null}
          >
            Register
          </LoadingButton>
        </Form>

        <BackToLogin 
          onClick={() => navigate('/')}
          disabled={isLoading || redirectCountdown !== null}
        >
          Already have an account? Login
        </BackToLogin>
      </RegisterCard>
    </RegisterContainer>
  );
};

export default RegisterPage;