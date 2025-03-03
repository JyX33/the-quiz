import styled, { css, keyframes } from 'styled-components';
import { Button, Card } from '../../components/shared/StyledComponents';

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const LobbyCard = styled(Card)`
  max-width: 800px;
  margin: 2rem auto;
  padding: ${({ theme }) => theme.spacing.lg};
`;

export const PlayerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
`;

export const PlayerCard = styled.div`
  background: ${({ theme }) => theme.background.paper};
  border-radius: ${({ theme }) => theme.borderRadius};
  padding: ${({ theme }) => theme.spacing.md};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  animation: ${fadeIn} 0.3s ease-out;
  border: 2px solid ${({ $isHost, theme }) => 
    $isHost ? theme.primary : 'transparent'};
  position: relative;
  
  ${({ $isNew }) => $isNew && css`
    animation: ${pulse} 0.5s ease-out;
  `}
`;

export const Avatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ theme }) => theme.background.accent};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: ${({ theme }) => theme.text.primary};
`;

export const PlayerInfo = styled.div`
  flex: 1;
`;

export const PlayerName = styled.div`
  font-weight: ${({ theme }) => theme.typography.heading.weight};
  color: ${({ theme }) => theme.text.primary};
`;

export const PlayerStatus = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.text.secondary};
`;

export const CountdownTimer = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 6rem;
  font-weight: bold;
  color: ${({ theme }) => theme.primary};
  animation: ${pulse} 1s ease-in-out infinite;
  z-index: 10;
  text-shadow: 0 0 20px ${({ theme }) => `${theme.primary}66`};
`;

export const StartButton = styled(Button)`
  width: 100%;
  margin-top: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md};
  font-size: 1.2rem;
  position: relative;
  overflow: hidden;
  
  &:after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: ${({ $progress }) => $progress}%;
    height: 100%;
    background: ${({ theme }) => `${theme.background.accent}22`};
    transition: width 1s linear;
  }
`;

export const ReconnectButton = styled(Button)`
  margin-top: ${({ theme }) => theme.spacing.md};
`;

export const ErrorDisplay = styled.div`
  color: ${({ theme }) => theme.error};
  background: ${({ theme }) => theme.error + '11'};
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

export const StatusBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  margin-left: 8px;
  background: ${({ theme }) => theme.primary};
  color: white;
`;

export const HostMessage = styled.div`
  margin-bottom: 12px;
  font-style: italic;
  color: #666;
`;
