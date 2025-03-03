import PropTypes from 'prop-types';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socket, { connectSocket } from '../../socket';
import { Button } from '../shared/StyledComponents';
import {
  SessionActions,
  SessionDetails,
  SessionItemContainer,
  StatusBadge
} from './styles';

const SessionItem = ({ session }) => {
  const navigate = useNavigate();
  
  // Ensure socket is connected before navigating
  useEffect(() => {
    // Make sure socket is connected when component mounts
    if (!socket.connected) {
      connectSocket();
    }
  }, []);
  
  const handleNavigate = () => {
    if (session.status === 'waiting') {
      navigate(`/lobby/${session.id}`);
    } else if (session.status === 'in_progress') {
      // Make sure socket is connected before navigating
      if (!socket.connected) {
        connectSocket();
      }
      
      // Navigate to the quiz room
      navigate(`/quiz/${session.id}`);
    }
  };
  
  // Get appropriate status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'waiting': return 'info';
      case 'active': return 'success';
      case 'completed': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <SessionItemContainer>
      <SessionDetails>
        <span>Session ID: {session.id}</span>
        <StatusBadge color={getStatusColor(session.status)}>
          {session.status}
        </StatusBadge>
        {session.creator_name && (
          <StatusBadge color="secondary">
            Host: {session.creator_name}
          </StatusBadge>
        )}
      </SessionDetails>
      
      <SessionActions>
        {session.status !== 'completed' && (
          <Button onClick={handleNavigate} $variant="primary" size="sm">
            {session.status === 'waiting' ? 'Go to Lobby' : 'Join Quiz'}
          </Button>
        )}
      </SessionActions>
    </SessionItemContainer>
  );
};

SessionItem.propTypes = {
  session: PropTypes.shape({
    id: PropTypes.string.isRequired,
    quiz_id: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    creator_name: PropTypes.string,
    creator_id: PropTypes.string
  }).isRequired
};

export default SessionItem;