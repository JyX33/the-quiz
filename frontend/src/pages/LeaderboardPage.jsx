import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styled from 'styled-components';

const Container = styled.div`
  padding: 20px;
  background: ${(props) => props.theme.background};
  min-height: 100vh;
`;

const LeaderboardPage = () => {
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    axios
      .get('http://localhost:5000/api/leaderboard')
      .then((res) => setLeaderboard(res.data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <Container>
      <h1>Leaderboard</h1>
      <ul>
        {leaderboard.map((entry, index) => (
          <li key={index}>
            {entry.username}: {entry.total_score}
          </li>
        ))}
      </ul>
    </Container>
  );
};

export default LeaderboardPage;