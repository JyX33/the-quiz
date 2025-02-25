import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled, { css, keyframes } from 'styled-components';
import Form from '../components/shared/Form';
import {
  Button,
  Card,
  Input,
  PageContainer,
  Title,
} from '../components/shared/StyledComponents';
import { useAuth } from '../contexts/AuthContext';
import socket from '../socket';
import api from '../utils/axios';

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const LobbyCard = styled(Card)`
  max-width: 1000px;
  margin: 2rem auto;
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: ${({ theme }) => theme.spacing.lg};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const PlayerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
`;

const PlayerCard = styled.div`
  background: ${({ theme }) => theme.background.paper};
  border-radius: ${({ theme }) => theme.borderRadius};
  padding: ${({ theme }) => theme.spacing.md};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  animation: ${fadeIn} 0.3s ease-out;
  border: 2px solid ${({ $isHost, theme }) => 
    $isHost ? theme.primary : 'transparent'};
  position: relative;
  
  ${({ $isNew }) => $isNew && css`
    animation: ${pulse} 0.5s ease-out;
  `}
`;

const Avatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ theme }) => theme.background.accent};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: ${({ theme }) => theme.text.primary};
`;

const PlayerInfo = styled.div`
  flex: 1;
`;

const PlayerName = styled.div`
  font-weight: ${({ theme }) => theme.typography.heading.weight};
  color: ${({ theme }) => theme.text.primary};
`;

const PlayerStatus = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.text.secondary};
`;

const ChatSection = styled.div`
  display: flex;
  flex-direction: column;
  height: 400px;
`;

const ChatMessages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => `${theme.background.paper}88`};
  border-radius: ${({ theme }) => theme.borderRadius};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const Message = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  animation: ${fadeIn} 0.2s ease-out;
  
  span {
    color: ${({ theme }) => theme.primary};
    font-weight: bold;
  }
`;

const ChatInput = styled(Input)`
  margin-bottom: 0;
`;

const CountdownTimer = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 6rem;
  font-weight: bold;
  color: ${({ theme }) => theme.primary};
  animation: ${pulse} 1s ease-in-out infinite;
  z-index: 10;
  text-shadow: 0 0 20px ${({ theme }) => `${theme.primary}66`};
`;

const StartButton = styled(Button)`
  width: 100%;
  margin-top: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md};
  font-size: 1.2rem;
  position: relative;
  overflow: hidden;
  
  &:after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: ${({ $progress }) => $progress}%;
    height: 100%;
    background: ${({ theme }) => `${theme.background.accent}22`};
    transition: width 1s linear;
  }
`;

const ReconnectButton = styled(Button)`
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const ErrorDisplay = styled.div`
  color: ${({ theme }) => theme.error};
  background: ${({ theme }) => theme.error + '11'};
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  margin-left: 8px;
  background: ${({ theme }) => theme.primary};
  color: white;
