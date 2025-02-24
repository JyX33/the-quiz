import { useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styled from 'styled-components';
import {
  PageContainer,
  Button,
  Input,
  Select,
} from '../components/shared/StyledComponents';

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

const HomePage = ({ user, updateTheme }) => {
  const [sessionId, setSessionId] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleJoinSession = async () => {
    try {
      setError('');
      const response = await axios.get(`http://localhost:5000/api/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data) {
        navigate(`/lobby/${sessionId}`);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Session not found. Please check the session ID.');
      } else {
        setError('Error joining session. Please try again.');
      }
    }
  };

  return (
    <PageContainer>
      <TopBar>
        <ThemeSelect onChange={(e) => updateTheme(e.target.value)} value={user?.theme || 'Alliance'}>
          <option value="Alliance">Alliance Theme</option>
          <option value="Horde">Horde Theme</option>
        </ThemeSelect>
        <Button 
          onClick={() => {
            localStorage.removeItem('token');
            navigate('/');
          }}
          $variant="secondary"
        >
          Logout
        </Button>
      </TopBar>

      <MainContent>
        <Button onClick={() => navigate('/create-quiz')}>Create Quiz</Button>
        
        <ActionContainer>
          <InputGroup>
            <Input 
              placeholder="Session ID" 
              value={sessionId} 
              onChange={(e) => {
                setError('');
                setSessionId(e.target.value);
              }}
            />
            <Button onClick={handleJoinSession}>Join Session</Button>
          </InputGroup>
          {error && <ErrorMessage>{error}</ErrorMessage>}
        </ActionContainer>
      </MainContent>
    </PageContainer>
  );
};

HomePage.propTypes = {
  user: PropTypes.shape({
    username: PropTypes.string.isRequired,
    theme: PropTypes.string,
    id: PropTypes.string.isRequired
  }),
  updateTheme: PropTypes.func.isRequired
};

export default HomePage;
