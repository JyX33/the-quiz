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

const QuizItem = ({ quiz, onCreateSession, onDeleteQuiz }) => {
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
            {Object.entries(statusCounts).map(([status, count]) => (
              <Badge key={status} color={status === 'waiting' ? 'info' : status === 'active' ? 'success' : 'secondary'}>
                {status}: {count}
              </Badge>
            ))}
          </div>
        </QuizDetails>
        
        <ActionButtons>
          <Button onClick={onCreateSession} $variant="primary" size="sm">
            Create Session
          </Button>
          <Button onClick={onDeleteQuiz} $variant="danger" size="sm">
            Delete Quiz
          </Button>
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
    sessions: PropTypes.array.isRequired
  }).isRequired,
  onCreateSession: PropTypes.func.isRequired,
  onDeleteQuiz: PropTypes.func.isRequired
};

export default QuizItem;