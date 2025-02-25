import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { refreshToken } from '../utils/auth';

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
  const { isAuthenticated, logout, checkAuth } = useAuth();

  // Extract JWT expiration time from cookies if available
  const getTokenExpiryTime = () => {
    try {
      // Try to get token from cookie
      const cookieString = document.cookie;
      const tokenCookie = cookieString
        .split(';')
        .find(row => row.trim().startsWith('token='));
      
      if (!tokenCookie) return null;
      
      // Extract token part
      const token = tokenCookie.split('=')[1];
      if (!token) return null;
      
      // Parse JWT payload
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      
      if (payload.exp) {
        return payload.exp * 1000; // Convert to milliseconds
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting token expiry:', error);
      return null;
    }
  };

  useEffect(() => {
    let checkTimer;
    let countdownTimer;

    // Only set up timers if authenticated
    if (isAuthenticated) {
      // Check token expiration every minute
      checkTimer = setInterval(() => {
        const expiryTime = getTokenExpiryTime();
        
        if (expiryTime) {
          const currentTime = Date.now();
          const timeToExpiry = expiryTime - currentTime;
          
          // Show alert if token will expire soon
          if (timeToExpiry > 0 && timeToExpiry <= warningTime) {
            setShowAlert(true);
            setTimeLeft(Math.floor(timeToExpiry / 1000)); // Convert to seconds
          } else if (timeToExpiry <= 0) {
            // Token has expired, trigger logout
            logout();
          } else {
            setShowAlert(false);
          }
        }
      }, 60000); // Check every minute
      
      // Initial check
      const expiryTime = getTokenExpiryTime();
      if (expiryTime) {
        const currentTime = Date.now();
        const timeToExpiry = expiryTime - currentTime;
        
        if (timeToExpiry > 0 && timeToExpiry <= warningTime) {
          setShowAlert(true);
          setTimeLeft(Math.floor(timeToExpiry / 1000));
        }
      }
    }

    // Update countdown if alert is showing
    if (showAlert && timeLeft) {
      countdownTimer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(countdownTimer);
            logout();
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
  }, [isAuthenticated, logout, showAlert, timeLeft, warningTime]);

  const handleStayLoggedIn = async () => {
    try {
      await refreshToken();
      await checkAuth(true); // Silently check auth to update context
      setShowAlert(false);
    } catch (error) {
      console.error('Error refreshing token:', error);
      logout(); // If refresh fails, log out
    }
  };

  if (!showAlert || !isAuthenticated) return null;

  return (
    <AlertContainer visible={showAlert}>
      Your session will expire in {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
      <AlertButton onClick={handleStayLoggedIn}>Stay logged in</AlertButton>
      <AlertButton onClick={logout}>Logout</AlertButton>
    </AlertContainer>
  );
};

TokenExpirationAlert.propTypes = {
  warningTime: PropTypes.number,
};

export default TokenExpirationAlert;