import axios from 'axios';

// Error response display utility
export const handleApiError = (error, setError) => {
  if (axios.isAxiosError(error)) {
    // Handle Axios errors
    const errorMessage = error.response?.data?.message || 'Network error occurred';
    setError(errorMessage);
    return errorMessage;
  } else {
    // Handle other errors
    setError('An unexpected error occurred');
    console.error('Unexpected error:', error);
    return 'An unexpected error occurred';
  }
};