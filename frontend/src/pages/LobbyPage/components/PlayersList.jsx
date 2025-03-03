import PropTypes from 'prop-types';
import {
    Avatar,
    PlayerCard,
    PlayerGrid,
    PlayerInfo,
    PlayerName,
    PlayerStatus
} from '../styles';

const PlayersList = ({ players, currentUserId, creatorId, socketIsConnected }) => {
  if (players.length === 0) {
    return (
      <p>No players have joined yet. {socketIsConnected ? 'Waiting for players...' : 'Socket disconnected.'}</p>
    );
  }

  return (
    <PlayerGrid>
      {players.map((player) => (
        <PlayerCard
          key={player.id}
          $isHost={(player.id === creatorId)}
          $isNew={player === players[players.length - 1]}
        >
          <Avatar>
            {player.username.charAt(0).toUpperCase()}
          </Avatar>
          <PlayerInfo>
            <PlayerName>
              {player.id === currentUserId ? `${player.username} (You)` : player.username}
            </PlayerName>
            <PlayerStatus>
              {player.id === creatorId ? 'Host' : 'Ready'}
            </PlayerStatus>
          </PlayerInfo>
        </PlayerCard>
      ))}
    </PlayerGrid>
  );
};
PlayersList.propTypes = {
  players: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired
  })).isRequired,
  currentUserId: PropTypes.string.isRequired,
  creatorId: PropTypes.string.isRequired,
  socketIsConnected: PropTypes.bool.isRequired
};

export default PlayersList;
