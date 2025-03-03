import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../../../socket';
import api from '../../../utils/axios';

export default function useLobbySocket(sessionId, user, setError) {
  const [players, setPlayers] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [socketIsConnected, setSocketIsConnected] = useState(socket.connected);
  const [sessionExists, setSessionExists] = useState(true);
  
  // Use refs to track connection state and prevent duplicated logic
  const hasJoinedRef = useRef(false);
  const eventHandlersRegisteredRef = useRef(false);
  const cleanupFunctionRef = useRef(null);
  const navigate = useNavigate();

  // Setup and teardown socket connection - keep this separate
  useEffect(() => {
    const handleConnect = () => {
      console.log('Socket connected in lobby');
      setSocketIsConnected(true);
      setError(''); // Clear connection errors when connected
    };
    
    const handleDisconnect = () => {
      console.log('Socket disconnected in lobby');
      setSocketIsConnected(false);
      setError('Connection lost. Trying to reconnect...');
    };
    
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    
    // Check initial status
    setSocketIsConnected(socket.connected);
    
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [setError]);

  // Define event handlers with useCallback to ensure stability
  const playerJoinedHandler = useCallback((updatedPlayers) => {
    console.log('Player joined event received:', updatedPlayers);
    setPlayers(updatedPlayers);
  }, []);
  
  const playerLeftHandler = useCallback((updatedPlayers) => {
    console.log('Player left event received:', updatedPlayers);
    setPlayers(updatedPlayers);
  }, []);
  
  const quizStartingHandler = useCallback((count) => {
    setCountdown(count);
  }, []);
  
  const quizStartedHandler = useCallback(() => {
    navigate(`/quiz/${sessionId}`);
  }, [navigate, sessionId]);
  
  const errorHandler = useCallback((errorMessage) => {
    console.error('Socket error:', errorMessage);
    setError(`Error: ${errorMessage}`);
  }, [setError]);

  // Setup event listeners for socket in a separate effect
  useEffect(() => {
    // Only register event handlers once
    if (eventHandlersRegisteredRef.current) return;
    
    console.log('Registering socket event handlers - first time');
    eventHandlersRegisteredRef.current = true;
    
    // Remove any existing listeners to ensure no duplicates
    socket.off('playerJoined');
    socket.off('playerLeft');
    socket.off('quizStarting');
    socket.off('quizStarted');
    socket.off('error');
    
    // Register all event handlers
    socket.on('playerJoined', playerJoinedHandler);
    socket.on('playerLeft', playerLeftHandler);
    socket.on('quizStarting', quizStartingHandler);
    socket.on('quizStarted', quizStartedHandler);
    socket.on('error', errorHandler);
    
    // Debug
    const anyEventHandler = (event, ...args) => {
      console.log(`Debug: Socket event received: ${event}`, args);
    };
    socket.onAny(anyEventHandler);
    
    // Store cleanup function in ref for later use
    cleanupFunctionRef.current = () => {
      console.log('Cleaning up socket event handlers');
      socket.off('playerJoined', playerJoinedHandler);
      socket.off('playerLeft', playerLeftHandler);
      socket.off('quizStarting', quizStartingHandler);
      socket.off('quizStarted', quizStartedHandler);
      socket.off('error', errorHandler);
      socket.offAny(anyEventHandler);
    };
    
    // Only run cleanup on unmount
    return () => {
      if (cleanupFunctionRef.current) {
        cleanupFunctionRef.current();
        eventHandlersRegisteredRef.current = false;
      }
    };
  }, []); // Empty dependency array - this effect runs only once on mount

  // Session join logic - separate from event registration
  const joinSessionWithValidation = useCallback(async () => {
    if (!user || !sessionId) return;
    
    // Check if we've already joined in this component instance
    if (hasJoinedRef.current) {
      console.log('Session already joined, skipping');
      return;
    }
    
    console.log('Attempting to join session:', sessionId, 'User:', user);
    
    try {
      // Mark that we've attempted to join
      hasJoinedRef.current = true;
      
      // First check if the session exists via REST API
      const sessionResponse = await api.get(`/sessions/${sessionId}`, { 
        timeout: 5000 // Add timeout to prevent hanging
      });
      
      if (!sessionResponse.data) {
        setSessionExists(false);
        throw new Error('Session not found');
      }
      
      setSessionExists(true);
      console.log('Session verified via API, joining via socket');
      
      // Now emit the join event
      if (socket.connected) {
        socket.emit('joinSession', { sessionId });
      } else {
        throw new Error('Socket not connected');
      }
      
    } catch (error) {
      console.error('Error validating session:', error);
      
      if (error.response?.status === 404) {
        setSessionExists(false);
        setError('This session does not exist.');
      } else if (error.response?.status === 403) {
        setError('You do not have permission to join this session.');
      } else {
        // If API fails but socket is connected, try direct socket join as fallback
        if (socket.connected) {
          console.log('API validation failed, attempting direct socket join as fallback');
          socket.emit('joinSession', { sessionId });
        } else {
          setError('Could not connect to the session. Please try again.');
        }
      }
    }
  }, [sessionId, user, setError]);

  // Handle session joining - trigger join only when necessary
  useEffect(() => {
    if (!user || !sessionId) return;
    
    console.log('Setting up lobby with session ID:', sessionId);
    
    // Make sure we're connected before joining
    if (socket.connected) {
      console.log('Socket already connected, joining session directly');
      joinSessionWithValidation();
    } else {
      console.log('Socket not connected, waiting for connection');
      socket.connect();
      
      // Wait for connection before joining
      const connectHandler = () => {
        console.log('Connected in event handler, now joining session');
        joinSessionWithValidation();
      };
      
      socket.once('connect', connectHandler);
      
      return () => {
        socket.off('connect', connectHandler);
      };
    }
  }, [sessionId, user, joinSessionWithValidation]);

  const reconnect = useCallback(() => {
    // Reset our joining flag to allow another attempt
    hasJoinedRef.current = false;
    
    setError(''); // Clear any existing errors
    
    // Reconnect socket if needed
    if (!socket.connected) {
      socket.connect();
    }
    
    joinSessionWithValidation();
  }, [joinSessionWithValidation, setError]);

  const leaveSession = useCallback(() => {
    socket.emit('leaveSession', { sessionId });
    navigate('/home');
  }, [navigate, sessionId]);

  const startQuiz = useCallback((isHost) => {
    if (!isHost) {
      setError('Only the session creator can start the quiz');
      return;
    }
    
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 2;
      if (progress >= 100) {
        clearInterval(progressInterval);
        
        try {
          console.log('Emitting startQuiz event as user:', user?.id);
          socket.emit('startQuiz', { sessionId });
        } catch (error) {
          console.error('Error starting quiz:', error);
          setError('Failed to start quiz: ' + error.message);
        }
      }
      return progress;
    }, 50);
    
    return progressInterval;
  }, [sessionId, user, setError]);

  // Reset join flag on component unmount
  useEffect(() => {
    return () => {
      hasJoinedRef.current = false;
    };
  }, []);

  return {
    players,
    countdown,
    socketIsConnected,
    sessionExists,
    reconnect,
    leaveSession,
    startQuiz
  };
}
