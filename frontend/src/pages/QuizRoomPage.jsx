import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
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
  background: ${({ theme, $isCurrentUser }) => 
    $isCurrentUser ? `${theme.primary}22` : theme.background.paper};
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius};
  display: flex;
  justify-content: space-between;
  align-items: center;
  animation: ${({ $isUpdated }) => $isUpdated ? pulse : 'none'} 0.3s ease-in-out;
`;

const TimerBar = styled.div`
  height: 4px;
  background: ${({ theme }) => theme.background.accent};
  position: absolute;
  bottom: 0;
  left: 0;
  width: ${({ $progress }) => $progress}%;
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
  background: ${({ theme, $active }) => 
    $active ? theme.primary : theme.background.accent};
  transition: background-color 0.3s ease;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  justify-content: center;
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const QuizRoomPage = () => {
  const { sessionId } = useParams();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answer, setAnswer] = useState('');
  const [scores, setScores] = useState({}); // {userId: {score, username}}
  const [players, setPlayers] = useState({}); // {userId: username}
  const [timeLeft, setTimeLeft] = useState(null); // null means question hasn't started
  const [questionStarted, setQuestionStarted] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(5); // This should come from your backend
  const [updatedScore, setUpdatedScore] = useState(null);
  const [currentQuestionData, setCurrentQuestionData] = useState(null); // Store question data
  const [error, setError] = useState('');
  
  const { user, isAuthenticated } = useAuth();
  const isCreator = user?.id === sessionId; // Session creator's ID matches the sessionId

  useEffect(() => {
    socket.on('playerJoined', (players) => {
      const playerMap = players.reduce((acc, p) => {
        acc[p.id] = p.username;
        return acc;
      }, {});
      setPlayers(playerMap);
    });

    socket.on('scoreUpdate', (newScores) => {
      setScores(newScores);
      setUpdatedScore(Object.keys(newScores).find(id => 
        newScores[id].score !== scores[id]?.score));
      setTimeout(() => setUpdatedScore(null), 500);
    });

    socket.on('nextQuestion', (index) => {
      setCurrentQuestion(index);
      setTimeLeft(null);
      setAnswer('');
      setQuestionStarted(false);
    });

    socket.on('quizEnded', (finalScores) => {
      setScores(finalScores);
      // Show final scores in a more elegant way
      // This could be enhanced with a modal or animation
    });

    socket.on('quizStateRestored', ({ currentQuestion, totalQuestions, question }) => {
      setCurrentQuestion(currentQuestion);
      setTotalQuestions(totalQuestions);
      setCurrentQuestionData(question);
      // Set the state to indicate the question has started
      setQuestionStarted(true);
    });

    return () => {
      socket.off('playerJoined');
      socket.off('scoreUpdate');
      socket.off('nextQuestion');
      socket.off('quizEnded');
      socket.off('quizStateRestored');
    };
  }, [scores]);

  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0) {
      submitAnswer(true); // Auto-submit when time runs out
    }
  }, [timeLeft]);

  const submitAnswer = (auto = false) => {
    if (!auto && !answer.trim()) {
      setError('Please enter an answer');
      return;
    }
    
    setError(''); // Clear any previous errors
    
    // Send NO_RESPONSE if auto-submitting with no answer, otherwise send trimmed answer
    const submission = (!answer.trim() && auto) ? "NO_RESPONSE" : answer.trim();
    socket.emit('submitAnswer', { sessionId, answer: submission });
    setAnswer('');
  };

  const handleAnswerSubmit = () => {
    submitAnswer();
  };

  const startQuestion = () => {
    socket.emit('startQuestion', { sessionId });
    setQuestionStarted(true);
    setTimeLeft(30);
  };

  const nextQuestion = () => {
    socket.emit('nextQuestion', { sessionId });
  };

  const endQuiz = () => {
    socket.emit('endQuiz', { sessionId });
  };

  useEffect(() => {
    socket.on('questionStarted', () => {
      setQuestionStarted(true);
      setTimeLeft(30);
    });

    socket.on('playerLeft', () => {
      // Re-fetch player list when someone leaves
      socket.emit('joinSession', { sessionId });
    });

    return () => {
      socket.off('questionStarted');
      socket.off('playerLeft');
    };
  }, [sessionId]);

  // Guard clause if not authenticated
  if (!isAuthenticated || !user) return null;

  return (
    <PageContainer>
      <Title>Quiz Room: {sessionId}</Title>

      <ProgressIndicator>
        {[...Array(totalQuestions)].map((_, index) => (
          <ProgressDot key={index} $active={index <= currentQuestion} />
        ))}
      </ProgressIndicator>

      <QuestionCard>
        <h2>Question {currentQuestion + 1}</h2>
        {currentQuestionData && (
          <p>{currentQuestionData.question}</p>
        )}
        
        <Form 
          onSubmit={handleAnswerSubmit} 
          error={error}
          style={{ maxWidth: "400px", margin: "0 auto" }}
        >
          <AnswerInput
            placeholder="Type your answer here..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={!questionStarted}
          />
          
          {questionStarted && (
            <Button 
              type="submit"
              disabled={!answer.trim()}
            >
              Submit Answer
            </Button>
          )}
        </Form>
        
        <TimerBar $progress={(timeLeft / 30) * 100} />
      </QuestionCard>

      <ButtonGroup>
        {!questionStarted ? (
          isCreator ? (
            <Button onClick={startQuestion} $variant="secondary">
              Start Question
            </Button>
          ) : (
            <Button disabled>
              Waiting for question to start...
            </Button>
          )
        ) : (
          isCreator && (
            <Button onClick={nextQuestion} $variant="secondary">
              Next Question
            </Button>
          )
        )}
        
        {isCreator && (
          <Button onClick={endQuiz} $variant="secondary">
            End Quiz
          </Button>
        )}
      </ButtonGroup>

      <ScoreBoard>
        <h2>Current Scores</h2>
        <ScoreList>
          {Object.entries(scores).map(([userId, data]) => (
            <ScoreItem 
              key={userId}
              $isCurrentUser={userId === user.id}
              $isUpdated={userId === updatedScore}
            >
              <span>
                {userId === user.id 
                  ? `${user.username} (You)` 
                  : (players[userId] || "Unknown Player")}
              </span>
              <strong>{data.score}</strong>
            </ScoreItem>
          ))}
        </ScoreList>
      </ScoreBoard>
    </PageContainer>
  );
};

export default QuizRoomPage;