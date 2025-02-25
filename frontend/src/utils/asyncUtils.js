/**
 * Simple utility functions to standardize async operations
 */
import { handleApiError } from './errorHandler';

/**
 * Executes an async operation with standardized loading and error handling
 * 
 * @param {Function} asyncFn - The async function to execute
 * @param {Function} setIsLoading - State setter for loading indicator
 * @param {Function} setError - State setter for error message
 * @param {Function} [setSuccess] - Optional state setter for success message
 * @param {Function} [onSuccess] - Callback to run on success
 * @returns {Promise<any>} - Result of the async operation or null on error
 */
export const executeAsync = async (
  asyncFn,
  setIsLoading,
  setError,
  setSuccess = null,
  onSuccess = null
) => {
  // Set loading state and reset messages
  setIsLoading(true);
  if (setError) setError('');
  if (setSuccess) setSuccess('');
  
  try {
    // Execute the async operation
    const result = await asyncFn();
    
    // Handle successful result
    if (onSuccess) {
      onSuccess(result);
    }
    
    return result;
  } catch (error) {
    // Handle error
    if (setError) {
      handleApiError(error, setError);
    } else {
      console.error('Unhandled async error:', error);
    }
    
    return null;
  } finally {
    // Reset loading state
    setIsLoading(false);
  }
};