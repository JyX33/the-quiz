import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const ripple = keyframes`
  0% { transform: scale(0); opacity: 1; }
  50% { transform: scale(10); opacity: 0.375; }
  100% { transform: scale(35); opacity: 0; }
`;

export const PageContainer = styled.div`
  padding: ${({ theme }) => theme.spacing.xl};
  background: ${({ theme }) => theme.background.main};
  min-height: 100vh;
  animation: ${fadeIn} 0.4s ease-out;
  color: ${({ theme }) => theme.text.primary};
`;

export const Card = styled.div`
  background: ${({ theme }) => theme.background.paper};
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: ${({ theme }) => theme.boxShadow};
  padding: ${({ theme }) => theme.spacing.lg};
  margin: ${({ theme }) => theme.spacing.md} 0;
  transition: ${({ theme }) => theme.transition};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
  }
`;

export const Button = styled.button`
  position: relative;
  overflow: hidden;
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.lg}`};
  background: ${({ theme, $variant }) => 
    $variant === 'secondary' ? theme.secondary : theme.primary};
  color: ${({ theme }) => theme.text.primary};
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius};
  font-weight: ${({ theme }) => theme.typography.body.weight};
  cursor: pointer;
  transition: ${({ theme }) => theme.animation.buttonHover};
  
  &:hover {
    background: ${({ theme, $variant }) => 
      $variant === 'secondary' ? theme.secondary : theme.button.hoverBg};
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.boxShadow};
  }
  
  &:active {
    background: ${({ theme, $variant }) => 
      $variant === 'secondary' ? theme.secondary : theme.button.activeBg};
    transform: translateY(0);
  }
  
  &:before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 5px;
    height: 5px;
    background: rgba(255, 255, 255, 0.5);
    opacity: 0;
    border-radius: 100%;
    transform: scale(1, 1) translate(-50%);
    transform-origin: 50% 50%;
  }

  &:focus {
    outline: none;
    &:before {
      animation: ${ripple} 0.6s ease-out;
    }
  }
`;

export const Input = styled.input`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.sm};
  margin: ${({ theme }) => theme.spacing.xs} 0;
  background: ${({ theme }) => theme.input.background};
  border: 2px solid ${({ theme }) => theme.input.border};
  border-radius: ${({ theme }) => theme.borderRadius};
  color: ${({ theme }) => theme.text.primary};
  transition: ${({ theme }) => theme.transition};

  &::placeholder {
    color: ${({ theme }) => theme.input.placeholder};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.input.focusBorder};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.input.focusBorder}33;
  }
`;

export const Select = styled.select`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.sm};
  margin: ${({ theme }) => theme.spacing.xs} 0;
  background: ${({ theme }) => theme.input.background};
  border: 2px solid ${({ theme }) => theme.input.border};
  border-radius: ${({ theme }) => theme.borderRadius};
  color: ${({ theme }) => theme.text.primary};
  transition: ${({ theme }) => theme.transition};
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.input.focusBorder};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.input.focusBorder}33;
  }
`;

export const Title = styled.h1`
  color: ${({ theme }) => theme.text.primary};
  font-weight: ${({ theme }) => theme.typography.heading.weight};
  line-height: ${({ theme }) => theme.typography.heading.lineHeight};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  font-size: 2.5rem;
`;

export const Subtitle = styled.h2`
  color: ${({ theme }) => theme.text.secondary};
  font-weight: ${({ theme }) => theme.typography.heading.weight};
  line-height: ${({ theme }) => theme.typography.heading.lineHeight};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  font-size: 1.75rem;
`;

export const QuestionContainer = styled(Card)`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

export const QuizList = styled.ul`
  list-style: none;
  padding: 0;
  margin: ${({ theme }) => theme.spacing.md} 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
`;

export const QuizItem = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  cursor: pointer;
`;

export const FormGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;
