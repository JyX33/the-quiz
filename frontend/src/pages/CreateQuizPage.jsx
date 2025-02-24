import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styled from 'styled-components';
import {
  PageContainer,
  Title,
  Button,
  QuestionContainer,
  FormGroup,
} from '../components/shared/StyledComponents';
import FormInput from '../components/shared/FormInput';
import { validateQuestion, validateQuizTitle, validateOptions } from '../utils/validation';
import { getValidToken } from '../utils/auth';

const ErrorMessage = styled.div`
  color: ${({ theme }) => theme.error};
  background: ${({ theme }) => `${theme.error}11`};
  padding: ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius};
  font-size: 0.9rem;
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const QuizCreationContainer = styled(PageContainer)`
  max-width: 800px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.lg};
`;

const CreateQuizPage = () => {
  const [questions, setQuestions] = useState([{ question: '', options: ['', '', '', ''], correctAnswer: '' }]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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

  const validateForm = () => {
    // Validate title
    const titleValidation = validateQuizTitle(title);
    if (!titleValidation.isValid) {
      setError(titleValidation.message);
      return false;
    }

    // Validate category and difficulty
    if (!category.trim()) {
      setError('Category is required');
      return false;
    }

    if (!difficulty.trim()) {
      setError('Difficulty is required');
      return false;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      
      // Validate question text
      const questionValidation = validateQuestion(q.question);
      if (!questionValidation.isValid) {
        setError(`Question ${i+1}: ${questionValidation.message}`);
        return false;
      }
      
      // Validate options
      const optionsValidation = validateOptions(q.options);
      if (!optionsValidation.isValid) {
        setError(`Question ${i+1}: ${optionsValidation.message}`);
        return false;
      }
      
      // Validate correct answer
      if (!q.correctAnswer.trim()) {
        setError(`Question ${i+1}: Please specify the correct answer`);
        return false;
      }
      
      // Check that correct answer matches one of the options
      if (!q.options.includes(q.correctAnswer)) {
        setError(`Question ${i+1}: Correct answer must match one of the options`);
        return false;
      }
    }
    
    return true;
  };

  const createQuiz = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    setError('');
    
    const token = getValidToken();
    if (!token) {
      navigate('/');
      return;
    }

    try {
      const res = await axios.post(
        'http://localhost:5000/api/quizzes',
        { title, questions, category, difficulty },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const sessionRes = await axios.post(
        'http://localhost:5000/api/sessions',
        { quizId: res.data.quizId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      navigate(`/lobby/${sessionRes.data.sessionId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create quiz. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <QuizCreationContainer>
      <Title>Create New Quiz</Title>
      
      <FormInput
        id="quiz-title"
        label="Quiz Title"
        value={title}
        onChange={setTitle}
        validator={validateQuizTitle}
        placeholder="Enter a title for your quiz"
        required
      />

      {questions.map((q, index) => (
        <QuestionContainer key={index}>
          <h3>Question {index + 1}</h3>
          
          <FormInput
            id={`question-${index}`}
            label="Question Text"
            value={q.question}
            onChange={(value) => updateQuestion(index, 'question', value)}
            validator={validateQuestion}
            placeholder="Enter your question"
            required
          />
          
          {q.options.map((opt, i) => (
            <FormInput
              key={i}
              id={`question-${index}-option-${i}`}
              label={`Option ${i + 1}`}
              value={opt}
              onChange={(value) => updateQuestion(index, 'options', value, i)}
              placeholder={`Enter option ${i + 1}`}
              required
            />
          ))}
          
          <FormInput
            id={`question-${index}-answer`}
            label="Correct Answer"
            value={q.correctAnswer}
            onChange={(value) => updateQuestion(index, 'correctAnswer', value)}
            placeholder="Enter the correct answer (must match one of the options)"
            required
          />
        </QuestionContainer>
      ))}
      
      <FormGroup>
        <Button onClick={addQuestion} $variant="secondary" disabled={isLoading}>
          Add Question
        </Button>
      </FormGroup>

      <FormInput
        id="category"
        label="Category"
        value={category}
        onChange={setCategory}
        placeholder="E.g., Science, History, Sports"
        required
      />
      
      <FormInput
        id="difficulty"
        label="Difficulty"
        value={difficulty}
        onChange={setDifficulty}
        placeholder="E.g., Easy, Medium, Hard"
        required
      />
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
      
      <FormGroup>
        <Button onClick={createQuiz} disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Quiz'}
        </Button>
      </FormGroup>
    </QuizCreationContainer>
  );
};

export default CreateQuizPage;