import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface TranscriptEntry {
  id: string;
  speaker: string;
  text: string;
  confidence: number;
  timestamp: Date;
  isFinal?: boolean;
}

interface AISuggestion {
  id: string;
  type: string;
  text: string;
  confidence: number;
  reasoning?: string;
  priority: string;
  used: boolean;
  timestamp: Date;
}

interface WebSocketData {
  transcript: TranscriptEntry[];
  suggestions: AISuggestion[];
  isConnected: boolean;
}

export const useWebSocket = (callId: string, userId?: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [data, setData] = useState<WebSocketData>({
    transcript: [],
    suggestions: [],
    isConnected: false
  });

  const connect = useCallback(() => {
    if (!callId || !userId) {
      console.log('❌ Cannot connect: missing callId or userId', { callId, userId });
      return;
    }

    console.log('🔌 Creating Socket.IO connection...');
    console.log('🌐 Server URL:', import.meta.env.VITE_API_URL || 'http://localhost:3002');
    
    const authToken = localStorage.getItem('authToken');
    console.log('🔑 Auth token present:', !!authToken);

    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3002', {
      transports: ['websocket', 'polling'],
      auth: {
        token: authToken
      }
    });

    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected');
      setData(prev => ({ ...prev, isConnected: true }));
    });

    newSocket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      setData(prev => ({ ...prev, isConnected: false }));
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setData(prev => ({ ...prev, isConnected: false }));
    });

    setSocket(newSocket);
  }, [callId, userId]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setData({
        transcript: [],
        suggestions: [],
        isConnected: false
      });
    }
  }, [socket]);

  const joinCall = useCallback((callId: string, userId: string, platform?: string) => {
    console.log('📞 Attempting to join call:', { callId, userId, platform });
    console.log('🔌 Socket connected:', socket?.connected);
    
    if (socket && socket.connected) {
      console.log(`📞 Joining call ${callId} on platform ${platform || 'unknown'}`);
      socket.emit('joinCall', {
        callId,
        userId,
        platform: platform || 'unknown'
      });
    } else {
      console.log('❌ Socket not connected, cannot join call');
    }
  }, [socket]);

  const leaveCall = useCallback((callId: string) => {
    if (socket && socket.connected) {
      console.log(`📞 Leaving call ${callId}`);
      socket.emit('leaveCall', { callId });
    }
  }, [socket]);

  const markSuggestionUsed = useCallback((suggestionId: string) => {
    if (socket && socket.connected) {
      socket.emit('useSuggestion', {
        suggestionId,
        callId,
        feedback: 'used'
      });
    }
  }, [socket, callId]);

  const requestSuggestion = useCallback(() => {
    if (socket && socket.connected && userId) {
      socket.emit('requestSuggestion', {
        callId,
        userId
      });
    }
  }, [socket, callId, userId]);

  useEffect(() => {
    if (!socket) {
      connect();
      return;
    }

    // Real-time transcript events
    socket.on('newTranscript', (transcript: TranscriptEntry) => {
      console.log('📝 New transcript received:', transcript);
      setData(prev => ({
        ...prev,
        transcript: [...prev.transcript.slice(-50), transcript]
      }));
    });

    // AI suggestion events
    socket.on('newSuggestion', (suggestion: AISuggestion) => {
      console.log('🤖 New AI suggestion received:', suggestion);
      setData(prev => ({
        ...prev,
        suggestions: [...prev.suggestions.slice(-10), suggestion]
      }));
    });

    // Suggestion usage events
    socket.on('suggestionUsed', ({ suggestionId }: { suggestionId: string }) => {
      setData(prev => ({
        ...prev,
        suggestions: prev.suggestions.map(s => 
          s.id === suggestionId ? { ...s, used: true } : s
        )
      }));
    });

    // Meeting events
    socket.on('meetingStarted', ({ meetingId }: { meetingId: string }) => {
      console.log('🎬 Meeting started:', meetingId);
    });

    socket.on('meetingEnded', ({ meetingId }: { meetingId: string }) => {
      console.log('🏁 Meeting ended:', meetingId);
    });

    socket.on('participantJoined', ({ participant }: { participant: any }) => {
      console.log('👤 Participant joined:', participant);
    });

    socket.on('participantLeft', ({ participant }: { participant: any }) => {
      console.log('👋 Participant left:', participant);
    });

    // Call events
    socket.on('callJoined', ({ callId, platform }: { callId: string; platform: string }) => {
      console.log(`✅ Successfully joined call ${callId} on ${platform}`);
    });

    socket.on('callLeft', ({ callId }: { callId: string }) => {
      console.log(`👋 Successfully left call ${callId}`);
    });

    // Error events
    socket.on('transcriptionError', ({ error }: { error: string }) => {
      console.error('❌ Transcription error:', error);
    });

    socket.on('suggestionError', ({ error }: { error: string }) => {
      console.error('❌ AI suggestion error:', error);
    });

    socket.on('error', ({ message }: { message: string }) => {
      console.error('❌ Socket error:', message);
    });

    // Cleanup event listeners
    return () => {
      socket.off('newTranscript');
      socket.off('newSuggestion');
      socket.off('suggestionUsed');
      socket.off('meetingStarted');
      socket.off('meetingEnded');
      socket.off('participantJoined');
      socket.off('participantLeft');
      socket.off('callJoined');
      socket.off('callLeft');
      socket.off('transcriptionError');
      socket.off('suggestionError');
      socket.off('error');
    };
  }, [socket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...data,
    joinCall,
    leaveCall,
    markSuggestionUsed,
    requestSuggestion,
    socket,
    sendAudioData: (audioData: string) => {
      if (socket && socket.connected) {
        socket.emit('audioData', { audioData });
      }
    }
  };
};