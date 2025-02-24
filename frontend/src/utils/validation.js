/**
 * Form validation utility functions
 */

/**
 * Validates a username
 * @param {string} username - Username to validate
 * @returns {{ isValid: boolean, message: string }} Validation result
 */
export const validateUsername = (username) => {
  if (!username) {
    return { isValid: false, message: 'Username is required' };
  }
  
  if (username.length < 3) {
    return { isValid: false, message: 'Username must be at least 3 characters' };
  }
  
  if (username.length > 20) {
    return { isValid: false, message: 'Username must be less than 20 characters' };
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { isValid: false, message: 'Username can only contain letters, numbers, and underscores' };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validates a password
 * @param {string} password - Password to validate
 * @returns {{ isValid: boolean, message: string }} Validation result
 */
export const validatePassword = (password) => {
  if (!password) {
    return { isValid: false, message: 'Password is required' };
  }
  
  if (password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters' };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validates a password confirmation
 * @param {string} password - Original password
 * @param {string} confirmPassword - Confirmation password
 * @returns {{ isValid: boolean, message: string }} Validation result
 */
export const validatePasswordConfirmation = (password, confirmPassword) => {
  if (!confirmPassword) {
    return { isValid: false, message: 'Please confirm your password' };
  }
  
  if (password !== confirmPassword) {
    return { isValid: false, message: 'Passwords do not match' };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validates a quiz title
 * @param {string} title - Quiz title to validate
 * @returns {{ isValid: boolean, message: string }} Validation result
 */
export const validateQuizTitle = (title) => {
  if (!title) {
    return { isValid: false, message: 'Quiz title is required' };
  }
  
  if (title.length < 3) {
    return { isValid: false, message: 'Quiz title must be at least 3 characters' };
  }
  
  if (title.length > 100) {
    return { isValid: false, message: 'Quiz title must be less than 100 characters' };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validates a quiz question
 * @param {string} question - Question text to validate
 * @returns {{ isValid: boolean, message: string }} Validation result
 */
export const validateQuestion = (question) => {
  if (!question) {
    return { isValid: false, message: 'Question text is required' };
  }
  
  if (question.length < 5) {
    return { isValid: false, message: 'Question must be at least 5 characters' };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validates quiz answer options
 * @param {Array<string>} options - Answer options to validate
 * @returns {{ isValid: boolean, message: string }} Validation result
 */
export const validateOptions = (options) => {
  if (!options || options.length < 2) {
    return { isValid: false, message: 'At least 2 answer options are required' };
  }
  
  // Check if all options have content
  const emptyOptions = options.filter(option => !option.trim()).length;
  if (emptyOptions > 0) {
    return { isValid: false, message: 'All answer options must have content' };
  }
  
  // Check for duplicate options
  const uniqueOptions = new Set(options.map(option => option.trim()));
  if (uniqueOptions.size !== options.length) {
    return { isValid: false, message: 'Answer options must be unique' };
  }
  
  return { isValid: true, message: '' };
};