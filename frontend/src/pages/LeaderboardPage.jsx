import { useState, useEffect } from 'react';
import axios from 'axios';
import styled, { keyframes } from 'styled-components';
import {
  PageContainer,
  Title,
  Card,
} from '../components/shared/StyledComponents';

const slideInUp = keyframes`
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

const LeaderboardCard = styled(Card)`
  max-width: 800px;
  margin: 2rem auto;
`;

const LeaderboardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const EntryCard = styled.div`
  display: flex;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.background.paper};
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: ${({ theme }) => theme.boxShadow};
  animation: ${slideInUp} 0.5s ease-out;
  animation-delay: ${({ index }) => `${index * 0.1}s`};
  animation-fill-mode: both;
  transition: transform 0.2s ease;

  &:hover {
    transform: translateX(10px);
  }

  ${({ isTop3, theme }) => isTop3 && `
    background: linear-gradient(
      135deg,
      ${theme.background.paper} 0%,
      ${theme.background.accent} 100%
    );
    transform: scale(1.02);
  `}
`;

const Rank = styled.div`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: bold;
  margin-right: ${({ theme }) => theme.spacing.md};
  background: ${({ rank, theme }) => {
    if (rank === 1) return theme.success;
    if (rank === 2) return theme.primary;
    if (rank === 3) return theme.warning;
    return theme.background.accent;
  }};
  color: ${({ theme }) => theme.text.primary};
`;

const UserInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const Username = styled.div`
  font-weight: ${({ theme }) => theme.typography.heading.weight};
  color: ${({ theme }) => theme.text.primary};
`;

const Stats = styled.div`
  color: ${({ theme }) => theme.text.secondary};
  font-size: 0.9rem;
`;

const Score = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  color: ${({ theme }) => theme.text.accent};
  padding: ${({ theme }) => theme.spacing.sm};
  min-width: 100px;
  text-align: right;
`;

const ScoreBar = styled.div`
  height: 4px;
  background: ${({ theme }) => `${theme.primary}22`};
  border-radius: 2px;
  margin-top: ${({ theme }) => theme.spacing.xs};
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: ${({ progress }) => progress}%;
    background: ${({ theme }) => theme.primary};
    transition: width 1s ease-out;
  }
`;

const LeaderboardPage = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [maxScore, setMaxScore] = useState(0);

  useEffect(() => {
    axios
      .get('http://localhost:5000/api/leaderboard')
      .then((res) => {
        setLeaderboard(res.data);
        const highestScore = Math.max(...res.data.map(entry => entry.total_score));
        setMaxScore(highestScore);
      })
      .catch((err) => console.error(err));
  }, []);

  const getRankSuffix = (rank) => {
    if (rank === 1) return 'st';
    if (rank === 2) return 'nd';
    if (rank === 3) return 'rd';
    return 'th';
  };

  return (
    <PageContainer>
      <Title>Global Leaderboard</Title>
      <LeaderboardCard>
        <LeaderboardList>
          {leaderboard.map((entry, index) => (
            <EntryCard key={index} index={index} isTop3={index < 3}>
              <Rank rank={index + 1}>
                {index + 1}
              </Rank>
              <UserInfo>
                <Username>{entry.username}</Username>
                <Stats>
                  Rank: {index + 1}{getRankSuffix(index + 1)} Place
                </Stats>
                <ScoreBar progress={(entry.total_score / maxScore) * 100} />
              </UserInfo>
              <Score>
                {entry.total_score}
                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>points</div>
              </Score>
            </EntryCard>
          ))}
        </LeaderboardList>
      </LeaderboardCard>
    </PageContainer>
  );
};

export default LeaderboardPage;
