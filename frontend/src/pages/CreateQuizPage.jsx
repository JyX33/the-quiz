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
import { validateOptions, validateQuestion, validateQuizTitle } from '../utils/validation';
import LoadingButton from '../components/shared/LoadingButton';
import { executeAsync } from '../utils/asyncUtils';

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
 * CreateQuizPage component with standardized async patterns
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
    refreshCsrfToken().catch(err => 
      console.error('Failed to refresh CSRF token:', err)
    );
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
    
    setCreatedQuizId(null);
    setSessionCreationFailed(false);
    
    // Use standardized executeAsync for quiz creation 
    const quizResult = await executeAsync(
      async () => {
        // Refresh CSRF token first
        await refreshCsrfToken();
        
        // Create quiz
        const response = await api.post(
          '/quizzes',
          { title, questions, category, difficulty }
        );
        
        return response.data;
      },
      setIsLoading,
      setError,
      null, // No success message yet
      (data) => {
        setCreatedQuizId(data.quizId);
      }
    );
    
    // If quiz creation succeeded, try to create session
    if (quizResult && quizResult.quizId) {
      // Try to create session with the new quiz
      const sessionResult = await executeAsync(
        async () => {
          // Create session using the quiz ID
          const response = await api.post(
            '/sessions',
            { quizId: quizResult.quizId }
          );
          
          return response.data;
        },
        setIsLoading,
        setError,
        setSuccess,
        (data) => {
          setSuccess('Quiz and session created successfully!');
          
          // Delay navigation slightly to show success message
          setTimeout(() => {
            navigate(`/lobby/${data.sessionId}`);
          }, 1000);
        }
      );
      
      // If session creation failed but no error was set, make sure we show session failure UI
      if (!sessionResult && !error) {
        setSessionCreationFailed(true);
        setWarning(
          'Quiz was created successfully, but we encountered an issue creating the session. ' +
          'You can try to create a session again or manage your quiz later.'
        );
      }
    }
  };

  /**
   * Retry creating a session for an existing quiz
   */
  const handleRetryCreateSession = async () => {
    if (!createdQuizId) return;
    
    // Use standardized executeAsync utility
    await executeAsync(
      async () => {
        // Refresh CSRF token first
        await refreshCsrfToken();
        
        // Try to create session again
        return await api.post(
          '/sessions',
          { quizId: createdQuizId }
        );
      },
      setIsLoading,
      setError,
      setSuccess,
      (response) => {
        setSuccess('Session created successfully!');
        setSessionCreationFailed(false);
        setWarning('');
        
        // Navigate to lobby
        setTimeout(() => {
          navigate(`/lobby/${response.data.sessionId}`);
        }, 1000);
      }
    );
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