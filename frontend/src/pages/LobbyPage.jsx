import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../socket';
import styled from 'styled-components';

const Container = styled.div`
  padding: 20px;
  background: ${(props) => props.theme.background};
  min-height: 100vh;
`;

const Button = styled.button`
  padding: 10px;
  margin: 5px;
  background: ${(props) => props.theme.primary};
  color: ${(props) => props.theme.accent};
  border: none;
  cursor: pointer;
`;

const LobbyPage = ({ user }) => {
  const { sessionId } = useParams();
  const [players, setPlayers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    socket.emit('joinSession', { sessionId });
    socket.on('playerJoined', (playerIds) => setPlayers(playerIds));
    socket.on('quizStarted', () => navigate(`/quiz/${sessionId}`));
    return () => {
      socket.off('playerJoined');
      socket.off('quizStarted');
    };
  }, [sessionId, navigate]);

  const startQuiz = () => {
    socket.emit('startQuiz', { sessionId });
  };

  return (
    <Container>
      <h1>Lobby for Session {sessionId}</h1>
      <h2>Players:</h2>
      <ul>
        {players.map((playerId) => (
          <li key={playerId}>{playerId === user.id ? `${user.username} (You)` : playerId}</li>
        ))}
      </ul>
      {user.id === players[0] && <Button onClick={startQuiz}>Start Quiz</Button>}
    </Container>
  );
};

LobbyPage.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired
  }).isRequired
};

export default LobbyPage;
