import { useState } from 'react';
import PropTypes from 'prop-types';
import SessionItem from './SessionItem';
import { 
  QuizItemContainer, 
  QuizHeader, 
  QuizDetails, 
  ActionButtons, 
  SessionsList,
  ToggleButton,
  Badge
} from './styles';
import { Button } from '../shared/StyledComponents';

const QuizItem = ({ quiz, currentUser, onCreateSession, onDeleteQuiz }) => {
  // Check if the current user is the creator of the quiz
  const isCreator = currentUser && quiz.creator_id === currentUser.id;
  const [isExpanded, setIsExpanded] = useState(false);
  
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };
  
  // Count sessions by status
  const statusCounts = quiz.sessions.reduce((counts, session) => {
    counts[session.status] = (counts[session.status] || 0) + 1;
    return counts;
  }, {});

  return (
    <QuizItemContainer>
      <QuizHeader>
        <QuizDetails>
          <h3>{quiz.category} Quiz</h3>
          <div>
            <Badge color="primary">Difficulty: {quiz.difficulty}</Badge>
            <Badge color="secondary">Creator: {quiz.creator_name || 'Unknown'}</Badge>
            {Object.entries(statusCounts).map(([status, count]) => (
              <Badge key={status} color={status === 'waiting' ? 'info' : status === 'active' ? 'success' : 'secondary'}>
                {status}: {count}
              </Badge>
            ))}
          </div>
        </QuizDetails>
        
        <ActionButtons>
          {isCreator ? (
            <>
              <Button onClick={onCreateSession} $variant="primary" size="sm">
                Create Session
              </Button>
              <Button onClick={onDeleteQuiz} $variant="danger" size="sm">
                Delete Quiz
              </Button>
            </>
          ) : (
            // For non-creators, show a button to view sessions
            <Button onClick={toggleExpand} $variant="secondary" size="sm">
              {isExpanded ? 'Hide Sessions' : 'View Sessions'}
            </Button>
          )}
          <ToggleButton onClick={toggleExpand}>
            {isExpanded ? '▲' : '▼'}
          </ToggleButton>
        </ActionButtons>
      </QuizHeader>
      
      {isExpanded && (
        <SessionsList>
          {quiz.sessions.length === 0 ? (
            <p>No sessions available for this quiz.</p>
          ) : (
            quiz.sessions.map(session => (
              <SessionItem key={session.id} session={session} />
            ))
          )}
        </SessionsList>
      )}
    </QuizItemContainer>
  );
};

QuizItem.propTypes = {
  quiz: PropTypes.shape({
    id: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    difficulty: PropTypes.string.isRequired,
    creator_id: PropTypes.string.isRequired,
    creator_name: PropTypes.string,
    sessions: PropTypes.array.isRequired
  }).isRequired,
  currentUser: PropTypes.shape({
    id: PropTypes.string.isRequired
  }),
  onCreateSession: PropTypes.func.isRequired,
  onDeleteQuiz: PropTypes.func.isRequired
};

export default QuizItem;