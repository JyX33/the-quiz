import api, { refreshCsrfToken } from '../utils/axios';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import FormInput from '../components/shared/FormInput';
import Form from '../components/shared/Form';
import {
  Button,
  FormGroup,
  PageContainer,
  QuestionContainer,
  Title,
} from '../components/shared/StyledComponents';
import { handleApiError } from '../utils/errorHandler';
import { validateOptions, validateQuestion, validateQuizTitle } from '../utils/validation';
import LoadingButton from '../components/shared/LoadingButton';

const QuizCreationContainer = styled(PageContainer)`
  max-width: 800px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.lg};
`;

const RecoveryOptions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.md};
`;

/**
 * CreateQuizPage component with improved transaction handling
 * - Ensures both quiz creation and session creation succeed or both fail
 * - Provides recovery options if one part of the transaction fails
 * - Uses consistent form submission patterns
 */
const CreateQuizPage = () => {
  const [questions, setQuestions] = useState([{ question: '', options: ['', '', '', ''], correctAnswer: '' }]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [warning, setWarning] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [createdQuizId, setCreatedQuizId] = useState(null);
  const [sessionCreationFailed, setSessionCreationFailed] = useState(false);
  
  const navigate = useNavigate();

  // Automatically refresh CSRF token on component load
  useEffect(() => {
    refreshCsrfToken();
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

  const validateForm = () => {
    // Validate title
    const titleValidation = validateQuizTitle(title);
    if (!titleValidation.isValid) {
      return { valid: false, error: titleValidation.message };
    }

    // Validate category and difficulty
    if (!category.trim()) {
      return { valid: false, error: 'Category is required' };
    }

    if (!difficulty.trim()) {
      return { valid: false, error: 'Difficulty is required' };
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      
      // Validate question text
      const questionValidation = validateQuestion(q.question);
      if (!questionValidation.isValid) {
        return { valid: false, error: `Question ${i+1}: ${questionValidation.message}` };
      }
      
      // Validate options
      const optionsValidation = validateOptions(q.options);
      if (!optionsValidation.isValid) {
        return { valid: false, error: `Question ${i+1}: ${optionsValidation.message}` };
      }
      
      // Validate correct answer
      if (!q.correctAnswer.trim()) {
        return { valid: false, error: `Question ${i+1}: Please specify the correct answer` };
      }
      
      // Check that correct answer matches one of the options
      if (!q.options.includes(q.correctAnswer)) {
        return { valid: false, error: `Question ${i+1}: Correct answer must match one of the options` };
      }
    }
    
    return { valid: true };
  };

  /**
   * Handle creation of quiz and session as a transaction
   */
  const handleCreateQuiz = async () => {
    const validation = validateForm();
    if (!validation.valid) {
      setError(validation.error);
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    setWarning('');
    setCreatedQuizId(null);
    setSessionCreationFailed(false);
    
    try {
      // Make sure we have a fresh CSRF token
      await refreshCsrfToken();
      
      // Step 1: Create quiz
      const quizResponse = await api.post(
        '/quizzes',
        { title, questions, category, difficulty }
      );
      
      const quizId = quizResponse.data.quizId;
      setCreatedQuizId(quizId);
      
      try {
        // Step 2: Create session
        const sessionResponse = await api.post(
          '/sessions',
          { quizId }
        );
        
        // Success - both operations completed
        setSuccess('Quiz and session created successfully!');
        
        // Delay navigation slightly to show success message
        setTimeout(() => {
          navigate(`/lobby/${sessionResponse.data.sessionId}`);
        }, 1000);
      } catch (sessionError) {
        // First part succeeded but second failed
        setSessionCreationFailed(true);
        setWarning(
          'Quiz was created successfully, but we encountered an issue creating the session. ' +
          'You can try to create a session again or manage your quiz later.'
        );
        console.error('Session creation error:', sessionError);
      }
    } catch (error) {
      handleApiError(error, setError);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Retry creating a session for an existing quiz
   */
  const handleRetryCreateSession = async () => {
    if (!createdQuizId) return;
    
    setIsLoading(true);
    setError('');
    setWarning('');
    
    try {
      // Fresh CSRF token
      await refreshCsrfToken();
      
      // Try to create session again
      const sessionResponse = await api.post(
        '/sessions',
        { quizId: createdQuizId }
      );
      
      setSuccess('Session created successfully!');
      
      // Navigate to lobby
      setTimeout(() => {
        navigate(`/lobby/${sessionResponse.data.sessionId}`);
      }, 1000);
    } catch (error) {
      handleApiError(error, setError);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Allow the user to go to the home page after quiz creation
   */
  const handleGoHome = () => {
    navigate('/home');
  };

  return (
    <QuizCreationContainer>
      <Title>Create New Quiz</Title>
      
      <Form 
        onSubmit={handleCreateQuiz}
        error={error}
        warning={warning}
        success={success}
      >
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
          <Button 
            type="button" 
            onClick={addQuestion} 
            $variant="secondary" 
            disabled={isLoading}
          >
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
        
        {sessionCreationFailed ? (
          <RecoveryOptions>
            <LoadingButton 
              type="button"
              onClick={handleRetryCreateSession} 
              disabled={isLoading}
            >
              {isLoading ? 'Retrying...' : 'Retry Creating Session'}
            </LoadingButton>
            <Button 
              type="button"
              onClick={handleGoHome}
              $variant="secondary"
              disabled={isLoading}
            >
              Go To Home
            </Button>
          </RecoveryOptions>
        ) : (
          <FormGroup>
            <LoadingButton 
              type="submit"
              isLoading={isLoading}
              loadingText="Creating..."
            >
              Create Quiz
            </LoadingButton>
          </FormGroup>
        )}
      </Form>
    </QuizCreationContainer>
  );
};

export default CreateQuizPage;