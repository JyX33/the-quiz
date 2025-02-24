import { useEffect, useState } from 'react';
import styled from 'styled-components';
import socket from '../socket';

const StatusIndicator = styled.div`
  position: fixed;
  bottom: 10px;
  left: 10px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: ${props => props.connected ? props.theme.success : props.theme.error};
  box-shadow: 0 0 5px ${props => props.connected ? props.theme.success : props.theme.error};
  transition: background-color 0.3s ease;
  
  &:after {
    content: '${props => props.connected ? 'Connected' : 'Disconnected'}';
    position: absolute;
    left: 15px;
    top: -5px;
    opacity: 0;
    transition: opacity 0.3s ease;
    white-space: nowrap;
    font-size: 12px;
  }
  
  &:hover:after {
    opacity: 1;
  }
`;

const ConnectionStatus = () => {
  const [connected, setConnected] = useState(socket.connected);
  const [setReconnectAttempt] = useState(0);
  
  useEffect(() => {
    const handleConnect = () => {
      setConnected(true);
      setReconnectAttempt(0);
    };
    
    const handleDisconnect = () => {
      setConnected(false);
    };
    
    const handleReconnectAttempt = (attempt) => {
      setReconnectAttempt(attempt);
    };
    
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('reconnect_attempt', handleReconnectAttempt);
    
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('reconnect_attempt', handleReconnectAttempt);
    };
  }, []);
  
  return <StatusIndicator connected={connected} />;
};

export default ConnectionStatus;