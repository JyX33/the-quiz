import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import socket from '../socket';

const Container = styled.div`
  padding: 20px;
  background: ${(props) => props.theme.background};
  min-height: 100vh;
`;

const Button = styled.button`
  padding: 10px;
  margin: 5px;
  background: ${(props) => props.theme.primary};
  color: ${(props) => props.theme.accent};
  border: none;
  cursor: pointer;
`;

const QuizRoomPage = ({ user }) => {
  const { sessionId } = useParams();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answer, setAnswer] = useState('');
  const [scores, setScores] = useState({});
  const [isCreator, setIsCreator] = useState(false);

  useEffect(() => {
    // Check if user is creator (simplified, ideally fetch from backend)
    socket.on('scoreUpdate', (newScores) => setScores(newScores));
    socket.on('nextQuestion', (index) => setCurrentQuestion(index));
    socket.on('quizEnded', (finalScores) => {
      setScores(finalScores);
      alert('Quiz Ended!');
    });
    return () => {
      socket.off('scoreUpdate');
      socket.off('nextQuestion');
      socket.off('quizEnded');
    };
  }, []);

  const submitAnswer = () => {
    socket.emit('submitAnswer', { sessionId, answer });
    setAnswer('');
  };

  const nextQuestion = () => {
    socket.emit('nextQuestion', { sessionId });
  };

  const endQuiz = () => {
    socket.emit('endQuiz', { sessionId });
  };

  return (
    <Container>
      <h1>Quiz Room: {sessionId}</h1>
      <h2>Question {currentQuestion + 1}</h2>
      <Input placeholder="Your Answer" value={answer} onChange={(e) => setAnswer(e.target.value)} />
      <Button onClick={submitAnswer}>Submit Answer</Button>
      {isCreator && (
        <>
          <Button onClick={nextQuestion}>Next Question</Button>
          <Button onClick={endQuiz}>End Quiz</Button>
        </>
      )}
      <h2>Scores</h2>
      <ul>
        {Object.entries(scores).map(([userId, data]) => (
          <li key={userId}>
            {userId === user.id ? `${user.username} (You)` : userId}: {data.score}
          </li>
        ))}
      </ul>
    </Container>
  );
};

const Input = styled.input`
  margin: 5px;
  padding: 8px;
`;

export default QuizRoomPage;