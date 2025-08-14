import React, { useState, useEffect } from 'react';
import { Video, Mic, MicOff, Share, Users, MessageSquare, Brain, Settings, Activity } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ZoomIntegration } from '../integrations/ZoomIntegration';
import { RealTimeMeetingPanel } from './RealTimeMeetingPanel';

interface CallInterfaceProps {
  callId: string;
}

export const CallInterface: React.FC<CallInterfaceProps> = ({ callId }) => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [meetingData, setMeetingData] = useState<any>(null);
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'video' | 'live' | 'transcript' | 'suggestions' | 'participants'>('video');

  const handleMeetingStart = (data: any) => {
    setMeetingData(data);
    setIsCallActive(true);
    console.log('Meeting started:', data);
  };

  const handleMeetingEnd = () => {
    setIsCallActive(false);
    setMeetingData(null);
    console.log('Meeting ended');
  };

  const handleTranscriptUpdate = (transcript: any) => {
    setTranscripts(prev => [...prev, transcript]);
    console.log('Transcript update:', transcript);
  };

  const handleSuggestionUpdate = (suggestion: any) => {
    setAiSuggestions(prev => [...prev, suggestion]);
    console.log('AI suggestion:', suggestion);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${isCallActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
            <h1 className="text-xl font-semibold text-gray-900">
              {isCallActive ? 'Active Call' : 'AI Sales Call Assistant'}
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Call ID: {callId}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Panel - Video/Meeting Area */}
        <div className="flex-1 flex flex-col">
          {/* Video Area */}
          <div className="flex-1 bg-black relative video-area">
            {isCallActive ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center text-white">
                  <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Video call in progress</p>
                  <p className="text-sm opacity-75">Zoom Meeting with AI assistance</p>
                  {meetingData && (
                    <div className="mt-4 text-xs opacity-60">
                      Meeting ID: {meetingData.meetingId}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center text-white">
                  <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Ready to start meeting</p>
                  <p className="text-sm opacity-75">Create or join a Zoom meeting to begin</p>
                </div>
              </div>
            )}
          </div>

          {/* Zoom Integration */}
          <div className="bg-white border-t">
            <ZoomIntegration
              callId={callId}
              onMeetingStart={handleMeetingStart}
              onMeetingEnd={handleMeetingEnd}
              onTranscriptUpdate={handleTranscriptUpdate}
              onSuggestionUpdate={handleSuggestionUpdate}
            />
          </div>
        </div>

        {/* Right Panel - AI Features */}
        <div className="w-80 bg-white border-l flex flex-col">
          {/* Tab Navigation */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('video')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'video' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Video className="h-4 w-4 inline mr-2" />
              Video
            </button>
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
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'video' && (
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-4">Video Controls</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Camera</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">On</span>
                      <div className="w-8 h-4 bg-green-500 rounded-full relative">
                        <div className="w-3 h-3 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Microphone</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">On</span>
                      <div className="w-8 h-4 bg-green-500 rounded-full relative">
                        <div className="w-3 h-3 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Screen Share</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">Off</span>
                      <div className="w-8 h-4 bg-gray-300 rounded-full relative">
                        <div className="w-3 h-3 bg-white rounded-full absolute left-0.5 top-0.5"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'live' && (
              <RealTimeMeetingPanel
                callId={callId}
                meetingData={meetingData}
                onTranscriptUpdate={handleTranscriptUpdate}
                onSuggestionUpdate={handleSuggestionUpdate}
              />
            )}

            {activeTab === 'transcript' && (
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
                  Live Transcript ({transcripts.length} entries)
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {transcripts.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Waiting for conversation to begin...</p>
                    </div>
                  ) : (
                    transcripts.map((transcript, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <span className="text-xs font-medium text-blue-600">{transcript.speaker || 'Unknown'}</span>
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
                <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2"></span>
                  AI Suggestions ({aiSuggestions.length} active)
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {aiSuggestions.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">AI is listening and will provide suggestions based on the conversation.</p>
                    </div>
                  ) : (
                    aiSuggestions.map((suggestion, index) => (
                      <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start justify-between">
                          <span className="text-xs font-medium text-blue-600">AI Suggestion</span>
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
      </div>
    </div>
  );
};