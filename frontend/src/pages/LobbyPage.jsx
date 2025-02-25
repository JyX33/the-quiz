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

const ErrorDisplay = styled.div`
  color: ${({ theme }) => theme.error};
  background: ${({ theme }) => theme.error + '11'};
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius};
  margin-bottom: ${({ theme }) => theme.spacing.md};
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
  
  const chatRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Setup and teardown socket connection
  useEffect(() => {
    const handleConnect = () => {
      console.log('Socket connected in lobby');
      setSocketIsConnected(true);
    };
    
    const handleDisconnect = () => {
      console.log('Socket disconnected in lobby');
      setSocketIsConnected(false);
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
    
    // Function to join the session
    const joinCurrentSession = () => {
      console.log('Joining session:', sessionId, 'User:', user);
      socket.emit('joinSession', { sessionId });
      
      // Add an initial system message
      addMessage('System', 'Joining lobby...');
    };
    
    // Make sure we're connected before joining
    if (socket.connected) {
      console.log('Socket already connected, joining session directly');
      joinCurrentSession();
    } else {
      console.log('Socket not connected, waiting for connection');
      socket.connect();
      
      // Wait for connection before joining
      const connectHandler = () => {
        console.log('Connected in event handler, now joining session');
        joinCurrentSession();
      };
      
      socket.once('connect', connectHandler);
      
      return () => {
        socket.off('connect', connectHandler);
      };
    }
    
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
    
    // Debug
    socket.onAny((event, ...args) => {
      console.log(`Debug: Socket event received: ${event}`, args);
    });
    
    // Clean up event handlers
    return () => {
      console.log('Cleaning up socket event handlers');
      socket.off('playerJoined', playerJoinedHandler);
      socket.off('playerLeft', playerLeftHandler);
      socket.off('chatMessage', chatMessageHandler);
      socket.off('quizStarting', quizStartingHandler);
      socket.off('quizStarted', quizStartedHandler);
      socket.off('error', errorHandler);
      socket.offAny();
    };
  }, [sessionId, navigate, user]);

  // Auto-scroll chat to bottom when messages change
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = (username, message) => {
    setMessages(prev => [...prev, { username, message, time: new Date() }]);
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
    let progress = 0;
    const interval = setInterval(() => {
      progress += 2;
      setStartProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        socket.emit('startQuiz', { sessionId });
      }
    }, 50);
  };

  const isHost = players.length > 0 && user?.id === players[0]?.id;

  const leaveSession = () => {
    socket.emit('leaveSession', { sessionId });
    navigate('/home');
  };

  if (!user) return null;

  return (
    <PageContainer>
      <Title>Waiting Room</Title>
      
      {!socketIsConnected && (
        <ErrorDisplay>
          Socket is currently disconnected. Try refreshing the page.
        </ErrorDisplay>
      )}
      
      {error && (
        <ErrorDisplay>
          {error}
        </ErrorDisplay>
      )}
      
      <LobbyCard>
        <div>
          <h2>Players ({players.length})</h2>
          <PlayerGrid>
            {players.length === 0 ? (
              <p>No players have joined yet. {socketIsConnected ? 'Waiting for players...' : 'Socket disconnected.'}</p>
            ) : (
              players.map((player) => (
                <PlayerCard
                  key={player.id}
                  $isHost={players[0]?.id === player.id}
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
                      {player.id === players[0]?.id ? 'Host' : 'Ready'}
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
          <Button onClick={() => leaveSession()} $variant="secondary">
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
          
          <Form onSubmit={sendMessage} error={error}>
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