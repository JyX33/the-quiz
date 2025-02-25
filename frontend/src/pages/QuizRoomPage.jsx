import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import api from '../utils/axios';

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

const ErrorDisplay = styled.div`
  color: ${({ theme }) => theme.error};
  background: ${({ theme }) => theme.error + '11'};
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const WaitingStateCard = styled(Card)`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const StatusMessage = styled.div`
  font-size: 1.2rem;
  margin: ${({ theme }) => theme.spacing.lg} 0;
  animation: ${pulse} 2s infinite ease-in-out;
`;

const QuizRoomPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
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
  const [sessionInfo, setSessionInfo] = useState(null);
  const [isCreator, setIsCreator] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [fetchingQuizData, setFetchingQuizData] = useState(true);
  const [socketConnected, setSocketConnected] = useState(socket.connected);
  
  const { user, isAuthenticated } = useAuth();

  // Fetch session details to determine if user is creator
  useEffect(() => {
    if (!sessionId || !user) return;
    
    const fetchSessionDetails = async () => {
      try {
        setFetchingQuizData(true);
        const response = await api.get(`/sessions/${sessionId}`);
        const sessionData = response.data;
        
        console.log('Session data loaded:', sessionData);
        setSessionInfo(sessionData);
        
        // Check if current user is the creator
        const userIsCreator = sessionData.creator_id === user.id;
        console.log('Creator check:', {
          userId: user.id,
          creatorId: sessionData.creator_id,
          isCreator: userIsCreator
        });
        
        setIsCreator(userIsCreator);
        
        // Parse quiz questions if available
        if (sessionData.questions) {
          try {
            const parsedQuestions = JSON.parse(sessionData.questions);
            setTotalQuestions(parsedQuestions.length);
            if (sessionData.current_question < parsedQuestions.length) {
              setCurrentQuestionData(parsedQuestions[sessionData.current_question]);
              setCurrentQuestion(sessionData.current_question);
            }
          } catch (e) {
            console.error("Error parsing questions:", e);
          }
        }
        
        // Check if quiz is already in progress
        if (sessionData.status === 'in_progress') {
          setQuizStarted(true);
        }
        
        setFetchingQuizData(false);
      } catch (error) {
        console.error('Error fetching session details:', error);
        setError('Failed to load quiz details');
        setFetchingQuizData(false);
      }
    };
    
    fetchSessionDetails();
  }, [sessionId, user]);

  // Socket connection status
  useEffect(() => {
    const handleConnect = () => {
      console.log('Socket connected in quiz room');
      setSocketConnected(true);
    };
    
    const handleDisconnect = () => {
      console.log('Socket disconnected in quiz room');
      setSocketConnected(false);
    };
    
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, []);

  // Set up socket event listeners
  useEffect(() => {
    socket.on('playerJoined', (players) => {
      const playerMap = players.reduce((acc, p) => {
        acc[p.id] = p.username;
        return acc;
      }, {});
      setPlayers(playerMap);
    });

    socket.on('scoreUpdate', (newScores) => {
      console.log("Score update received:", newScores);
      setScores(newScores);
      setUpdatedScore(Object.keys(newScores).find(id => 
        newScores[id].score !== scores[id]?.score));
      setTimeout(() => setUpdatedScore(null), 500);
    });

    socket.on('nextQuestion', (index) => {
      console.log("Next question event received:", index);
      setCurrentQuestion(index);
      setTimeLeft(null);
      setAnswer('');
      setQuestionStarted(false);
      
      // Update current question data if we have the questions loaded
      if (sessionInfo && sessionInfo.questions) {
        try {
          const questions = JSON.parse(sessionInfo.questions);
          if (index < questions.length) {
            setCurrentQuestionData(questions[index]);
          }
        } catch (e) {
          console.error("Error updating question data:", e);
        }
      }
    });

    socket.on('quizEnded', (finalScores) => {
      console.log("Quiz ended event received");
      setScores(finalScores);
      // Show final scores in a more elegant way
      // This could be enhanced with a modal or animation
    });

    socket.on('questionStarted', () => {
      console.log("Question started event received");
      setQuestionStarted(true);
      setTimeLeft(30);
    });

    socket.on('quizStateRestored', ({ currentQuestion, totalQuestions, question }) => {
      console.log("Quiz state restored:", { currentQuestion, totalQuestions, question });
      setCurrentQuestion(currentQuestion);
      setTotalQuestions(totalQuestions);
      setCurrentQuestionData(question);
      setQuizStarted(true);
      // Set the state to indicate the question has started if it's in progress
      if (question) {
        setQuestionStarted(true);
      }
    });

    socket.on('error', (errorMessage) => {
      console.error("Socket error:", errorMessage);
      setError(errorMessage);
    });

    // Join the session room when component mounts
    console.log("Joining session:", sessionId);
    socket.emit('joinSession', { sessionId });

    return () => {
      socket.off('playerJoined');
      socket.off('scoreUpdate');
      socket.off('nextQuestion');
      socket.off('quizEnded');
      socket.off('quizStateRestored');
      socket.off('questionStarted');
      socket.off('error');
    };
  }, [sessionId, scores, sessionInfo]);

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
    if (!isCreator) {
      setError('Only the session creator can start questions');
      return;
    }
    
    console.log("Emitting startQuestion event");
    socket.emit('startQuestion', { sessionId });
    setQuestionStarted(true);
    setTimeLeft(30);
  };

  const nextQuestion = () => {
    if (!isCreator) {
      setError('Only the session creator can advance to the next question');
      return;
    }
    
    console.log("Emitting nextQuestion event");
    socket.emit('nextQuestion', { sessionId });
  };

  const endQuiz = () => {
    if (!isCreator) {
      setError('Only the session creator can end the quiz');
      return;
    }
    
    console.log("Emitting endQuiz event");
    socket.emit('endQuiz', { sessionId });
  };

  // Guard clause if not authenticated
  if (!isAuthenticated || !user) return null;
  
  // Show loading state
  if (fetchingQuizData) {
    return (
      <PageContainer>
        <Title>Loading Quiz...</Title>
        <WaitingStateCard>
          <StatusMessage>Fetching quiz data...</StatusMessage>
        </WaitingStateCard>
      </PageContainer>
    );
  }
  
  // If the quiz hasn't started yet, show waiting screen
  if (!quizStarted) {
    return (
      <PageContainer>
        <Title>Quiz Ready!</Title>
        <WaitingStateCard>
          <StatusMessage>Waiting for quiz to start...</StatusMessage>
          <div>
            {isCreator && (
              <Button onClick={() => {
                setQuizStarted(true);
                // For the creator, we need to emit startQuiz to update the status
                socket.emit('startQuiz', { sessionId });
              }}>
                Start Quiz Now
              </Button>
            )}
          </div>
        </WaitingStateCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Title>Quiz Room: {sessionId}</Title>
      
      {error && (
        <ErrorDisplay>{error}</ErrorDisplay>
      )}

      <ProgressIndicator>
        {[...Array(totalQuestions)].map((_, index) => (
          <ProgressDot key={index} $active={index <= currentQuestion} />
        ))}
      </ProgressIndicator>

      <QuestionCard>
        <h2>Question {currentQuestion + 1}</h2>
        {currentQuestionData ? (
          <div>
            <p>{currentQuestionData.question}</p>
            
            {/* Only show options if question has started */}
            {questionStarted && (
              <div>
                {currentQuestionData.options && currentQuestionData.options.map((option, idx) => (
                  <div key={idx} style={{margin: '10px 0'}}>
                    <label>
                      <input 
                        type="radio" 
                        name="answer" 
                        value={option} 
                        checked={answer === option}
                        onChange={() => setAnswer(option)}
                      />
                      {' '}{option}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p>Waiting for question data...</p>
        )}
        
        {questionStarted ? (
          <Form 
            onSubmit={handleAnswerSubmit} 
            error={error}
            style={{ maxWidth: "400px", margin: "0 auto" }}
          >
            {!currentQuestionData?.options && (
              <AnswerInput
                placeholder="Type your answer here..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
            )}
            
            <Button 
              type="submit"
              disabled={!answer.trim()}
            >
              Submit Answer
            </Button>
          </Form>
        ) : (
          <StatusMessage>
            {isCreator 
              ? "Press 'Start Question' below to begin" 
              : "Waiting for host to start the question..."}
          </StatusMessage>
        )}
        
        {questionStarted && timeLeft !== null && (
          <TimerBar $progress={(timeLeft / 30) * 100} />
        )}
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
        
        <Button 
          onClick={() => navigate('/home')} 
          $variant="secondary"
        >
          Exit Quiz
        </Button>
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
          
          {Object.keys(scores).length === 0 && (
            <p>No scores yet. They'll appear as players answer questions.</p>
          )}
        </ScoreList>
      </ScoreBoard>
    </PageContainer>
  );
};

export default QuizRoomPage;