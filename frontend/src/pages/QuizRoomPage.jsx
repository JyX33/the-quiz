import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import socket from '../socket';
import {
  PageContainer,
  Title,
  Button,
  Input,
  Card,
} from '../components/shared/StyledComponents';

const slideIn = keyframes`
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const QuestionCard = styled(Card)`
  animation: ${slideIn} 0.4s ease-out;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
  position: relative;
`;

const AnswerInput = styled(Input)`
  max-width: 400px;
  margin: ${({ theme }) => theme.spacing.md} auto;
  text-align: center;
  font-size: 1.2rem;
`;

const ScoreBoard = styled(Card)`
  margin-top: ${({ theme }) => theme.spacing.xl};
`;

const ScoreList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const ScoreItem = styled.div`
  background: ${({ theme, isCurrentUser }) => 
    isCurrentUser ? `${theme.primary}22` : theme.background.paper};
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius};
  display: flex;
  justify-content: space-between;
  align-items: center;
  animation: ${({ isUpdated }) => isUpdated ? pulse : 'none'} 0.3s ease-in-out;
`;

const TimerBar = styled.div`
  height: 4px;
  background: ${({ theme }) => theme.background.accent};
  position: absolute;
  bottom: 0;
  left: 0;
  width: ${({ progress }) => progress}%;
  transition: width 1s linear;
`;

const ProgressIndicator = styled.div`
  display: flex;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const ProgressDot = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ theme, active }) => 
    active ? theme.primary : theme.background.accent};
  transition: background-color 0.3s ease;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  justify-content: center;
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const QuizRoomPage = ({ user }) => {
  const { sessionId } = useParams();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answer, setAnswer] = useState('');
  const [scores, setScores] = useState({});
  const [isCreator] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [totalQuestions] = useState(5); // This should come from your backend
  const [updatedScore, setUpdatedScore] = useState(null);

  useEffect(() => {
    socket.on('scoreUpdate', (newScores) => {
      setScores(newScores);
      setUpdatedScore(Object.keys(newScores).find(id => 
        newScores[id].score !== scores[id]?.score));
      setTimeout(() => setUpdatedScore(null), 500);
    });

    socket.on('nextQuestion', (index) => {
      setCurrentQuestion(index);
      setTimeLeft(30);
      setAnswer('');
    });

    socket.on('quizEnded', (finalScores) => {
      setScores(finalScores);
      // Show final scores in a more elegant way
      // This could be enhanced with a modal or animation
    });

    return () => {
      socket.off('scoreUpdate');
      socket.off('nextQuestion');
      socket.off('quizEnded');
    };
  }, [scores]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0) {
      submitAnswer(); // Auto-submit when time runs out
    }
  }, [timeLeft]);

  const submitAnswer = () => {
    if (!answer.trim()) return;
    socket.emit('submitAnswer', { sessionId, answer });
    setAnswer('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      submitAnswer();
    }
  };

  const nextQuestion = () => {
    socket.emit('nextQuestion', { sessionId });
  };

  const endQuiz = () => {
    socket.emit('endQuiz', { sessionId });
  };

  return (
    <PageContainer>
      <Title>Quiz Room: {sessionId}</Title>

      <ProgressIndicator>
        {[...Array(totalQuestions)].map((_, index) => (
          <ProgressDot key={index} active={index <= currentQuestion} />
        ))}
      </ProgressIndicator>

      <QuestionCard>
        <h2>Question {currentQuestion + 1}</h2>
        {/* Add your actual question content here */}
        <AnswerInput
          placeholder="Type your answer here..."
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <TimerBar progress={(timeLeft / 30) * 100} />
      </QuestionCard>

      <ButtonGroup>
        <Button onClick={submitAnswer} disabled={!answer.trim()}>
          Submit Answer
        </Button>
        {isCreator && (
          <>
            <Button onClick={nextQuestion} variant="secondary">
              Next Question
            </Button>
            <Button onClick={endQuiz} variant="secondary">
              End Quiz
            </Button>
          </>
        )}
      </ButtonGroup>

      <ScoreBoard>
        <h2>Current Scores</h2>
        <ScoreList>
          {Object.entries(scores).map(([userId, data]) => (
            <ScoreItem 
              key={userId}
              isCurrentUser={userId === user.id}
              isUpdated={userId === updatedScore}
            >
              <span>{userId === user.id ? `${user.username} (You)` : userId}</span>
              <strong>{data.score}</strong>
            </ScoreItem>
          ))}
        </ScoreList>
      </ScoreBoard>
    </PageContainer>
  );
};

QuizRoomPage.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired
  }).isRequired
};

export default QuizRoomPage;
