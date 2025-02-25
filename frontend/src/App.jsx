import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import ConnectionStatus from './components/ConnectionStatus';
import ProtectedRoute from './components/ProtectedRoute';
import TokenExpirationAlert from './components/TokenExpirationAlert';
import CreateQuizPage from './pages/CreateQuizPage';
import HomePage from './pages/HomePage';
import LeaderboardPage from './pages/LeaderboardPage';
import LobbyPage from './pages/LobbyPage';
import LoginPage from './pages/LoginPage';
import QuizRoomPage from './pages/QuizRoomPage';
import RegisterPage from './pages/RegisterPage';
import { allianceTheme, hordeTheme } from './styles/themes';
import api from './utils/axios';
import { handleApiError } from './utils/errorHandler';

function App() {
  const [theme, setTheme] = useState(allianceTheme);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      try {
        const res = await api.get('/users/me');
        setUser(res.data);
        setTheme(res.data.theme === 'Horde' ? hordeTheme : allianceTheme);
      } catch (err) {
        // Only show error if it's not a 401 (unauthenticated) error
        if (err.response?.status !== 401) {
          handleApiError(err, setError);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const updateTheme = async (newTheme) => {
    try {
      setTheme(newTheme === 'Horde' ? hordeTheme : allianceTheme);
      await api.put('/users/me/theme', { theme: newTheme });
      setUser(prev => ({
        ...prev,
        theme: newTheme
      }));
    } catch (err) {
      console.error(err);
      setError('Failed to update theme');
    }
  };

  return (
    <ThemeProvider theme={theme}>
      {error && (
        <div style={{ 
          color: 'red', 
          padding: '10px', 
          backgroundColor: '#ffeeee', 
          textAlign: 'center',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000
        }}>
          {error}
        </div>
      )}
      
      {isLoading ? (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh' 
        }}>
          Loading...
        </div>
      ) : (
        <Routes>
          <Route path="/" element={<LoginPage setUser={setUser} />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route 
            path="/home" 
            element={
              <ProtectedRoute>
                <HomePage user={user} updateTheme={updateTheme} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/lobby/:sessionId" 
            element={
              <ProtectedRoute>
                <LobbyPage user={user} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/quiz/:sessionId" 
            element={
              <ProtectedRoute>
                <QuizRoomPage user={user} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/create-quiz" 
            element={
              <ProtectedRoute>
                <CreateQuizPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/leaderboard" 
            element={
              <ProtectedRoute>
                <LeaderboardPage />
              </ProtectedRoute>
            } 
          />
        </Routes>
      )}
      <TokenExpirationAlert warningTime={5 * 60 * 1000} />
      <ConnectionStatus />
    </ThemeProvider>
  );
}

export default App;