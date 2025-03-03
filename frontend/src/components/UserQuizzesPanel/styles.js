import styled from 'styled-components';

export const PanelContainer = styled.div`
  background-color: ${({ theme }) => theme.background.secondary};
  border-radius: ${({ theme }) => theme.borderRadius};
  padding: ${({ theme }) => theme.spacing.md};
  margin: ${({ theme }) => theme.spacing.md} 0;
  box-shadow: ${({ theme }) => theme.shadows.medium};
`;

export const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  
  h2 {
    color: ${({ theme }) => theme.text.primary};
    margin: 0;
  }
`;

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.lg};
  text-align: center;
  color: ${({ theme }) => theme.text.secondary};
`;

export const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
`;

export const ErrorMessage = styled.div`
  color: ${({ theme }) => theme.error};
  background-color: ${({ theme }) => theme.background.error};
  padding: ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

export const QuizItemContainer = styled.div`
  background-color: ${({ theme }) => theme.background.primary};
  border-radius: ${({ theme }) => theme.borderRadius};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  overflow: hidden;
  box-shadow: ${({ theme }) => theme.shadows.small};
`;

export const QuizHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme }) => theme.background.accent};
`;

export const QuizDetails = styled.div`
  h3 {
    margin: 0 0 ${({ theme }) => theme.spacing.xs} 0;
    color: ${({ theme }) => theme.text.primary};
  }
  
  div {
    display: flex;
    gap: ${({ theme }) => theme.spacing.xs};
  }
`;

export const ActionButtons = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.xs};
`;

export const ToggleButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.text.primary};
  font-size: 1.2rem;
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing.xs};
  
  &:hover {
    color: ${({ theme }) => theme.text.highlight};
  }
`;

export const SessionsList = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
`;

export const SessionItemContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.sm};
  border-bottom: 1px solid ${({ theme }) => theme.border.light};
  
  &:last-child {
    border-bottom: none;
  }
`;

export const SessionDetails = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
`;

export const StatusBadge = styled.span`
  display: inline-block;
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
  font-size: 0.8rem;
  border-radius: ${({ theme }) => theme.borderRadius};
  
  ${({ color, theme }) => {
    if (color === 'info') {
      return `
        background-color: ${theme.background.info};
        color: ${theme.text.info};
      `;
    } else if (color === 'success') {
      return `
        background-color: ${theme.background.success};
        color: ${theme.text.success};
      `;
    } else if (color === 'secondary') {
      return `
        background-color: ${theme.background.secondary};
        color: ${theme.text.secondary};
      `;
    } else if (color === 'primary') {
      return `
        background-color: ${theme.background.primary};
        color: ${theme.text.primary};
      `;
    } else {
      return `
        background-color: ${theme.background.default};
        color: ${theme.text.default};
      `;
    }
  }}
`;

export const Badge = styled(StatusBadge)`
  font-size: 0.75rem;
`;

export const SessionActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.xs};
`;