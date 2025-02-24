import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  PageContainer,
  Title,
  Button,
  Input,
  QuestionContainer,
  FormGroup,
} from '../components/shared/StyledComponents';

const CreateQuizPage = () => {
  const [questions, setQuestions] = useState([{ question: '', options: ['', '', '', ''], correctAnswer: '' }]);
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const navigate = useNavigate();

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

  return (
    <PageContainer>
      <Title>Create New Quiz</Title>

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
        <Button onClick={addQuestion} $variant="secondary">Add Question</Button>
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
    </PageContainer>
  );
};


export default CreateQuizPage;
