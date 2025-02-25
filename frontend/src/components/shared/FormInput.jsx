import PropTypes from 'prop-types';
import { useState } from 'react';
import styled from 'styled-components';

const InputContainer = styled.div`
  margin-bottom: 20px;
  width: 100%;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
`;

const StyledInput = styled.input`
  width: 100%;
  padding: 12px;
  border: 1px solid ${props => props.$error ? props.theme.error : props.theme.input.border};
  border-radius: 4px;
  background-color: ${props => props.theme.input.background};
  color: ${props => props.theme.text.primary};
  font-size: 1rem;
  transition: border 0.2s;
  
  &:focus {
    outline: none;
    border-color: ${props => props.$error ? props.theme.error : props.theme.primary};
  }
`;

const ErrorMessage = styled.div`
  color: ${props => props.theme?.error || props.theme?.colors?.error || '#f44336'};
  font-size: 0.875rem;
  margin-top: 5px;
  min-height: 18px;
`;
/**
 * Reusable form input component with validation
 * 
 * @param {Object} props - Component props
 * @param {string} props.id - Input ID
 * @param {string} props.label - Input label
 * @param {string} props.type - Input type (text, password, etc.)
 * @param {string} props.value - Input value
 * @param {Function} props.onChange - Change handler
 * @param {Function} props.validator - Validation function
 * @param {string} props.placeholder - Input placeholder
 * @param {boolean} props.required - Whether the input is required
 * @param {Object} props.validationParams - Additional parameters for validation
 * @returns {React.ReactNode} Form input component
 */
const FormInput = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  validator,
  placeholder = '',
  required = false,
  validationParams = {},
  ...props
}) => {
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // Validate if touched
    if (touched && validator) {
      const validation = validator(newValue, validationParams);
      setError(validation.isValid ? '' : validation.message);
    }
  };

  const handleBlur = () => {
    setTouched(true);
    
    // Validate on blur
    if (validator) {
      const validation = validator(value, validationParams);
      setError(validation.isValid ? '' : validation.message);
    }
  };

  return (
    <InputContainer>
      <Label htmlFor={id}>{label}{required && ' *'}</Label>
      <StyledInput
        id={id}
        type={type}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        $error={!!error}
        required={required}
        {...props}
      />
      <ErrorMessage>{error}</ErrorMessage>
    </InputContainer>
  );
};

FormInput.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  type: PropTypes.string,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  validator: PropTypes.func,
  placeholder: PropTypes.string,
  required: PropTypes.bool,
  validationParams: PropTypes.object,
};

export default FormInput;