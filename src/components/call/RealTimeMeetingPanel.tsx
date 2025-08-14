import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Brain, Activity, Users, Mic, MicOff, Loader2 } from 'lucide-react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAuth } from '../../contexts/AuthContext';
import { useAudioCapture } from '../../hooks/useAudioCapture';

interface RealTimeMeetingPanelProps {
  callId: string;
  meetingData?: any;
  onTranscriptUpdate?: (transcript: any) => void;
  onSuggestionUpdate?: (suggestion: any) => void;
}

export const RealTimeMeetingPanel: React.FC<RealTimeMeetingPanelProps> = ({
  callId,
  meetingData,
  onTranscriptUpdate,
  onSuggestionUpdate
}) => {
  const { user } = useAuth();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'live' | 'transcript' | 'suggestions' | 'participants'>('live');
  const [showRecordingNotification, setShowRecordingNotification] = useState(false);
  
  const transcriptRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // WebSocket connection for real-time updates
  const {
    transcript: transcripts,
    suggestions,
    isConnected,
    joinCall,
    leaveCall,
    markSuggestionUsed,
    requestSuggestion,
    sendAudioData
  } = useWebSocket(callId, user?._id);

  // Audio capture hook
  const { isRecording, isSupported, error: audioError, startRecording, stopRecording } = useAudioCapture(
    (audioData) => {
      // Send audio data to WebSocket when recording
      if (sendAudioData) {
        sendAudioData(audioData);
      }
    }
  );

  // Add null checks and default values to prevent undefined errors
  const safeTranscripts = transcripts || [];
  const safeSuggestions = suggestions || [];

  // Handle audio capture errors
  useEffect(() => {
    if (audioError) {
      console.error('🎤 Audio capture error:', audioError);
      setShowRecordingNotification(true);
      setTimeout(() => {
        setShowRecordingNotification(false);
      }, 5000);
    }
  }, [audioError]);

  useEffect(() => {
    if (callId && user?._id) {
      console.log('🔌 Attempting to connect to WebSocket...');
      console.log('📋 Connection details:', { callId, userId: user._id });
      console.log('🔑 Auth token:', localStorage.getItem('authToken') ? 'Present' : 'Missing');
      
      // The hook handles connection internally
      joinCall(callId, user._id);
    }

    return () => {
      console.log('🔌 Disconnecting from WebSocket...');
      leaveCall(callId);
    };
  }, [callId, user?._id, joinCall, leaveCall]);

  // Auto-start recording when WebSocket connects
  useEffect(() => {
    console.log('🔍 Auto-recording check:', { 
      isConnected, 
      isSupported, 
      isRecording, 
      hasAudioCapture: !!startRecording 
    });
    
    if (isConnected && isSupported && !isRecording) {
      console.log('🎤 Auto-starting recording...');
      startRecording();
      setIsTranscribing(true);
      setShowRecordingNotification(true);
      
      // Hide notification after 3 seconds
      setTimeout(() => {
        setShowRecordingNotification(false);
      }, 3000);
    } else {
      console.log('⏸️ Auto-recording conditions not met:', {
        isConnected,
        isSupported,
        isRecording,
        reason: !isConnected ? 'not connected' : !isSupported ? 'not supported' : isRecording ? 'already recording' : 'unknown'
      });
    }
  }, [isConnected, isSupported, isRecording, startRecording]);

  // Update transcription state when recording starts/stops
  useEffect(() => {
    setIsTranscribing(isRecording);
  }, [isRecording]);

  // Auto-scroll to bottom when new transcripts arrive
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [safeTranscripts]);

  // Auto-scroll to bottom when new suggestions arrive
  useEffect(() => {
    if (suggestionsRef.current) {
      suggestionsRef.current.scrollTop = suggestionsRef.current.scrollHeight;
    }
  }, [safeSuggestions]);

  // Notify parent components of updates
  useEffect(() => {
    if (safeTranscripts.length > 0 && onTranscriptUpdate) {
      onTranscriptUpdate(safeTranscripts[safeTranscripts.length - 1]);
    }
  }, [safeTranscripts, onTranscriptUpdate]);

  useEffect(() => {
    if (safeSuggestions.length > 0 && onSuggestionUpdate) {
      onSuggestionUpdate(safeSuggestions[safeSuggestions.length - 1]);
    }
  }, [safeSuggestions, onSuggestionUpdate]);

  const handleUseSuggestion = (suggestionId: string) => {
    markSuggestionUsed(suggestionId);
  };

  const handleRequestSuggestion = () => {
    requestSuggestion();
  };

  const toggleTranscription = () => {
    if (isRecording) {
      stopRecording();
      setIsTranscribing(false);
    } else {
      startRecording();
      setIsTranscribing(true);
    }
  };

  // Show loading state while connecting
  if (!isConnected) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="flex border-b">
          <button className="flex-1 px-4 py-3 text-sm font-medium text-gray-400">
            <Activity className="h-4 w-4 inline mr-2" />
            Live
          </button>
          <button className="flex-1 px-4 py-3 text-sm font-medium text-gray-400">
            <MessageSquare className="h-4 w-4 inline mr-2" />
            Transcript
          </button>
          <button className="flex-1 px-4 py-3 text-sm font-medium text-gray-400">
            <Brain className="h-4 w-4 inline mr-2" />
            AI
          </button>
          <button className="flex-1 px-4 py-3 text-sm font-medium text-gray-400">
            <Users className="h-4 w-4 inline mr-2" />
            People
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-blue-500" />
            <p className="text-sm text-gray-500">Connecting to meeting...</p>
            
            {/* Debug Information */}
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-left">
              <h4 className="text-xs font-medium text-gray-700 mb-2">Debug Info:</h4>
              <div className="text-xs space-y-1">
                <div>🔑 Auth Token: {localStorage.getItem('authToken') ? '✅ Present' : '❌ Missing'}</div>
                <div>👤 User ID: {user?._id || '❌ Not logged in'}</div>
                <div>📞 Call ID: {callId || '❌ Missing'}</div>
                <div>🔌 WebSocket: {isConnected ? '✅ Connected' : '❌ Disconnected'}</div>
                <div>🎤 Audio Support: {isSupported ? '✅ Supported' : '❌ Not supported'}</div>
                <div>🎤 Recording: {isRecording ? '✅ Active' : '❌ Inactive'}</div>
                {audioError && <div className="text-red-600">❌ Audio Error: {audioError}</div>}
              </div>
            </div>
            
            {!localStorage.getItem('authToken') && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  ⚠️ You need to be logged in to use real-time features. 
                  Please sign in to your account.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Tab Navigation */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('live')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'live' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Activity className="h-4 w-4 inline mr-2" />
          Live
        </button>
        <button
          onClick={() => setActiveTab('transcript')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'transcript' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <MessageSquare className="h-4 w-4 inline mr-2" />
          Transcript
        </button>
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'suggestions' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Brain className="h-4 w-4 inline mr-2" />
          AI
        </button>
        <button
          onClick={() => setActiveTab('participants')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'participants' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="h-4 w-4 inline mr-2" />
          People
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'live' && (
          <div className="h-full flex flex-col p-4">
            {/* Debug Panel */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-xs font-medium text-blue-700 mb-2">🔧 Debug Info:</h4>
              <div className="text-xs space-y-1 text-blue-600">
                <div>🔌 WebSocket: {isConnected ? '✅ Connected' : '❌ Disconnected'}</div>
                <div>🎤 Audio Support: {isSupported ? '✅ Supported' : '❌ Not supported'}</div>
                <div>🎤 Recording: {isRecording ? '✅ Active' : '❌ Inactive'}</div>
                <div>📝 Transcripts: {safeTranscripts.length} entries</div>
                <div>🤖 Suggestions: {safeSuggestions.length} active</div>
                {audioError && <div className="text-red-600">❌ Audio Error: {audioError}</div>}
              </div>
            </div>
            
            {/* Auto-recording notification */}
            {showRecordingNotification && (
              <div className={`mb-4 p-3 border rounded-lg ${
                audioError 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full animate-pulse mr-2 ${
                    audioError ? 'bg-red-500' : 'bg-green-500'
                  }`}></div>
                  <p className={`text-sm ${
                    audioError ? 'text-red-800' : 'text-green-800'
                  }`}>
                    {audioError ? (
                      `🎤 Recording error: ${audioError}. Please check microphone permissions.`
                    ) : (
                      '🎤 Recording started automatically. Transcription and AI suggestions are now active.'
                    )}
                  </p>
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
                Live Meeting View
              </h3>
              <div className="flex items-center space-x-2">
                {isRecording && (
                  <div className="flex items-center text-xs text-green-600">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-1"></div>
                    Recording
                  </div>
                )}
                <button
                  onClick={toggleTranscription}
                  className={`flex items-center px-3 py-1 rounded text-xs font-medium ${
                    isRecording 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {isRecording ? <MicOff className="h-3 w-3 mr-1" /> : <Mic className="h-3 w-3 mr-1" />}
                  {isRecording ? 'Stop' : 'Start'} Recording
                </button>
              </div>
            </div>
            
            {/* Side-by-side layout for transcript and AI suggestions */}
            <div className="grid grid-cols-2 gap-4 h-full">
              {/* Transcript Section */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-700">Live Transcript</h4>
                  <span className="text-xs text-gray-500">{safeTranscripts.length} entries</span>
                </div>
                <div 
                  ref={transcriptRef}
                  className="flex-1 bg-gray-50 rounded-lg p-3 overflow-y-auto"
                >
                  {safeTranscripts.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <MessageSquare className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">Waiting for conversation to begin...</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {safeTranscripts.slice(-15).map((transcript, index) => (
                        <div key={transcript.id || index} className="p-2 bg-white rounded border-l-2 border-blue-500">
                          <div className="flex items-start justify-between">
                            <span className="text-xs font-medium text-blue-600">
                              {transcript.speaker || 'Unknown'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(transcript.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-xs mt-1 text-gray-700">{transcript.text}</p>
                          {transcript.confidence && (
                            <div className="mt-1">
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>Confidence</span>
                                <span>{Math.round(transcript.confidence * 100)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                                <div 
                                  className="bg-blue-500 h-1 rounded-full" 
                                  style={{ width: `${transcript.confidence * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* AI Suggestions Section */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-700">AI Suggestions</h4>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">{safeSuggestions.length} active</span>
                    <button
                      onClick={handleRequestSuggestion}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                    >
                      Request
                    </button>
                  </div>
                </div>
                <div 
                  ref={suggestionsRef}
                  className="flex-1 bg-blue-50 rounded-lg p-3 overflow-y-auto"
                >
                  {safeSuggestions.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <Brain className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">AI is listening and will provide suggestions based on the conversation.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {safeSuggestions.slice(-8).map((suggestion, index) => (
                        <div key={suggestion.id || index} className="p-2 bg-white rounded border-l-2 border-green-500">
                          <div className="flex items-start justify-between">
                            <span className="text-xs font-medium text-green-600">
                              {suggestion.type.replace('_', ' ')}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(suggestion.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-xs mt-1 text-gray-700">{suggestion.text}</p>
                          {suggestion.confidence && (
                            <div className="mt-1">
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>Confidence</span>
                                <span>{Math.round(suggestion.confidence * 100)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                                <div 
                                  className="bg-green-500 h-1 rounded-full" 
                                  style={{ width: `${suggestion.confidence * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                          {!suggestion.used && (
                            <button
                              onClick={() => handleUseSuggestion(suggestion.id)}
                              className="mt-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                            >
                              Use Suggestion
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transcript' && (
          <div className="p-4">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
              Full Transcript ({safeTranscripts.length} entries)
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {safeTranscripts.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Waiting for conversation to begin...</p>
                </div>
              ) : (
                safeTranscripts.map((transcript, index) => (
                  <div key={transcript.id || index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <span className="text-xs font-medium text-blue-600">
                        {transcript.speaker || 'Unknown'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(transcript.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{transcript.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900 flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2"></span>
                AI Suggestions ({safeSuggestions.length} active)
              </h3>
              <button
                onClick={handleRequestSuggestion}
                className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200"
              >
                Request Suggestion
              </button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {safeSuggestions.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">AI is listening and will provide suggestions based on the conversation.</p>
                </div>
              ) : (
                safeSuggestions.map((suggestion, index) => (
                  <div key={suggestion.id || index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <span className="text-xs font-medium text-blue-600">
                        {suggestion.type.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(suggestion.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{suggestion.text}</p>
                    {suggestion.confidence && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Confidence</span>
                          <span>{Math.round(suggestion.confidence * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                          <div 
                            className="bg-blue-500 h-1 rounded-full" 
                            style={{ width: `${suggestion.confidence * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    {!suggestion.used && (
                      <button
                        onClick={() => handleUseSuggestion(suggestion.id)}
                        className="mt-2 text-sm bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200"
                      >
                        Use Suggestion
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'participants' && (
          <div className="p-4">
            <h3 className="font-medium text-gray-900 mb-4">Participants ({participants.length})</h3>
            <div className="space-y-3">
              {participants.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No participants yet</p>
                </div>
              ) : (
                participants.map((participant, index) => (
                  <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                      {participant.name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{participant.name || 'Unknown User'}</p>
                      <p className="text-xs text-gray-500">{participant.email || 'No email'}</p>
                    </div>
                    <div className="flex items-center space-x-1">
                      {participant.isHost && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Host</span>
                      )}
                      <div className={`w-2 h-2 rounded-full ${participant.isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
