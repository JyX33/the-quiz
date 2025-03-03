import React from 'react';
import PropTypes from 'prop-types';
import { FaTrophy, FaMedal } from 'react-icons/fa';
import { Button } from '../shared/StyledComponents';
import {
  LeaderboardModal,
  LeaderboardCard,
  HeaderSection,
  Title,
  Subtitle,
  PodiumContainer,
  PodiumPosition,
  PodiumBlock,
  PlayerAvatar,
  PlayerName,
  PlayerScore,
  LeaderboardList,
  EntryCard,
  Rank,
  ScoreSection,
  ScoreBar,
  Score,
  ButtonGroup,
} from './styles';

const MedalIcon = ({ position }) => {
  switch (position) {
    case 1:
      return <FaTrophy color="#FFD700" size={24} />;
    case 2:
      return <FaMedal color="#C0C0C0" size={24} />;
    case 3:
      return <FaMedal color="#CD7F32" size={24} />;
    default:
      return null;
  }
};

MedalIcon.propTypes = {
  position: PropTypes.number.isRequired,
};

const SessionLeaderboard = ({
  scores,
  players,
  currentUser,
  onClose,
  onPlayAgain,
  questionCount,
}) => {
  const sortedPlayers = React.useMemo(() => {
    return Object.entries(scores)
      .map(([userId, data]) => ({
        id: userId,
        name: userId === currentUser.id ? `${currentUser.username} (You)` : (players[userId] || "Unknown Player"),
        score: data.score,
        isCurrentUser: userId === currentUser.id
      }))
      .sort((a, b) => b.score - a.score);
  }, [scores, players, currentUser]);

  const maxScore = React.useMemo(() => {
    return Math.max(...sortedPlayers.map(player => player.score));
  }, [sortedPlayers]);

  const getAchievementText = (position) => {
    switch (position) {
      case 0:
        return "Quiz Champion! 🏆";
      case 1:
        return "Outstanding Performance! 🥈";
      case 2:
        return "Excellent Work! 🥉";
      default:
        return "Well Played!";
    }
  };

  return (
    <LeaderboardModal>
      <LeaderboardCard>
        <HeaderSection>
          <Title>Quiz Complete!</Title>
          <Subtitle>
            Final Results - {questionCount} Questions
          </Subtitle>
        </HeaderSection>

        {/* Podium for top 3 */}
        <PodiumContainer>
          {sortedPlayers.slice(0, 3).map((player, index) => (
            <PodiumPosition key={player.id} delay={index * 0.2}>
              <PlayerAvatar>
                <MedalIcon position={index + 1} />
              </PlayerAvatar>
              <PodiumBlock position={index + 1}>
                <PlayerName>{player.name}</PlayerName>
                <PlayerScore>{player.score} pts</PlayerScore>
              </PodiumBlock>
            </PodiumPosition>
          ))}
        </PodiumContainer>

        {/* Full leaderboard list */}
        <LeaderboardList>
          {sortedPlayers.map((player, index) => (
            <EntryCard 
              key={player.id} 
              index={index}
              $isCurrentUser={player.isCurrentUser}
            >
              <Rank rank={index + 1}>{index + 1}</Rank>
              <ScoreSection>
                <div>
                  <PlayerName>{player.name}</PlayerName>
                  <small>{getAchievementText(index)}</small>
                </div>
                <ScoreBar progress={(player.score / maxScore) * 100} />
                <Score>{player.score}</Score>
              </ScoreSection>
            </EntryCard>
          ))}
        </LeaderboardList>

        <ButtonGroup>
          <Button onClick={onPlayAgain} $variant="secondary">
            Play Again
          </Button>
          <Button onClick={onClose}>
            Return to Home
          </Button>
        </ButtonGroup>
      </LeaderboardCard>
    </LeaderboardModal>
  );
};

SessionLeaderboard.propTypes = {
  scores: PropTypes.objectOf(PropTypes.shape({
    score: PropTypes.number.isRequired,
  })).isRequired,
  players: PropTypes.objectOf(PropTypes.string).isRequired,
  currentUser: PropTypes.shape({
    id: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onPlayAgain: PropTypes.func.isRequired,
  questionCount: PropTypes.number.isRequired,
};

export default SessionLeaderboard;