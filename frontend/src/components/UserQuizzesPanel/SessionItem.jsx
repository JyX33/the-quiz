import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { 
  SessionItemContainer, 
  SessionDetails, 
  StatusBadge, 
  SessionActions 
} from './styles';
import { Button } from '../shared/StyledComponents';

const SessionItem = ({ session }) => {
  const navigate = useNavigate();
  
  const handleNavigate = () => {
    if (session.status === 'waiting') {
      navigate(`/lobby/${session.id}`);
    } else if (session.status === 'active') {
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
    status: PropTypes.string.isRequired
  }).isRequired
};

export default SessionItem;