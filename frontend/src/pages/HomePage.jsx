import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styled from 'styled-components';

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

const Input = styled.input`
  margin: 5px;
  padding: 8px;
`;

const Select = styled.select`
  margin: 5px;
  padding: 8px;
`;

const HomePage = ({ user, updateTheme }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [questions, setQuestions] = useState([{ question: '', options: ['', '', '', ''], correctAnswer: '' }]);
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [sessionId, setSessionId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get('http://localhost:5000/api/quizzes', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      .then((res) => setQuizzes(res.data))
      .catch((err) => console.error(err));
  }, []);

  const addQuestion = () => {
    setQuestions([...questions, { question: '', options: ['', '', '', ''], correctAnswer: '' }]);
  };

  const updateQuestion = (index, field, value, optionIndex = null) => {
    const newQuestions = [...questions];
    if (field === 'options') {
      newQuestions[index].options[optionIndex] = value;
    } else {
      newQuestions[index][field] = value;
    }
    setQuestions(newQuestions);
  };

  const createQuiz = () => {
    axios
      .post(
        'http://localhost:5000/api/quizzes',
        { questions, category, difficulty },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      )
      .then((res) => {
        axios
          .post(
            'http://localhost:5000/api/sessions',
            { quizId: res.data.quizId },
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          )
          .then((sessionRes) => navigate(`/lobby/${sessionRes.data.sessionId}`));
      })
      .catch((err) => console.error(err));
  };

  const joinSession = () => {
    navigate(`/lobby/${sessionId}`);
  };

  return (
    <Container>
      <h1>Welcome, {user?.username}</h1>
      <Select onChange={(e) => updateTheme(e.target.value)} value={user?.theme || 'Alliance'}>
        <option value="Alliance">Alliance</option>
        <option value="Horde">Horde</option>
      </Select>
      <h2>Create Quiz</h2>
      {questions.map((q, index) => (
        <div key={index}>
          <Input
            placeholder="Question"
            value={q.question}
            onChange={(e) => updateQuestion(index, 'question', e.target.value)}
          />
          {q.options.map((opt, i) => (
            <Input
              key={i}
              placeholder={`Option ${i + 1}`}
              value={opt}
              onChange={(e) => updateQuestion(index, 'options', e.target.value, i)}
            />
          ))}
          <Input
            placeholder="Correct Answer"
            value={q.correctAnswer}
            onChange={(e) => updateQuestion(index, 'correctAnswer', e.target.value)}
          />
        </div>
      ))}
      <Button onClick={addQuestion}>Add Question</Button>
      <Input placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
      <Input placeholder="Difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} />
      <Button onClick={createQuiz}>Create Quiz</Button>

      <h2>Join Session</h2>
      <Input placeholder="Session ID" value={sessionId} onChange={(e) => setSessionId(e.target.value)} />
      <Button onClick={joinSession}>Join Session</Button>

      <h2>Your Quizzes</h2>
      <ul>
        {quizzes.map((quiz) => (
          <li key={quiz.id}>
            {quiz.category || 'No Category'} - {quiz.difficulty || 'No Difficulty'}
          </li>
        ))}
      </ul>
      <Button onClick={() => navigate('/leaderboard')}>View Leaderboard</Button>
    </Container>
  );
};

HomePage.propTypes = {
  user: PropTypes.shape({
    username: PropTypes.string.isRequired,
    theme: PropTypes.string,
    id: PropTypes.string.isRequired
  }),
  updateTheme: PropTypes.func.isRequired
};

export default HomePage;
