import styled, { keyframes } from 'styled-components';
import PropTypes from 'prop-types';
import { Button } from './StyledComponents';

const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const Spinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ${rotate} 0.8s linear infinite;
  margin-right: 8px;
  display: inline-block;
`;

const LoadingButton = ({ 
  isLoading, 
  loadingText = 'Loading...', 
  children, 
  ...props 
}) => {
  return (
    <Button {...props} disabled={isLoading || props.disabled}>
      {isLoading ? (
        <>
          <Spinner />
          {loadingText}
        </>
      ) : children}
    </Button>
  );
};

LoadingButton.propTypes = {
  isLoading: PropTypes.bool,
  loadingText: PropTypes.string,
  children: PropTypes.node.isRequired,
  disabled: PropTypes.bool,
};

export default LoadingButton;