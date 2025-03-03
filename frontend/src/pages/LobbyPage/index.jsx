import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, PageContainer, Title } from '../../components/shared/StyledComponents';
import { useAuth } from '../../contexts/AuthContext';
import ConnectionStatus from './components/ConnectionStatus';
import PlayersList from './components/PlayersList';
import useLobbySocket from './hooks/useLobbySocket';
import useSessionInfo from './hooks/useSessionInfo';
import {
    CountdownTimer,
    ErrorDisplay,
    HostMessage,
    LobbyCard,
    StartButton,
    StatusBadge
} from './styles';

const LobbyPage = () => {
  const { sessionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [startProgress, setStartProgress] = useState(0);
  const [localError, setLocalError] = useState('');
  
  // Combined error handler for both hooks
  const setError = (errorMsg) => {
    setLocalError(errorMsg);
  };
  
  // Custom hooks
  const { 
    sessionInfo, 
    sessionExists, 
    error: sessionError, 
    isHost 
  } = useSessionInfo(sessionId, user);
  
  const { 
    players, 
    countdown, 
    socketIsConnected, 
    reconnect, 
    leaveSession, 
    startQuiz 
  } = useLobbySocket(sessionId, user, setError);

  // Combine errors from both hooks
  const error = localError || sessionError;

  const handleStartQuiz = () => {
    startQuiz(isHost);
    
    // Update progress state
    const updateProgress = setInterval(() => {
      setStartProgress(prev => {
        if (prev >= 100) {
          clearInterval(updateProgress);
          return 100;
        }
        return prev + 2;
      });
    }, 50);
  };

  // Redirect if session doesn't exist
  if (!sessionExists) {
    return (
      <PageContainer>
        <Title>Session Not Found</Title>
        <ErrorDisplay>
          The session you are trying to join does not exist or has ended.
        </ErrorDisplay>
        <Button onClick={() => navigate('/home')}>
          Return to Home
        </Button>
      </PageContainer>
    );
  }

  if (!user) return null;

  return (
    <PageContainer>
      <Title>
        Waiting Room
        {sessionInfo && (
          <StatusBadge>{sessionInfo.status}</StatusBadge>
        )}
      </Title>
      
      <ConnectionStatus 
        socketIsConnected={socketIsConnected}
        error={error}
        onReconnect={reconnect}
      />
      
      <LobbyCard>
        <h2>Players ({players.length})</h2>
        {isHost && (
          <HostMessage>
            You are the host of this session
          </HostMessage>
        )}
        
        <PlayersList 
          players={players}
          currentUserId={user.id}
          creatorId={sessionInfo?.creator_id}
          socketIsConnected={socketIsConnected}
        />
        
        {isHost && (
          <StartButton 
            onClick={handleStartQuiz}
            disabled={players.length < 2 || countdown !== null || !socketIsConnected}
            $progress={startProgress}
          >
            {!socketIsConnected ? 'Waiting for connection...' :
              players.length < 2
                ? 'Waiting for more players...'
                : 'Start Quiz'}
          </StartButton>
        )}
        <Button 
          onClick={() => leaveSession()} 
          $variant="secondary"
          style={{ marginTop: '16px' }}
        >
          Leave Session
        </Button>
      </LobbyCard>

      {countdown && (
        <CountdownTimer>{countdown}</CountdownTimer>
      )}
    </PageContainer>
  );
};

export default LobbyPage;
