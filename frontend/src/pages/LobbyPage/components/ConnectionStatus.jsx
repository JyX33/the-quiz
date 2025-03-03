
import { ErrorDisplay, ReconnectButton } from '../styles';
import PropTypes from 'prop-types';

const ConnectionStatus = ({ socketIsConnected, error, onReconnect }) => {
  if (!socketIsConnected || error) {
    return (
      <>
        {!socketIsConnected && (
          <ErrorDisplay>
            Socket is currently disconnected. Try refreshing the page.
            <ReconnectButton onClick={onReconnect}>
              Reconnect
            </ReconnectButton>
          </ErrorDisplay>
        )}
        
        {error && (
          <ErrorDisplay>
            {error}
            {error.includes('multiple attempts') && (
              <ReconnectButton onClick={onReconnect}>
                Try Again
              </ReconnectButton>
            )}
          </ErrorDisplay>
        )}
      </>
    );
  }
  
  return null;
};
ConnectionStatus.propTypes = {
  socketIsConnected: PropTypes.bool.isRequired,
  error: PropTypes.string,
  onReconnect: PropTypes.func.isRequired
};

export default ConnectionStatus;
