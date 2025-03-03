import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/axios';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../shared/LoadingSpinner';
import QuizItem from './QuizItem';
import { 
  PanelContainer, 
  PanelHeader, 
  EmptyState, 
  LoadingContainer,
  ErrorMessage
} from './styles';
import { handleApiError } from '../../utils/errorHandler';

const UserQuizzesPanel = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch quizzes and sessions
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        setError('');
        
        // Fetch all quizzes and all sessions in parallel
        const [quizzesResponse, sessionsResponse] = await Promise.all([
          api.get('/quizzes/all'), // Endpoint to get all quizzes, not just user's
          api.get('/sessions/all') // Endpoint to get all sessions, not just user's
        ]);
        
        setQuizzes(quizzesResponse.data.data || quizzesResponse.data);
        setSessions(sessionsResponse.data);
      } catch (error) {
        handleApiError(error, setError);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Update creator names for quizzes where the current user is the creator
  useEffect(() => {
    if (!user || quizzes.length === 0) return;
    
    // Mark quizzes created by the current user with "You" as creator name
    setQuizzes(prevQuizzes =>
      prevQuizzes.map(quiz => {
        if (quiz.creator_id === user.id) {
          return {
            ...quiz,
            creator_name: quiz.creator_name ? `${quiz.creator_name} (You)` : 'You'
          };
        }
        return quiz;
      })
    );
  }, [quizzes.length, user]);

  // Map sessions to quizzes
  const quizzesWithSessions = quizzes.map(quiz => ({
    ...quiz,
    sessions: sessions.filter(session => session.quiz_id === quiz.id)
  }));

  // Handler for creating a new session
  const handleCreateSession = async (quizId) => {
    try {
      setError('');
      const response = await api.post('/sessions', { quizId });
      
      if (response.data && response.data.sessionId) {
        // Add the new session to the state
        const newSession = {
          id: response.data.sessionId,
          quiz_id: quizId,
          creator_id: user.id,
          status: 'waiting'
        };
        
        setSessions(prevSessions => [...prevSessions, newSession]);
        
        // Navigate to the lobby
        navigate(`/lobby/${response.data.sessionId}`);
      }
    } catch (error) {
      handleApiError(error, setError);
    }
  };

  // Handler for deleting a quiz
  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm("Are you sure you want to delete this quiz? This will also delete all associated sessions.")) {
      return;
    }
    
    try {
      setError('');
      await api.delete(`/quizzes/${quizId}`);
      
      // Remove the quiz and associated sessions from state
      setQuizzes(prevQuizzes => prevQuizzes.filter(quiz => quiz.id !== quizId));
      setSessions(prevSessions => prevSessions.filter(session => session.quiz_id !== quizId));
    } catch (error) {
      handleApiError(error, setError);
    }
  };

  if (isLoading) {
    return (
      <LoadingContainer>
        <LoadingSpinner />
      </LoadingContainer>
    );
  }

  return (
    <PanelContainer>
      <PanelHeader>
        <h2>All Quizzes</h2>
      </PanelHeader>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
      
      {quizzesWithSessions.length === 0 ? (
        <EmptyState>
          <p>No quizzes available.</p>
        </EmptyState>
      ) : (
        quizzesWithSessions.map(quiz => (
          <QuizItem
            key={quiz.id}
            quiz={quiz}
            currentUser={user}
            onCreateSession={() => handleCreateSession(quiz.id)}
            onDeleteQuiz={() => handleDeleteQuiz(quiz.id)}
          />
        ))
      )}
    </PanelContainer>
  );
};

export default UserQuizzesPanel;