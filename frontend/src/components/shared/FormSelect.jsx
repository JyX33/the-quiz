import PropTypes from 'prop-types';
import { useState } from 'react';
import styled from 'styled-components';

const SelectContainer = styled.div`
  margin-bottom: 20px;
  width: 100%;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
`;

const StyledSelect = styled.select`
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
 * Reusable form select component with validation
 * 
 * @param {Object} props - Component props
 * @param {string} props.id - Select ID
 * @param {string} props.label - Select label
 * @param {string} props.value - Selected value
 * @param {Function} props.onChange - Change handler
 * @param {Function} props.validator - Validation function
 * @param {Array} props.options - Array of options to display
 * @param {string} props.placeholder - Placeholder option text
 * @param {boolean} props.required - Whether the select is required
 * @param {Object} props.validationParams - Additional parameters for validation
 * @returns {React.ReactNode} Form select component
 */
const FormSelect = ({
  id,
  label,
  value,
  onChange,
  validator,
  options = [],
  placeholder = 'Select an option',
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
    <SelectContainer>
      <Label htmlFor={id}>{label}{required && ' *'}</Label>
      <StyledSelect
        id={id}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        $error={!!error}
        required={required}
        name={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      >
        <option value="" disabled>{placeholder}</option>
        {options.filter(option => option.trim() !== '').map((option, index) => (
          <option key={index} value={option}>
            {option}
          </option>
        ))}
      </StyledSelect>
      <ErrorMessage id={`${id}-error`}>{error}</ErrorMessage>
    </SelectContainer>
  );
};

FormSelect.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  validator: PropTypes.func,
  options: PropTypes.arrayOf(PropTypes.string),
  placeholder: PropTypes.string,
  required: PropTypes.bool,
  validationParams: PropTypes.object,
};

export default FormSelect;