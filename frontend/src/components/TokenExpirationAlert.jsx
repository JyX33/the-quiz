import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { removeToken } from '../utils/auth';
import api from '../utils/axios';

const AlertContainer = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  background-color: ${props => props.theme.warning};
  color: #fff;
  padding: 15px 20px;
  border-radius: 5px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  display: ${props => props.visible ? 'block' : 'none'};
`;

const AlertButton = styled.button`
  background-color: white;
  color: ${props => props.theme.text.primary};
  border: none;
  padding: 5px 10px;
  margin-left: 10px;
  border-radius: 3px;
  cursor: pointer;
  font-weight: bold;
  
  &:hover {
    background-color: #f0f0f0;
  }
`;

/**
 * Component that monitors token expiration and shows alert when token is about to expire
 * @param {Object} props - Component props
 * @param {number} props.warningTime - Time in ms before expiration to show warning (default: 5 minutes)
 * @returns {React.ReactNode} Alert component
 */
const TokenExpirationAlert = ({ warningTime = 5 * 60 * 1000 }) => {
  const [showAlert, setShowAlert] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let checkTimer;
    let countdownTimer;

    // Check token status every minute
    const checkTokenStatus = async () => {
      try {
        // Call a lightweight endpoint to check token status
        const response = await api.get('/users/me');
        
        // If response has token info, check expiration
        if (response.headers['x-token-expiry']) {
          const expiryTime = parseInt(response.headers['x-token-expiry']);
          const currentTime = Date.now();
          const timeToExpiry = expiryTime - currentTime;
          
          // Show alert if token will expire soon
          if (timeToExpiry > 0 && timeToExpiry <= warningTime) {
            setShowAlert(true);
            setTimeLeft(Math.floor(timeToExpiry / 1000)); // Convert to seconds
          } else {
            setShowAlert(false);
          }
        }
      } catch (error) {
        // If request fails with 401, token has expired
        if (error.response?.status === 401) {
          removeToken();
          navigate('/');
        }
      }
    };

    // Start interval to check token
    checkTimer = setInterval(checkTokenStatus, 60000); // Check every minute
    
    // Initial check
    checkTokenStatus();

    // Update countdown if alert is showing
    if (showAlert && timeLeft) {
      countdownTimer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(countdownTimer);
            removeToken();
            navigate('/');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      clearInterval(checkTimer);
      if (countdownTimer) clearInterval(countdownTimer);
    };
  }, [navigate, showAlert, timeLeft, warningTime]);

  const handleStayLoggedIn = async () => {
    try {
      await api.post('/users/refresh-token');
      setShowAlert(false);
    } catch (error) {
      console.error('Error refreshing token:', error);
      handleLogout(); // If refresh fails, log out
    }
  };

  const handleLogout = () => {
    removeToken();
    navigate('/');
  };

  if (!showAlert) return null;

  return (
    <AlertContainer visible={showAlert}>
      Your session will expire in {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
      <AlertButton onClick={handleStayLoggedIn}>Stay logged in</AlertButton>
      <AlertButton onClick={handleLogout}>Logout</AlertButton>
    </AlertContainer>
  );
};

TokenExpirationAlert.propTypes = {
  warningTime: PropTypes.number,
};

export default TokenExpirationAlert;