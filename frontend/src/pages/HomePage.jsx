import api from '../utils/axios';
import PropTypes from 'prop-types';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import {
  Button,
  Input,
  PageContainer,
  Select,
} from '../components/shared/StyledComponents';
import { handleApiError } from '../utils/errorHandler';
import { useAuth } from '../contexts/AuthContext';

const TopBar = styled.div`
  position: absolute;
  top: ${({ theme }) => theme.spacing.md};
  right: ${({ theme }) => theme.spacing.md};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
`;

const ThemeSelect = styled(Select)`
  width: 200px;
`;

const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const ActionContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  margin: ${({ theme }) => theme.spacing.md} 0;
`;

const InputGroup = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
`;

const ErrorMessage = styled.div`
  color: ${({ theme }) => theme.error || '#ff0000'};
  font-size: 0.9rem;
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const HomePage = ({ updateTheme }) => {
  const [sessionId, setSessionId] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const navigate = useNavigate();
  
  const { user, logout } = useAuth();

  const handleJoinSession = async () => {
    if (!sessionId.trim()) {
      setError('Please enter a session ID');
      return;
    }

    try {
      setError('');
      setIsJoining(true);
      
      const response = await api.get(`/sessions/${sessionId}`);
      
      if (response.data) {
        navigate(`/lobby/${sessionId}`);
      }
    } catch (error) {
      handleApiError(error, setError);
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreateQuiz = () => {
    setIsLoading(true);
    navigate('/create-quiz');
  };

  const handleLogout = async () => {
    const success = await logout();
    if (success) {
      navigate('/');
    }
  };

  return (
    <PageContainer>
      <TopBar>
        <ThemeSelect 
          onChange={(e) => updateTheme(e.target.value)} 
          value={user?.theme || 'Alliance'}
          disabled={isLoading || isJoining}
        >
          <option value="Alliance">Alliance Theme</option>
          <option value="Horde">Horde Theme</option>
        </ThemeSelect>
        <Button 
          onClick={handleLogout}
          $variant="secondary"
          disabled={isLoading || isJoining}
        >
          Logout
        </Button>
      </TopBar>

      <MainContent>
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            <h1>Welcome, {user?.username || 'User'}!</h1>
            
            <Button 
              onClick={handleCreateQuiz}
              disabled={isJoining}
            >
              Create Quiz
            </Button>
            
            <ActionContainer>
              <InputGroup>
                <Input 
                  placeholder="Session ID" 
                  value={sessionId} 
                  onChange={(e) => {
                    setError('');
                    setSessionId(e.target.value);
                  }}
                  disabled={isJoining}
                />
                <Button 
                  onClick={handleJoinSession}
                  disabled={isJoining}
                >
                  {isJoining ? 'Joining...' : 'Join Session'}
                </Button>
              </InputGroup>
              {error && <ErrorMessage>{error}</ErrorMessage>}
            </ActionContainer>
          </>
        )}
      </MainContent>
    </PageContainer>
  );
};

HomePage.propTypes = {
  updateTheme: PropTypes.func.isRequired
};

export default HomePage;