import axios from 'axios';
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
import { getValidToken } from './utils/auth';

function App() {
  const [theme, setTheme] = useState(allianceTheme);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getValidToken();
    if (token) {
      axios
        .get('http://localhost:5000/api/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          setUser(res.data);
          setTheme(res.data.theme === 'Horde' ? hordeTheme : allianceTheme);
        })
        .catch((err) => console.error(err))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const updateTheme = (newTheme) => {
    setTheme(newTheme === 'Horde' ? hordeTheme : allianceTheme);
    const token = getValidToken();
    if (token) {
      axios
        .put(
          'http://localhost:5000/api/users/me/theme',
          { theme: newTheme },
          { headers: { Authorization: `Bearer ${token}` } }
        )
        .then(() => {
          setUser(prev => ({
            ...prev,
            theme: newTheme
          }));
        })
        .catch((err) => console.error(err));
    }
  };

  return (
    <ThemeProvider theme={theme}>
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
      <TokenExpirationAlert warningTime={5 * 60 * 1000} />
      <ConnectionStatus />
    </ThemeProvider>
  );
}

export default App;