`;

const LobbyPage = () => {
  const { sessionId } = useParams();
  const [players, setPlayers] = useState([]); 
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [countdown, setCountdown] = useState(null);
  const [startProgress, setStartProgress] = useState(0);
  const [error, setError] = useState('');
  const [socketIsConnected, setSocketIsConnected] = useState(socket.connected);
  const [sessionExists, setSessionExists] = useState(true);
  
  // Add this state for session info
  const [sessionInfo, setSessionInfo] = useState(null);
  const [isCreator, setIsCreator] = useState(false);
  
  // Refs defined at the top level of the component
  const hasJoinedRef = useRef(false);
  const chatRef = useRef(null);
  
  const navigate = useNavigate();
  const { user } = useAuth();

  // Add this effect to fetch session details and check creator status
  useEffect(() => {
    if (!sessionId || !user) return;
    
    const fetchSessionDetails = async () => {
      try {
        const response = await api.get(`/sessions/${sessionId}`);
        const sessionData = response.data;
        
        setSessionInfo(sessionData);
        
        // Check if current user is the creator
        const userIsCreator = sessionData.creator_id === user.id;
        console.log('Creator check:', {
          userId: user.id,
          creatorId: sessionData.creator_id,
          isCreator: userIsCreator
        });
        
        setIsCreator(userIsCreator);
        
        if (!userIsCreator) {
          console.log('Current user is not the creator of this session');
        }
      } catch (error) {
        console.error('Error fetching session details:', error);
        setError('Failed to load session details');
      }
    };
    
    fetchSessionDetails();
  }, [sessionId, user]);

  // Setup and teardown socket connection
  useEffect(() => {
    const handleConnect = () => {
      console.log('Socket connected in lobby');
      setSocketIsConnected(true);
      setError(''); // Clear connection errors when connected
    };
    
    const handleDisconnect = () => {
      console.log('Socket disconnected in lobby');
      setSocketIsConnected(false);
      setError('Connection lost. Trying to reconnect...');
    };
    
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    
    // Check initial status
    setSocketIsConnected(socket.connected);
    
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, []);

  // Handle session joining
  useEffect(() => {
    if (!user || !sessionId) return;
    
    console.log('Setting up lobby with session ID:', sessionId);
    
    // Improved session joining function with validation and retries
    const joinSessionWithValidation = async () => {
      // Check if we've already joined in this component instance
      if (hasJoinedRef.current) {
        console.log('Session already joined, skipping');
        return;
      }
      
      console.log('Attempting to join session:', sessionId, 'User:', user);
      
      try {
        // Mark that we've attempted to join
        hasJoinedRef.current = true;
        
        // First check if the session exists via REST API
        const sessionResponse = await api.get(`/sessions/${sessionId}`, { 
          timeout: 5000 // Add timeout to prevent hanging
        });
        
        if (!sessionResponse.data) {
          setSessionExists(false);
          throw new Error('Session not found');
        }
        
        setSessionExists(true);
        console.log('Session verified via API, joining via socket');
        addMessage('System', 'Joining lobby...');
        
        // Now emit the join event
        if (socket.connected) {
          socket.emit('joinSession', { sessionId });
        } else {
          throw new Error('Socket not connected');
        }
        
      } catch (error) {
        console.error('Error validating session:', error);
        
        if (error.response?.status === 404) {
          setSessionExists(false);
          setError('This session does not exist.');
          addMessage('System', 'Error: This session does not exist.');
        } else if (error.response?.status === 403) {
          setError('You do not have permission to join this session.');
          addMessage('System', 'Error: You do not have permission to join this session.');
        } else {
          // If API fails but socket is connected, try direct socket join as fallback
          if (socket.connected) {
            console.log('API validation failed, attempting direct socket join as fallback');
            socket.emit('joinSession', { sessionId });
            addMessage('System', 'Joining lobby (fallback method)...');
          } else {
            setError('Could not connect to the session. Please try again.');
            addMessage('System', 'Error: Connection failed. Please try again.');
          }
        }
      }
    };
    
    // Set up event handlers
    const playerJoinedHandler = (updatedPlayers) => {
      console.log('Player joined event received:', updatedPlayers);
      setPlayers(updatedPlayers);
      
      // Check if there's a new player to announce
      const lastPlayer = updatedPlayers[updatedPlayers.length - 1];
      if (lastPlayer) {
        addMessage('System', `${lastPlayer.username} has joined the lobby`);
      }
    };
    
    const playerLeftHandler = (updatedPlayers) => {
      console.log('Player left event received:', updatedPlayers);
      setPlayers(updatedPlayers);
      addMessage('System', `A player has left the lobby`);
    };
    
    const chatMessageHandler = ({ username, message }) => {
      addMessage(username, message);
    };
    
    const quizStartingHandler = (count) => {
      setCountdown(count);
    };
    
    const quizStartedHandler = () => {
      navigate(`/quiz/${sessionId}`);
    };
    
    const errorHandler = (errorMessage) => {
      console.error('Socket error:', errorMessage);
      setError(`Error: ${errorMessage}`);
      addMessage('System', `Error: ${errorMessage}`);
    };
    
    // Register all event handlers
    socket.on('playerJoined', playerJoinedHandler);
    socket.on('playerLeft', playerLeftHandler);
    socket.on('chatMessage', chatMessageHandler);
    socket.on('quizStarting', quizStartingHandler);
    socket.on('quizStarted', quizStartedHandler);
    socket.on('error', errorHandler);
    
    // Make sure we're connected before joining
    if (socket.connected) {
      console.log('Socket already connected, joining session directly');
      joinSessionWithValidation();
    } else {
      console.log('Socket not connected, waiting for connection');
      socket.connect();
      
      // Wait for connection before joining
      const connectHandler = () => {
        console.log('Connected in event handler, now joining session');
        joinSessionWithValidation();
      };
      
      socket.once('connect', connectHandler);
      
      return () => {
        socket.off('connect', connectHandler);
      };
    }
    
    // Debug
    socket.onAny((event, ...args) => {
      console.log(`Debug: Socket event received: ${event}`, args);
    });
    
    // Clean up event handlers
    return () => {
      console.log('Cleaning up socket event handlers');
      hasJoinedRef.current = false; // Reset the ref on cleanup
      socket.off('playerJoined', playerJoinedHandler);
      socket.off('playerLeft', playerLeftHandler);
      socket.off('chatMessage', chatMessageHandler);
      socket.off('quizStarting', quizStartingHandler);
      socket.off('quizStarted', quizStartedHandler);
      socket.off('error', errorHandler);
      socket.offAny();
    };
    
  }, [sessionId, navigate, user]); // Removed joinAttempts from dependency array

  // Auto-scroll chat to bottom when messages change
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = (username, message) => {
    setMessages(prev => [...prev, { username, message, time: new Date() }]);
  };

  const handleReconnect = () => {
    // Reset our joining flag to allow another attempt
    hasJoinedRef.current = false;
    
    setError(''); // Clear any existing errors
    
    // Reconnect socket if needed
    if (!socket.connected) {
      socket.connect();
    }
    
    // Create a manual reconnection function
    const manualReconnect = async () => {
      try {
        // First check if the session exists
        const sessionResponse = await api.get(`/sessions/${sessionId}`, { 
          timeout: 5000
        });
        
        if (!sessionResponse.data) {
          setSessionExists(false);
          setError('This session does not exist.');
          addMessage('System', 'Error: This session does not exist.');
          return;
        }
        
        setSessionExists(true);
        addMessage('System', 'Reconnecting to lobby...');
        
        // Manually emit join event
        if (socket.connected) {
          socket.emit('joinSession', { sessionId });
        } else {
          setError('Socket still disconnected. Please try again or refresh the page.');
        }
      } catch (error) {
        console.error('Error during manual reconnection:', error);
        setError('Failed to reconnect: ' + (error.message || 'Unknown error'));
      }
    };
    
    // Execute the reconnection
    manualReconnect();
  };

  const sendMessage = () => {
    if (!messageInput.trim()) {
      setError('Please enter a message');
      return;
    }

    setError('');
    socket.emit('chatMessage', { sessionId, message: messageInput });
    setMessageInput('');
  };

  const startQuiz = () => {
    if (!isHost) {
      setError('Only the session creator can start the quiz');
      return;
    }
    
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 2;
      setStartProgress(progress);
      if (progress >= 100) {
        clearInterval(progressInterval);
        
        try {
          console.log('Emitting startQuiz event as user:', user?.id);
          socket.emit('startQuiz', { sessionId });
        } catch (error) {
          console.error('Error starting quiz:', error);
          setError('Failed to start quiz: ' + error.message);
        }
      }
    }, 50);
  };

  // Use isCreator from state check instead of checking players
  const isHost = isCreator || (sessionInfo && sessionInfo.creator_id === user?.id);

  const leaveSession = () => {
    socket.emit('leaveSession', { sessionId });
    navigate('/home');
  };

  // Redirect if session doesn't exist
  if (!sessionExists && !hasJoinedRef.current) {
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
      
      {!socketIsConnected && (
        <ErrorDisplay>
          Socket is currently disconnected. Try refreshing the page.
          <ReconnectButton onClick={handleReconnect}>
            Reconnect
          </ReconnectButton>
        </ErrorDisplay>
      )}
      
      {error && (
        <ErrorDisplay>
          {error}
          {error.includes('multiple attempts') && (
            <ReconnectButton onClick={handleReconnect}>
              Try Again
            </ReconnectButton>
          )}
        </ErrorDisplay>
      )}
      
      <LobbyCard>
        <div>
          <h2>Players ({players.length})</h2>
          {isHost && (
            <div style={{ marginBottom: '12px', fontStyle: 'italic', color: '#666' }}>
              You are the host of this session
            </div>
          )}
          <PlayerGrid>
            {players.length === 0 ? (
              <p>No players have joined yet. {socketIsConnected ? 'Waiting for players...' : 'Socket disconnected.'}</p>
            ) : (
              players.map((player) => (
                <PlayerCard
                  key={player.id}
                  $isHost={(player.id === sessionInfo?.creator_id)}
                  $isNew={player === players[players.length - 1]}
                >
                  <Avatar>
                    {player.username.charAt(0).toUpperCase()}
                  </Avatar>
                  <PlayerInfo>
                    <PlayerName>
                      {player.id === user.id ? `${player.username} (You)` : player.username}
                    </PlayerName>
                    <PlayerStatus>
                      {player.id === sessionInfo?.creator_id ? 'Host' : 'Ready'}
                    </PlayerStatus>
                  </PlayerInfo>
                </PlayerCard>
              ))
            )}
          </PlayerGrid>
          
          {isHost && (
            <StartButton 
              onClick={startQuiz}
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
        </div>

        <ChatSection>
          <h2>Lobby Chat</h2>
          <ChatMessages ref={chatRef}>
            {messages.map((msg, index) => (
              <Message key={index}>
                <span>{msg.username}:</span> {msg.message}
              </Message>
            ))}
          </ChatMessages>
          
          <Form onSubmit={sendMessage} error={""}>
            <ChatInput
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Type a message..."
              disabled={!socketIsConnected}
            />
          </Form>
        </ChatSection>
      </LobbyCard>

      {countdown && (
        <CountdownTimer>{countdown}</CountdownTimer>
      )}
    </PageContainer>
  );
};

export default LobbyPage;