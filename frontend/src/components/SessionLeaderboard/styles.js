import styled, { keyframes } from 'styled-components';
import { Card } from '../shared/StyledComponents';

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

const scaleIn = keyframes`
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
`;

export const LeaderboardModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.75);
  z-index: 1000;
  padding: ${({ theme }) => theme.spacing.md};
  animation: ${scaleIn} 0.3s ease-out;
`;

export const LeaderboardCard = styled(Card)`
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  margin: 0;
  padding: ${({ theme }) => theme.spacing.xl};
  animation: ${slideInUp} 0.5s ease-out;

  &:hover {
    transform: none;
    box-shadow: ${({ theme }) => theme.shadows.large};
  }
`;

export const HeaderSection = styled.div`
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

export const Title = styled.h2`
  font-size: 2rem;
  color: ${({ theme }) => theme.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

export const Subtitle = styled.p`
  font-size: 1.1rem;
  color: ${({ theme }) => theme.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

export const PodiumContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: ${({ theme }) => theme.spacing.md};
  margin: ${({ theme }) => theme.spacing.xl} 0;
  padding: ${({ theme }) => theme.spacing.lg} 0;
`;

const podiumAnimation = keyframes`
  0% { transform: translateY(100px); opacity: 0; }
  60% { transform: translateY(-20px); opacity: 1; }
  100% { transform: translateY(0); opacity: 1; }
`;

export const PodiumPosition = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: ${podiumAnimation} 0.5s ease-out;
  animation-delay: ${({ delay }) => delay}s;
  animation-fill-mode: both;
`;

export const PodiumBlock = styled.div`
  width: ${({ position }) => (position === 1 ? '120px' : '100px')};
  height: ${({ position }) => {
    switch (position) {
      case 1: return '120px';
      case 2: return '90px';
      case 3: return '60px';
      default: return '80px';
    }
  }};
  background: ${({ theme, position }) => {
    switch (position) {
      case 1: return `linear-gradient(135deg, ${theme.background.success}, ${theme.success})`;
      case 2: return `linear-gradient(135deg, ${theme.background.primary}, ${theme.primary})`;
      case 3: return `linear-gradient(135deg, ${theme.background.warning}, ${theme.warning})`;
      default: return theme.background.paper;
    }
  }};
  border-radius: ${({ theme }) => theme.borderRadius};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.md};
  box-shadow: ${({ theme }) => theme.shadows.medium};
`;

export const PlayerAvatar = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: ${({ theme }) => theme.background.paper};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  box-shadow: ${({ theme }) => theme.shadows.small};
`;

export const PlayerName = styled.div`
  font-weight: bold;
  color: ${({ theme }) => theme.text.primary};
  text-align: center;
  margin: ${({ theme }) => theme.spacing.xs} 0;
`;

export const PlayerScore = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.text.secondary};
`;

export const LeaderboardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.xl};
`;

export const EntryCard = styled.div`
  display: flex;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme, $isCurrentUser }) => 
    $isCurrentUser ? `${theme.background.accent}33` : theme.background.paper};
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: ${({ theme }) => theme.shadows.small};
  animation: ${slideInUp} 0.5s ease-out;
  animation-delay: ${({ index }) => index * 0.1}s;
  animation-fill-mode: both;

  &:hover {
    transform: translateX(10px);
    transition: transform 0.2s ease;
  }
`;

export const Rank = styled.div`
  width: 36px;
  height: 36px;
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

export const ScoreSection = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.md};
`;

export const ScoreBar = styled.div`
  flex: 1;
  height: 8px;
  background: ${({ theme }) => theme.background.accent};
  border-radius: 4px;
  overflow: hidden;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: ${({ progress }) => progress}%;
    background: ${({ theme }) => theme.primary};
    border-radius: 4px;
    transition: width 1s ease-out;
  }
`;

export const Score = styled.div`
  font-size: 1.2rem;
  font-weight: bold;
  color: ${({ theme }) => theme.text.accent};
  min-width: 80px;
  text-align: right;
`;

export const ButtonGroup = styled.div`
  display: flex;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.xl};
`;