import React, { useEffect, useState, useCallback } from 'react';
import { Video, Settings, Users, Mic, MicOff, Share } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { InviteModal } from '../ui/InviteModal';
import { Toast } from '../ui/Toast';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAudioCapture } from '../../hooks/useAudioCapture';
import { APIService } from '../../lib/api';

interface ZoomIntegrationProps {
  callId: string;
  onMeetingStart?: (meetingData: any) => void;
  onMeetingEnd?: () => void;
  onTranscriptUpdate?: (transcript: any) => void;
  onSuggestionUpdate?: (suggestion: any) => void;
}

declare global {
  interface Window {
    ZoomMtg: any;
  }
}

export const ZoomIntegration: React.FC<ZoomIntegrationProps> = ({
  callId,
  onMeetingStart,
  onMeetingEnd,
  onTranscriptUpdate,
  onSuggestionUpdate
}) => {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [isMeetingActive, setIsMeetingActive] = useState(false);
  const [meetingData, setMeetingData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [meetingNumber, setMeetingNumber] = useState('');
  const [meetingPassword, setMeetingPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isVisible: boolean }>({
    message: '',
    type: 'info',
    isVisible: false
  });

  // WebSocket connection for real-time features
  const { 
    transcript: wsTranscripts, 
    suggestions: wsSuggestions, 
    isConnected: wsConnected,
    joinCall, 
    leaveCall, 
    markSuggestionUsed, 
    requestSuggestion,
    sendAudioData
  } = useWebSocket(callId, localStorage.getItem('userId') || undefined);

  // Audio capture for transcription
  const handleAudioData = useCallback((audioData: string) => {
    if (wsConnected) {
      sendAudioData(audioData);
    }
  }, [wsConnected, sendAudioData]);

  const { 
    isRecording: isAudioRecording, 
    isSupported: isAudioSupported, 
    error: audioError,
    startRecording: startAudioRecording, 
    stopRecording: stopAudioRecording 
  } = useAudioCapture(handleAudioData);

  useEffect(() => {
    // Load Zoom Web SDK
    const loadZoomSDK = () => {
      if (window.ZoomMtg) {
        setIsSDKLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://source.zoom.us/2.18.0/lib/vendor/react.min.js';
      script.onload = () => {
        const zoomScript = document.createElement('script');
        zoomScript.src = 'https://source.zoom.us/2.18.0/lib/vendor/react-dom.min.js';
        zoomScript.onload = () => {
          const mainScript = document.createElement('script');
          mainScript.src = 'https://source.zoom.us/2.18.0/lib/vendor/redux.min.js';
          mainScript.onload = () => {
            const sdkScript = document.createElement('script');
            sdkScript.src = 'https://source.zoom.us/2.18.0/lib/vendor/lodash.min.js';
            sdkScript.onload = () => {
              const finalScript = document.createElement('script');
              finalScript.src = 'https://source.zoom.us/zoom-meeting-2.18.0.min.js';
              finalScript.onload = () => {
                setIsSDKLoaded(true);
                console.log('✅ Zoom SDK loaded successfully');
              };
              finalScript.onerror = () => {
                setError('Failed to load Zoom SDK');
                console.error('❌ Failed to load Zoom SDK');
              };
              document.head.appendChild(finalScript);
            };
            document.head.appendChild(sdkScript);
          };
          document.head.appendChild(mainScript);
        };
        document.head.appendChild(zoomScript);
      };
      document.head.appendChild(script);
    };

    loadZoomSDK();
  }, []);

  // Connect to WebSocket when meeting starts
  useEffect(() => {
    if (meetingData && wsConnected) {
      const userId = localStorage.getItem('userId') || 'anonymous';
      joinCall(callId, userId, 'zoom');
      console.log('✅ Connected to WebSocket for real-time features');
    }
  }, [meetingData, wsConnected, callId, joinCall]);

  // Update local state with WebSocket data
  useEffect(() => {
    if (wsTranscripts.length > 0) {
      setTranscripts(wsTranscripts);
      // Call the callback for parent components
      wsTranscripts.forEach(transcript => {
        if (onTranscriptUpdate) {
          onTranscriptUpdate(transcript);
        }
      });
    }
  }, [wsTranscripts, onTranscriptUpdate]);

  useEffect(() => {
    if (wsSuggestions.length > 0) {
      setAiSuggestions(wsSuggestions);
      // Call the callback for parent components
      wsSuggestions.forEach(suggestion => {
        if (onSuggestionUpdate) {
          onSuggestionUpdate(suggestion);
        }
      });
    }
  }, [wsSuggestions, onSuggestionUpdate]);

  const createMeeting = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const meetingData = {
        topic: `AI Sales Call - ${callId}`,
        startTime: new Date().toISOString(),
        duration: 60,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      const response = await APIService.createZoomMeeting(meetingData);
      
      if (response.success) {
        setMeetingData(response.data.meeting);
        
        if (onMeetingStart) {
          onMeetingStart(response.data.meeting);
        }
      } else {
        setError(response.message || 'Failed to create meeting');
      }
    } catch (error) {
      console.error('Failed to create Zoom meeting:', error);
      setError('Failed to create meeting. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const joinMeeting = async (meetingNumber: string, password: string) => {
    if (!isSDKLoaded || !window.ZoomMtg) {
      setError('Zoom SDK not loaded');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Generate SDK signature
      console.log('Generating SDK signature for meeting:', meetingNumber);
      const response = await APIService.generateZoomSDKSignature(meetingNumber, 0);
      
      if (!response.success) {
        console.error('SDK signature generation failed:', response);
        throw new Error('Failed to generate SDK signature');
      }

      const signature = response.data.signature;
      console.log('SDK signature generated successfully');

      // Initialize Zoom SDK
      console.log('Initializing Zoom SDK...');
      window.ZoomMtg.setZoomJSLib('https://source.zoom.us/2.18.0/lib', '/av');
      window.ZoomMtg.preLoadWasm();
      window.ZoomMtg.prepareWebSDK();
      console.log('Zoom SDK initialized successfully');

      // Join meeting
      window.ZoomMtg.init({
        leaveUrl: window.location.origin,
        success: () => {
          window.ZoomMtg.join({
            signature,
            meetingNumber,
            userName: 'AI Sales Assistant User',
            apiKey: import.meta.env.VITE_ZOOM_SDK_KEY || 'NrSI3ZBVQRWehJRe9ixVw',
            userEmail: '',
            passWord: password,
            success: (success: any) => {
              console.log('✅ Joined Zoom meeting successfully', success);
              setIsMeetingActive(true);
              
              // Start AI monitoring
              if (onMeetingStart) {
                onMeetingStart({
                  meetingId: meetingNumber,
                  platform: 'zoom',
                  callId: callId
                });
              }
            },
            error: (error: any) => {
              console.error('❌ Failed to join Zoom meeting', error);
              setError('Failed to join meeting. Please check your meeting ID and password.');
            }
          });
        },
        error: (error: any) => {
          console.error('❌ Failed to initialize Zoom SDK', error);
          setError('Failed to initialize Zoom SDK');
        }
      });
    } catch (error) {
      console.error('Failed to join meeting:', error);
      setError('Failed to join meeting. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const leaveMeeting = () => {
    if (window.ZoomMtg) {
      window.ZoomMtg.leaveMeeting({
        success: () => {
          setIsMeetingActive(false);
          if (onMeetingEnd) {
            onMeetingEnd();
          }
        }
      });
    }
  };

  // Video and Audio Controls
  const toggleVideo = () => {
    if (window.ZoomMtg) {
      if (isVideoOn) {
        window.ZoomMtg.muteVideo();
        setIsVideoOn(false);
      } else {
        window.ZoomMtg.unmuteVideo();
        setIsVideoOn(true);
      }
    }
  };

  const toggleAudio = () => {
    if (window.ZoomMtg) {
      if (isAudioOn) {
        window.ZoomMtg.mute();
        setIsAudioOn(false);
      } else {
        window.ZoomMtg.unmute();
        setIsAudioOn(true);
      }
    }
  };

  const toggleScreenShare = () => {
    if (window.ZoomMtg) {
      if (isScreenSharing) {
        window.ZoomMtg.stopShare();
        setIsScreenSharing(false);
      } else {
        window.ZoomMtg.startShare();
        setIsScreenSharing(true);
      }
    }
  };

  // Handle real-time updates
  const handleTranscriptUpdate = (transcript: any) => {
    setTranscripts(prev => [...prev, transcript]);
    if (onTranscriptUpdate) {
      onTranscriptUpdate(transcript);
    }
  };

  const handleSuggestionUpdate = (suggestion: any) => {
    setAiSuggestions(prev => [...prev, suggestion]);
    if (onSuggestionUpdate) {
      onSuggestionUpdate(suggestion);
    }
  };

  // Join meeting as host with camera/microphone enabled
  const joinMeetingAsHost = async (meetingNumber: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Joining meeting as host:', meetingNumber);

      // Get the host URL from the meeting data
      const hostUrl = meetingData?.startUrl;
      
      if (!hostUrl) {
        setError('Host URL not available. Please create a new meeting.');
        return;
      }

      console.log('Using host URL:', hostUrl);

      // Create a launch interface instead of iframe (to avoid X-Frame-Options issues)
      const videoArea = document.querySelector('.video-area');
      if (videoArea) {
        // Create a container with instructions and launch button
        videoArea.innerHTML = `
          <div class="w-full h-full flex flex-col bg-gray-900">
            <div class="flex-1 flex items-center justify-center">
              <div class="text-center text-white p-8">
                <div class="mb-6">
                  <svg class="w-16 h-16 mx-auto mb-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                  </svg>
                  <h2 class="text-2xl font-bold mb-2">🎬 Start Zoom Meeting</h2>
                  <p class="text-gray-300 mb-4">Click the button below to start the meeting as host</p>
                </div>
                
                <div class="bg-gray-800 rounded-lg p-4 mb-6 text-left">
                  <h3 class="font-semibold mb-2">Meeting Details:</h3>
                  <p><span class="text-gray-400">Meeting ID:</span> <span class="font-mono text-green-400">${meetingNumber}</span></p>
                  <p><span class="text-gray-400">Password:</span> <span class="font-mono text-green-400">${password}</span></p>
                  <p><span class="text-gray-400">Status:</span> <span class="text-green-400">Ready to Start</span></p>
                </div>
                
                <button 
                  id="startMeetingBtn"
                  class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors duration-200 flex items-center justify-center mx-auto"
                >
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  🚀 Launch Meeting as Host
                </button>
                
                <p class="text-sm text-gray-400 mt-4">
                  The meeting will open in a new tab with full camera and microphone access
                </p>
              </div>
            </div>
            <div class="p-4 bg-gray-800 border-t border-gray-700">
              <div class="flex items-center justify-between">
                <div class="text-white text-sm">
                  <span class="font-medium">Meeting ID:</span> ${meetingNumber} | <span class="text-green-400">Host Mode</span>
                </div>
                <div class="flex items-center space-x-2">
                  <span class="text-green-400 text-xs">✅ Ready to Launch</span>
                </div>
              </div>
            </div>
          </div>
        `;
        
        // Add click handler to launch meeting
        const startBtn = document.getElementById('startMeetingBtn') as HTMLButtonElement;
        if (startBtn) {
          startBtn.addEventListener('click', () => {
            // Open the host URL in a new tab
            window.open(hostUrl, '_blank', 'noopener,noreferrer');
            
            // Update UI to show meeting is active
            setIsMeetingActive(true);
            
            // Start AI monitoring
            if (onMeetingStart) {
              onMeetingStart({
                meetingId: meetingNumber,
                platform: 'zoom',
                callId: callId,
                isHost: true
              });
            }
            
            // Update the button to show meeting is active
            startBtn.innerHTML = `
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              ✅ Meeting Launched
            `;
            startBtn.className = 'bg-green-600 text-white font-bold py-3 px-8 rounded-lg text-lg flex items-center justify-center mx-auto cursor-default';
            startBtn.disabled = true;
          });
        }
      }

      setIsMeetingActive(true);
      
      // Start AI monitoring
      if (onMeetingStart) {
        onMeetingStart({
          meetingId: meetingNumber,
          platform: 'zoom',
          callId: callId,
          isHost: true
        });
      }

      console.log('✅ Meeting started as host successfully');
    } catch (error) {
      console.error('Failed to start meeting as host:', error);
      setError('Failed to start meeting as host. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Send meeting invites via email
  const sendMeetingInvite = async (emails: string[]) => {
    try {
      setIsLoading(true);
      setError(null);

      // Send meeting invite via API
      const response = await APIService.sendMeetingInvite({
        meetingId: meetingData.meetingId,
        meetingTopic: meetingData.topic,
        joinUrl: meetingData.joinUrl,
        password: meetingData.password,
        startTime: meetingData.startTime,
        emails: emails
      });

      if (response.success) {
        setToast({
          message: `Meeting invites sent to ${emails.length} participants!`,
          type: 'success',
          isVisible: true
        });
        setIsInviteModalOpen(false);
      } else {
        setToast({
          message: 'Failed to send meeting invites',
          type: 'error',
          isVisible: true
        });
      }
    } catch (error) {
      console.error('Failed to send meeting invites:', error);
      setError('Failed to send meeting invites. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinExistingMeeting = () => {
    if (!meetingNumber.trim()) {
      setError('Please enter a meeting ID');
      return;
    }
    joinMeeting(meetingNumber, meetingPassword);
  };

  if (!isSDKLoaded) {
    return (
      <Card>
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Zoom SDK...</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Video className="h-6 w-6 text-primary-600 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Zoom Integration</h3>
            <p className="text-sm text-gray-600">
              {isMeetingActive ? 'Meeting in progress' : 'Ready to start or join meeting'}
            </p>
            <div className="flex items-center space-x-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-xs text-gray-500">
                {wsConnected ? 'AI Connected' : 'AI Disconnected'}
              </span>
            </div>
          </div>
        </div>
        <div className={`
          w-3 h-3 rounded-full
          ${isMeetingActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}
        `} />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {audioError && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-700 text-sm">Audio: {audioError}</p>
        </div>
      )}

      {!isMeetingActive ? (
        <div className="space-y-4">
          {meetingData ? (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Meeting Created</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Meeting ID:</span>
                  <span className="ml-2 font-mono">{meetingData.meetingId}</span>
                </div>
                <div>
                  <span className="text-gray-600">Password:</span>
                  <span className="ml-2 font-mono">{meetingData.password}</span>
                </div>
                <div>
                  <span className="text-gray-600">Join URL:</span>
                  <a 
                    href={meetingData.joinUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-2 text-primary-600 hover:text-primary-700 underline"
                  >
                    Open in Zoom App
                  </a>
                </div>
              </div>
              <div className="flex space-x-2 mt-4">
                <Button
                  onClick={() => joinMeetingAsHost(meetingData.meetingId, meetingData.password)}
                  loading={isLoading}
                  className="flex-1"
                >
                  🎬 Start Meeting as Host
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setIsInviteModalOpen(true)}
                >
                  Send Invites
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(meetingData.joinUrl);
                    setToast({
                      message: 'Meeting link copied to clipboard!',
                      type: 'success',
                      isVisible: true
                    });
                  }}
                >
                  Copy Link
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (meetingData.startUrl) {
                      window.open(meetingData.startUrl, '_blank');
                      setToast({
                        message: 'Opening meeting as host in new tab...',
                        type: 'info',
                        isVisible: true
                      });
                    } else {
                      setToast({
                        message: 'Host URL not available',
                        type: 'error',
                        isVisible: true
                      });
                    }
                  }}
                >
                  Open as Host
                </Button>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      const response = await APIService.disableMeetingNotifications(meetingData.meetingId);
                      if (response.success) {
                        setToast({
                          message: 'Email notifications disabled!',
                          type: 'success',
                          isVisible: true
                        });
                      }
                    } catch (error) {
                      setToast({
                        message: 'Failed to disable notifications',
                        type: 'error',
                        isVisible: true
                      });
                    }
                  }}
                >
                  Disable Notifications
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    requestSuggestion();
                    setToast({
                      message: 'Requesting AI suggestion...',
                      type: 'info',
                      isVisible: true
                    });
                  }}
                  disabled={!wsConnected}
                >
                  Request AI
                </Button>
                <Button
                  variant={isAudioRecording ? "error" : "secondary"}
                  onClick={() => {
                    if (isAudioRecording) {
                      stopAudioRecording();
                      setToast({
                        message: 'Audio recording stopped',
                        type: 'info',
                        isVisible: true
                      });
                    } else {
                      startAudioRecording();
                      setToast({
                        message: 'Audio recording started',
                        type: 'success',
                        isVisible: true
                      });
                    }
                  }}
                  disabled={!isAudioSupported || !wsConnected}
                >
                  {isAudioRecording ? 'Stop Recording' : 'Start Recording'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Button
                onClick={createMeeting}
                loading={isLoading}
                className="w-full"
              >
                <Video className="h-4 w-4 mr-2" />
                Create New Meeting
              </Button>
              
              <div className="text-center text-gray-500">or</div>
              
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Meeting ID"
                  value={meetingNumber}
                  onChange={(e) => setMeetingNumber(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <input
                  type="password"
                  placeholder="Meeting Password (optional)"
                  value={meetingPassword}
                  onChange={(e) => setMeetingPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <Button
                  variant="secondary"
                  className="w-full"
                  disabled={isLoading || !meetingNumber.trim()}
                  onClick={handleJoinExistingMeeting}
                >
                  Join Existing Meeting
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-3" />
              <span className="text-green-800 font-medium">Meeting Active</span>
            </div>
            <p className="text-green-700 text-sm mt-1">
              AI assistance is monitoring your call and providing real-time suggestions.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={toggleAudio}
                className={`p-2 rounded-lg transition-colors ${
                  isAudioOn 
                    ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                    : 'bg-red-100 text-red-600 hover:bg-red-200'
                }`}
                title={isAudioOn ? 'Mute Audio' : 'Unmute Audio'}
              >
                {isAudioOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </button>
              
              <button 
                onClick={toggleVideo}
                className={`p-2 rounded-lg transition-colors ${
                  isVideoOn 
                    ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                    : 'bg-red-100 text-red-600 hover:bg-red-200'
                }`}
                title={isVideoOn ? 'Turn Off Video' : 'Turn On Video'}
              >
                <Video className="h-4 w-4" />
              </button>
              
              <button 
                onClick={toggleScreenShare}
                className={`p-2 rounded-lg transition-colors ${
                  isScreenSharing 
                    ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
              >
                <Share className="h-4 w-4" />
              </button>
            </div>
            
            <Button
              variant="error"
              onClick={leaveMeeting}
              size="sm"
            >
              Leave Meeting
            </Button>
          </div>

          {/* Live Transcript */}
          <div className="mt-4 bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
              Live Transcript ({transcripts.length} entries)
            </h4>
            <div className="max-h-32 overflow-y-auto">
              {transcripts.length === 0 ? (
                <div className="text-gray-500 text-sm flex items-center">
                  <span className="mr-2">💬</span>
                  Waiting for conversation to begin...
                </div>
              ) : (
                transcripts.map((transcript, index) => (
                  <div key={index} className="text-sm mb-2 p-2 bg-white rounded border">
                    <span className="font-medium text-blue-600">{transcript.speaker}:</span>
                    <span className="ml-2">{transcript.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AI Suggestions */}
          <div className="mt-4 bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2"></span>
              AI Suggestions ({aiSuggestions.length} active)
            </h4>
            <div className="max-h-32 overflow-y-auto">
              {aiSuggestions.length === 0 ? (
                <div className="text-gray-500 text-sm flex items-center">
                  <span className="mr-2">🤖</span>
                  AI is listening and will provide suggestions based on the conversation.
                </div>
              ) : (
                aiSuggestions.map((suggestion, index) => (
                  <div key={index} className="text-sm mb-2 p-2 bg-white rounded border border-blue-200">
                    <span className="font-medium text-blue-600">AI Suggestion:</span>
                    <span className="ml-2">{suggestion.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSendInvites={sendMeetingInvite}
        meetingData={meetingData}
        isLoading={isLoading}
      />

      {/* Toast Notifications */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />
    </Card>
  );
};