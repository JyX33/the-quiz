import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  PageContainer,
  Title,
  Subtitle,
  Button,
  Input,
  Select,
  QuestionContainer,
  QuizList,
  QuizItem,
  FormGroup,
} from '../components/shared/StyledComponents';

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
    <PageContainer>
      <Title>Welcome, {user?.username}</Title>
      
      <FormGroup>
        <Select onChange={(e) => updateTheme(e.target.value)} value={user?.theme || 'Alliance'}>
          <option value="Alliance">Alliance Theme</option>
          <option value="Horde">Horde Theme</option>
        </Select>
      </FormGroup>

      <Subtitle>Create Quiz</Subtitle>
      {questions.map((q, index) => (
        <QuestionContainer key={index}>
          <FormGroup>
            <Input
              placeholder="Question"
              value={q.question}
              onChange={(e) => updateQuestion(index, 'question', e.target.value)}
            />
          </FormGroup>
          {q.options.map((opt, i) => (
            <FormGroup key={i}>
              <Input
                placeholder={`Option ${i + 1}`}
                value={opt}
                onChange={(e) => updateQuestion(index, 'options', e.target.value, i)}
              />
            </FormGroup>
          ))}
          <FormGroup>
            <Input
              placeholder="Correct Answer"
              value={q.correctAnswer}
              onChange={(e) => updateQuestion(index, 'correctAnswer', e.target.value)}
            />
          </FormGroup>
        </QuestionContainer>
      ))}
      <FormGroup>
        <Button onClick={addQuestion} variant="secondary">Add Question</Button>
      </FormGroup>

      <FormGroup>
        <Input placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
      </FormGroup>
      <FormGroup>
        <Input placeholder="Difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} />
      </FormGroup>
      <FormGroup>
        <Button onClick={createQuiz}>Create Quiz</Button>
      </FormGroup>

      <Subtitle>Join Session</Subtitle>
      <FormGroup>
        <Input placeholder="Session ID" value={sessionId} onChange={(e) => setSessionId(e.target.value)} />
        <Button onClick={joinSession}>Join Session</Button>
      </FormGroup>

      <Subtitle>Your Quizzes</Subtitle>
      <QuizList>
        {quizzes.map((quiz) => (
          <QuizItem key={quiz.id}>
            <h3>{quiz.category || 'No Category'}</h3>
            <p>Difficulty: {quiz.difficulty || 'Not specified'}</p>
            <p>Questions: {quiz.questions?.length || 0}</p>
          </QuizItem>
        ))}
      </QuizList>
      
      <FormGroup>
        <Button onClick={() => navigate('/leaderboard')} variant="secondary">
          View Leaderboard
        </Button>
      </FormGroup>
    </PageContainer>
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
