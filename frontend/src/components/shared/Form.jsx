import PropTypes from 'prop-types';
import styled from 'styled-components';

const StyledForm = styled.form`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const ErrorMessage = styled.div`
  color: ${({ theme }) => theme.error};
  background: ${({ theme }) => `${theme.error}11`};
  padding: ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius};
  font-size: 0.9rem;
  text-align: center;
  animation: ${({ theme }) => theme.animation.pageTransition};
`;

const SuccessMessage = styled.div`
  color: ${({ theme }) => theme.success};
  background: ${({ theme }) => `${theme.success}11`};
  padding: ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius};
  font-size: 0.9rem;
  text-align: center;
  animation: ${({ theme }) => theme.animation.pageTransition};
`;

const WarningMessage = styled.div`
  color: ${({ theme }) => theme.warning};
  background: ${({ theme }) => `${theme.warning}11`};
  padding: ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius};
  font-size: 0.9rem;
  text-align: center;
  animation: ${({ theme }) => theme.animation.pageTransition};
`;

/**
 * Standardized Form component
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onSubmit - Form submission handler
 * @param {React.ReactNode} props.children - Form content
 * @param {string} [props.error] - Error message to display
 * @param {string} [props.success] - Success message to display
 * @param {string} [props.warning] - Warning message to display
 * @param {boolean} [props.disabled] - Whether form is disabled
 * @param {string} [props.className] - Additional CSS classes
 * @returns {React.ReactNode} Form component
 */
const Form = ({
  onSubmit,
  children,
  error,
  success,
  warning,
  className,
  ...props
}) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <StyledForm 
      onSubmit={handleSubmit} 
      className={className}
      {...props}
    >
      {children}
      
      {error && <ErrorMessage role="alert">{error}</ErrorMessage>}
      {warning && <WarningMessage role="alert">{warning}</WarningMessage>}
      {success && <SuccessMessage role="status">{success}</SuccessMessage>}
    </StyledForm>
  );
};

Form.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  error: PropTypes.string,
  success: PropTypes.string,
  warning: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default Form;