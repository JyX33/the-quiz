import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import { FiClock } from 'react-icons/fi';
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
import SessionLeaderboard from '../components/SessionLeaderboard';

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

const ClockContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  font-weight: bold;
  margin: ${({ theme }) => theme.spacing.md} 0;
  color: ${({ theme, $urgency }) => 
    $urgency === 'high' ? theme.error :
    $urgency === 'medium' ? theme.warning :
    theme.text};
  transition: color 0.5s ease;
  
  svg {
    margin-right: 8px;
    ${({ $urgency }) => $urgency === 'high' && css`
      animation: ${pulse} 0.5s infinite;
    `}
  }
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

const BonusButton = styled(Button)`
  background: ${({ theme, $active }) =>
    $active ? theme.success + '44' : theme.warning + '44'};
  border: 2px solid ${({ theme, $active }) =>
    $active ? theme.success : theme.warning};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const BonusInfo = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const BonusCount = styled.span`
  font-weight: bold;
  color: ${({ theme }) => theme.warning};
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

const OptionContainer = styled.div`
  margin: 10px 0;
  padding: 12px;
  border-radius: ${({ theme }) => theme.borderRadius};
  transition: background-color 0.2s;
  cursor: pointer;
  text-align: left;
  
  &:hover {
    background-color: ${({ theme }) => theme.background.accent + '33'};
  }
`;

const QuizRoomPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answer, setAnswer] = useState('');
  const [scores, setScores] = useState({});
  const [players, setPlayers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [questionStarted, setQuestionStarted] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [updatedScore, setUpdatedScore] = useState(null);
  const [currentQuestionData, setCurrentQuestionData] = useState(null);
  const [error, setError] = useState('');
  const [sessionInfo, setSessionInfo] = useState(null);
  const [isCreator, setIsCreator] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [fetchingQuizData, setFetchingQuizData] = useState(true);
  const [, setSocketConnected] = useState(socket.connected);
  const [hasSubmittedAnswer, setHasSubmittedAnswer] = useState(false);
  const [submittedAnswer, setSubmittedAnswer] = useState('');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [bonusesRemaining, setBonusesRemaining] = useState(3);
  const [isBonusActive, setIsBonusActive] = useState(false);
  
  const hasJoinedRef = useRef(false);
  const socketEventsSetupRef = useRef(false);
  
  const { user, isAuthenticated } = useAuth();

  const activateBonus = useCallback(() => {
    if (bonusesRemaining > 0 && !isBonusActive && !hasSubmittedAnswer) {
      socket.emit('activateBonus', { sessionId });
    }
  }, [bonusesRemaining, isBonusActive, hasSubmittedAnswer, sessionId]);

  const submitAnswer = useCallback((auto = false) => {
    if (hasSubmittedAnswer) {
      return;
    }

    if (!auto && !answer.trim()) {
      setError('Please enter an answer');
      return;
    }
    
    setError('');
    
    const submission = (!answer.trim() && auto) ? "NO_RESPONSE" : answer.trim();
    console.log("Submitting answer:", submission);
    socket.emit('submitAnswer', { sessionId, answer: submission });
    
    setSubmittedAnswer(submission);
    setHasSubmittedAnswer(true);
  }, [answer, sessionId, hasSubmittedAnswer, setError]);

  useEffect(() => {
    if (!sessionId || !user) return;
    
    const fetchSessionDetails = async () => {
      try {
        setFetchingQuizData(true);
        const response = await api.get(`/sessions/${sessionId}`);
        const sessionData = response.data;
        
        console.log('Session data loaded:', sessionData);
        setSessionInfo(sessionData);
        
        const userIsCreator = sessionData.creator_id === user.id;
        console.log('Creator check:', {
          userId: user.id,
          creatorId: sessionData.creator_id,
          isCreator: userIsCreator
        });
        
        setIsCreator(userIsCreator);
        
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

  useEffect(() => {
    const handleConnect = () => {
      console.log('Socket connected in quiz room');
      setSocketConnected(true);
      
      if (!hasJoinedRef.current && sessionId) {
        console.log("Socket connected, attempting to join session:", sessionId);
        socket.emit('joinSession', { sessionId });
        hasJoinedRef.current = true;
      }
    };
    
    const handleDisconnect = () => {
      console.log('Socket disconnected in quiz room');
      setSocketConnected(false);
    };
    
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    
    if (socket.connected && !hasJoinedRef.current && sessionId) {
      console.log("Socket already connected, joining session:", sessionId);
      socket.emit('joinSession', { sessionId });
      hasJoinedRef.current = true;
    }
    
    return () => {
      console.log("Removing socket connection handlers");
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [sessionId]);

  useEffect(() => {
    if (socketEventsSetupRef.current) {
      console.log("Socket events already set up, skipping");
      return;
    }
    
    console.log("Setting up socket event listeners");
    socketEventsSetupRef.current = true;
    
    const handlePlayerJoined = (updatedPlayers) => {
      console.log("Player joined event received:", updatedPlayers);
      const playerMap = updatedPlayers.reduce((acc, p) => {
        acc[p.id] = p.username;
        return acc;
      }, {});
      setPlayers(playerMap);
    };
    
    const handleScoreUpdate = (newScores) => {
      console.log("Score update received:", newScores);
      setScores(prev => {
        const updated = Object.keys(newScores).find(id => 
          newScores[id]?.score !== prev[id]?.score);
        
        setUpdatedScore(updated);
        setTimeout(() => setUpdatedScore(null), 500);
        
        return newScores;
      });
    };
    
    const handleNextQuestion = (index) => {
      console.log("Next question event received:", index);
      setCurrentQuestion(index);
      setTimeLeft(null);
      setAnswer('');
      setQuestionStarted(false);
      setHasSubmittedAnswer(false);
      setSubmittedAnswer('');
      setIsBonusActive(false); // Reset bonus state for new question
      
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
    };
    
    const handleQuizEnded = (finalScores) => {
      console.log("Quiz ended event received");
      setScores(finalScores);
      setShowLeaderboard(true);
    };
    
    const handleQuestionStarted = () => {
      console.log("Question started event received");
      setQuestionStarted(true);
      setTimeLeft(30);
    };
    
    const handleQuizStateRestored = ({ currentQuestion, totalQuestions, question }) => {
      console.log("Quiz state restored:", { currentQuestion, totalQuestions, question });
      setCurrentQuestion(currentQuestion);
      setTotalQuestions(totalQuestions);
      setCurrentQuestionData(question);
      setQuizStarted(true);
      setQuestionStarted(false);
    };
    
    const handleError = (errorMessage) => {
      console.error("Socket error:", errorMessage);
      setError(errorMessage);
    };
    
    socket.on('playerJoined', handlePlayerJoined);
    socket.on('scoreUpdate', handleScoreUpdate);
    socket.on('nextQuestion', handleNextQuestion);
    socket.on('quizEnded', handleQuizEnded);
    const handleBonusInfo = (bonusData) => {
      console.log("Bonus info received:", bonusData);
      setBonusesRemaining(bonusData.bonusesRemaining);
      setIsBonusActive(bonusData.bonusActive);
    };

    socket.on('questionStarted', handleQuestionStarted);
    socket.on('quizStateRestored', handleQuizStateRestored);
    socket.on('error', handleError);
    socket.on('bonusInfo', handleBonusInfo);
    
    return () => {
      console.log("Cleaning up socket event listeners");
      socket.off('playerJoined', handlePlayerJoined);
      socket.off('scoreUpdate', handleScoreUpdate);
      socket.off('nextQuestion', handleNextQuestion);
      socket.off('quizEnded', handleQuizEnded);
      socket.off('questionStarted', handleQuestionStarted);
      socket.off('quizStateRestored', handleQuizStateRestored);
      socket.off('error', handleError);
      socket.off('bonusInfo', handleBonusInfo);
      
      socketEventsSetupRef.current = false;
    };
  }, [sessionInfo]);

  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0) {
      submitAnswer(true);
    }
  }, [submitAnswer, timeLeft]);

  const handleAnswerSubmit = () => {
    submitAnswer();
  };

  const startQuestion = useCallback(() => {
    if (!isCreator) {
      setError('Only the session creator can start questions');
      return;
    }
    
    console.log("Emitting startQuestion event");
    socket.emit('startQuestion', { sessionId });
  }, [isCreator, sessionId]);

  const nextQuestion = useCallback(() => {
    if (!isCreator) {
      setError('Only the session creator can advance to the next question');
      return;
    }
    
    console.log("Emitting nextQuestion event");
    socket.emit('nextQuestion', { sessionId });
  }, [isCreator, sessionId]);

  const endQuiz = useCallback(() => {
    if (!isCreator) {
      setError('Only the session creator can end the quiz');
      return;
    }
    
    console.log("Emitting endQuiz event");
    socket.emit('endQuiz', { sessionId });
  }, [isCreator, sessionId]);

  const handlePlayAgain = useCallback(() => {
    setShowLeaderboard(false);
    setQuizStarted(false);
    setCurrentQuestion(0);
    setScores({});
    socket.emit('restartQuiz', { sessionId });
  }, [sessionId]);

  const getUrgencyLevel = () => {
    if (!timeLeft || timeLeft > 15) return 'low';
    if (timeLeft > 5) return 'medium';
    return 'high';
  };

  if (!isAuthenticated || !user) return null;
  
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

  if (showLeaderboard) {
    return (
      <SessionLeaderboard
        scores={scores}
        players={players}
        currentUser={user}
        onClose={() => navigate('/home')}
        onPlayAgain={handlePlayAgain}
        questionCount={totalQuestions}
      />
    );
  }
  
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
            
            {questionStarted && currentQuestionData.options && (
              <div>
                {currentQuestionData.options.map((option, idx) => (
                  <OptionContainer
                    key={idx}
                    onClick={() => !hasSubmittedAnswer && setAnswer(option)}
                    style={{
                      backgroundColor: (hasSubmittedAnswer && submittedAnswer === option) ? '#e8f5e9' :
                                     answer === option ? '#e3f2fd' : 'transparent',
                      border: (hasSubmittedAnswer && submittedAnswer === option) ? '2px solid #4caf50' :
                             answer === option ? '1px solid #0070dd' : '1px solid transparent',
                      cursor: hasSubmittedAnswer ? 'default' : 'pointer',
                      opacity: hasSubmittedAnswer && submittedAnswer !== option ? 0.6 : 1
                    }}
                  >
                    <label style={{ cursor: hasSubmittedAnswer ? 'default' : 'pointer', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="radio"
                        name="answer"
                        value={option}
                        checked={hasSubmittedAnswer ? submittedAnswer === option : answer === option}
                        onChange={() => !hasSubmittedAnswer && setAnswer(option)}
                        disabled={hasSubmittedAnswer}
                        style={{ marginRight: '10px' }}
                      />
                      {option}
                    </label>
                  </OptionContainer>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p>Waiting for question data...</p>
        )}
        
        {questionStarted ? (
          <>
            {timeLeft !== null && (
                <ClockContainer $urgency={getUrgencyLevel()}>
                  <FiClock />
                  {timeLeft} seconds remaining
                </ClockContainer>
              )}

            <BonusInfo>
              <BonusCount>
                {bonusesRemaining} bonus{bonusesRemaining !== 1 ? 'es' : ''} remaining
              </BonusCount>
              <BonusButton
                onClick={activateBonus}
                disabled={bonusesRemaining === 0 || isBonusActive || hasSubmittedAnswer}
                $active={isBonusActive}
              >
                {isBonusActive ? '2x Points Active!' : 'Activate 2x Points'}
              </BonusButton>
            </BonusInfo>
            
            <Form
              onSubmit={handleAnswerSubmit} 
              error={error}
              style={{ maxWidth: "400px", margin: "0 auto" }}
            >
              {!currentQuestionData?.options && (
                <>
                  {hasSubmittedAnswer ? (
                    <div style={{
                      padding: '10px',
                      margin: '10px 0',
                      backgroundColor: '#e8f5e9',
                      border: '2px solid #4caf50',
                      borderRadius: '4px',
                      textAlign: 'center'
                    }}>
                      Submitted Answer: {submittedAnswer}
                    </div>
                  ) : (
                    <AnswerInput
                      placeholder="Type your answer here..."
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      disabled={hasSubmittedAnswer}
                    />
                  )}
                </>
              )}
              
              <Button
                type="submit"
                disabled={hasSubmittedAnswer || !answer.trim()}
              >
                {hasSubmittedAnswer ? 'Answer Submitted' : 'Submit Answer'}
              </Button>
            </Form>
          </>
        ) : (
          <StatusMessage>
            {isCreator 
              ? "Press 'Start Question' below to begin" 
              : "Waiting for host to start the question..."}
          </StatusMessage>
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
            <p>No scores yet. They&apos;ll appear as players answer questions.</p>
          )}
        </ScoreList>
      </ScoreBoard>
    </PageContainer>
  );
};

export default QuizRoomPage;