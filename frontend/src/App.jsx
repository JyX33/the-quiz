import React, { useState, useEffect } from 'react';
import { ThemeProvider } from 'styled-components';
import { Routes, Route } from 'react-router-dom';
import axios from 'axios';
import { allianceTheme, hordeTheme } from './styles/themes';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import LobbyPage from './pages/LobbyPage';
import QuizRoomPage from './pages/QuizRoomPage';
import LeaderboardPage from './pages/LeaderboardPage';

function App() {
  const [theme, setTheme] = useState(allianceTheme);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios
        .get('http://localhost:5000/api/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          setUser(res.data);
          setTheme(res.data.theme === 'Horde' ? hordeTheme : allianceTheme);
        })
        .catch((err) => console.error(err));
    }
  }, []);

  const updateTheme = (newTheme) => {
    setTheme(newTheme === 'Horde' ? hordeTheme : allianceTheme);
    axios
      .put(
        'http://localhost:5000/api/users/me/theme',
        { theme: newTheme },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      )
      .then(() => console.log('Theme updated'))
      .catch((err) => console.error(err));
  };

  return (
    <ThemeProvider theme={theme}>
      <Routes>
        <Route path="/" element={<LoginPage setUser={setUser} />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/home" element={<HomePage user={user} updateTheme={updateTheme} />} />
        <Route path="/lobby/:sessionId" element={<LobbyPage user={user} />} />
        <Route path="/quiz/:sessionId" element={<QuizRoomPage user={user} />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;