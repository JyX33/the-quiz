import { useEffect, useState } from 'react';
import api from '../../../utils/axios';

export default function useSessionInfo(sessionId, user) {
  const [sessionInfo, setSessionInfo] = useState(null);
  const [isCreator, setIsCreator] = useState(false);
  const [sessionExists, setSessionExists] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (!sessionId || !user) return;
    
    const fetchSessionDetails = async () => {
      try {
        const response = await api.get(`/sessions/${sessionId}`);
        const sessionData = response.data;
        
        setSessionInfo(sessionData);
        
        // Check if current user is the creator
        const userIsCreator = sessionData.creator_id === user.id;
        console.log('Creator check:', {
          userId: user.id,
          creatorId: sessionData.creator_id,
          isCreator: userIsCreator
        });
        
        setIsCreator(userIsCreator);
        
        if (!userIsCreator) {
          console.log('Current user is not the creator of this session');
        }
      } catch (error) {
        console.error('Error fetching session details:', error);
        setError('Failed to load session details');
        
        if (error.response?.status === 404) {
          setSessionExists(false);
        }
      }
    };
    
    fetchSessionDetails();
  }, [sessionId, user]);

  return {
    sessionInfo,
    isCreator,
    sessionExists,
    error,
    setError,
    isHost: isCreator || (sessionInfo && sessionInfo.creator_id === user?.id)
  };
}
