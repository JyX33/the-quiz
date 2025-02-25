import { useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import ConnectionStatus from '../components/ConnectionStatus';
import GlobalErrorBoundary from '../components/GlobalErrorBoundary';
import ProtectedRoute from '../components/ProtectedRoute';
import TokenExpirationAlert from '../components/TokenExpirationAlert';
import { AuthProvider } from '../contexts/AuthContext';
import CreateQuizPage from '../pages/CreateQuizPage';
import HomePage from '../pages/HomePage';
import LeaderboardPage from '../pages/LeaderboardPage';
import LobbyPage from '../pages/LobbyPage';
import LoginPage from '../pages/LoginPage';
import QuizRoomPage from '../pages/QuizRoomPage';
import RegisterPage from '../pages/RegisterPage';
import { allianceTheme, hordeTheme } from '../styles/themes';

function App() {
  const [theme, setTheme] = useState(allianceTheme);

  return (
    <GlobalErrorBoundary>
      <ThemeProvider theme={theme}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route 
              path="/home" 
              element={
                <ProtectedRoute>
                  <HomePage updateTheme={newTheme => setTheme(
                    newTheme === 'Horde' ? hordeTheme : allianceTheme
                  )} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/lobby/:sessionId" 
              element={
                <ProtectedRoute>
                  <LobbyPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/quiz/:sessionId" 
              element={
                <ProtectedRoute>
                  <QuizRoomPage />
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
        </AuthProvider>
      </ThemeProvider>
    </GlobalErrorBoundary>
  );
}

export default App;