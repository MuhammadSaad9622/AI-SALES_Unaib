import React, { useEffect, useState, useCallback } from "react";
import { Video, Settings, Users, Mic, MicOff, Share } from "lucide-react";
import { Card } from "../ui/Card";
import { InviteModal } from "../ui/InviteModal";
import { Toast } from "../ui/Toast";
import { useWebSocket } from "../../hooks/useWebSocket";
import { useAudioCapture } from "../../hooks/useAudioCapture";
import { APIService } from "../../lib/api";

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
  onSuggestionUpdate,
}) => {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [isMeetingActive, setIsMeetingActive] = useState(false);
  const [meetingData, setMeetingData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [meetingNumber, setMeetingNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
    isVisible: boolean;
  }>({
    message: "",
    type: "info",
    isVisible: false,
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
    sendAudioData,
  } = useWebSocket(callId, localStorage.getItem("userId") || undefined);

  // Audio capture for transcription
  const handleAudioData = useCallback(
    (audioData: string) => {
      if (wsConnected) {
        sendAudioData(audioData);
      }
    },
    [wsConnected, sendAudioData]
  );

  const {
    isRecording: isAudioRecording,
    isSupported: isAudioSupported,
    error: audioError,
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
  } = useAudioCapture(handleAudioData);

  useEffect(() => {
    // Load Zoom Web SDK
    const loadZoomSDK = () => {
      if (window.ZoomMtg) {
        setIsSDKLoaded(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://source.zoom.us/2.18.0/lib/vendor/react.min.js";
      script.onload = () => {
        const zoomScript = document.createElement("script");
        zoomScript.src =
          "https://source.zoom.us/2.18.0/lib/vendor/react-dom.min.js";
        zoomScript.onload = () => {
          const mainScript = document.createElement("script");
          mainScript.src =
            "https://source.zoom.us/2.18.0/lib/vendor/redux.min.js";
          mainScript.onload = () => {
            const sdkScript = document.createElement("script");
            sdkScript.src =
              "https://source.zoom.us/2.18.0/lib/vendor/lodash.min.js";
            sdkScript.onload = () => {
              const finalScript = document.createElement("script");
              finalScript.src =
                "https://source.zoom.us/zoom-meeting-2.18.0.min.js";
              finalScript.onload = () => {
                setIsSDKLoaded(true);
                console.log("✅ Zoom SDK loaded successfully");
              };
              finalScript.onerror = () => {
                setError("Failed to load Zoom SDK");
                console.error("❌ Failed to load Zoom SDK");
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
      const userId = localStorage.getItem("userId") || "anonymous";
      joinCall(callId, userId, "zoom");
      console.log("✅ Connected to WebSocket for real-time features");
    }
  }, [meetingData, wsConnected, callId, joinCall]);

  // Update local state with WebSocket data
  useEffect(() => {
    if (wsTranscripts.length > 0) {
      setTranscripts(wsTranscripts);
      // Call the callback for parent components
      wsTranscripts.forEach((transcript) => {
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
      wsSuggestions.forEach((suggestion) => {
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
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      const response = await APIService.createZoomMeeting(meetingData);

      if (response.success) {
        setMeetingData(response.data.meeting);

        if (onMeetingStart) {
          onMeetingStart(response.data.meeting);
        }
      } else {
        setError(response.message || "Failed to create meeting");
      }
    } catch (error) {
      console.error("Failed to create Zoom meeting:", error);
      setError("Failed to create meeting. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const joinMeeting = async (meetingNumber: string) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log("Generating ZAK token for meeting:", meetingNumber);

      // Generate ZAK token for authenticated user join
      const zakResponse = await APIService.generateZoomZAK(meetingNumber);

      if (!zakResponse.success) {
        console.error("ZAK token generation failed:", zakResponse);
        throw new Error("Failed to generate ZAK token");
      }

      const zakToken = zakResponse.data.zak;
      const user = zakResponse.data.user;
      console.log("ZAK token generated successfully for user:", user.email);

      // Construct Zoom web client JOIN URL with ZAK token (no password needed)
      const zoomJoinUrl = `https://us05web.zoom.us/j/${meetingNumber.trim()}?zak=${encodeURIComponent(
        zakToken
      )}`;

      console.log("Opening Zoom meeting join URL with ZAK token:", zoomJoinUrl);

      // Open meeting in new tab with ZAK authentication
      const zoomWindow = window.open(zoomJoinUrl, "_blank", "noopener,noreferrer");

        // Open the AI popup in a separate window (half screen)
        const popupUrl = `/popup/${callId}`;
        const popupWindow = window.open(
          popupUrl,
          "ai-assistant",
          `width=${Math.floor(screen.width / 2)},height=${screen.height},scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no,left=${Math.floor(screen.width / 2)},top=0`
        );

      if (!popupWindow) {
        setError("Popup blocked. Please allow popups for this site.");
        return;
      }

      // Update UI to show meeting is active
      setIsMeetingActive(true);

      // Start AI monitoring
      if (onMeetingStart) {
        onMeetingStart({
          meetingId: meetingNumber,
          platform: "zoom",
          callId: callId,
          user: user,
        });
      }

      setToast({
        message: `Meeting and AI Assistant launched in separate windows!`,
        type: "success",
        isVisible: true,
      });

      console.log("✅ Meeting joined successfully as authenticated user");
    } catch (error) {
      console.error("Failed to join meeting:", error);
      setError("Failed to join meeting. Please try again.");
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
        },
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

  // Join meeting as host with camera/microphone enabled
  const joinMeetingAsHost = async (meetingNumber: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log("Joining meeting as host:", meetingNumber);

      // Get the host URL from the meeting data
      const hostUrl = meetingData?.startUrl;
      console.log("Meeting Data");
      console.log(meetingData);
      console.log("Host URL");
      console.log(hostUrl);

      if (!hostUrl) {
        setError("Host URL not available. Please create a new meeting.");
        return;
      }

      console.log("Using host URL:", hostUrl);

      // Open the host URL in a new tab
      const zoomWindow = window.open(hostUrl, "_blank", "noopener,noreferrer");

        // Open the AI popup in a separate window (half screen)
        const popupUrl = `/popup/${callId}`;
        const popupWindow = window.open(
          popupUrl,
          "ai-assistant",
          `width=${Math.floor(screen.width / 2)},height=${screen.height},scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no,left=${Math.floor(screen.width / 2)},top=0`
        );

      if (!popupWindow) {
        setError("Popup blocked. Please allow popups for this site.");
        return;
      }

      // Update UI to show meeting is active
      setIsMeetingActive(true);

      // Start AI monitoring
      if (onMeetingStart) {
        onMeetingStart({
          meetingId: meetingNumber,
          platform: "zoom",
          callId: callId,
          isHost: true,
        });
      }

      setToast({
        message: "Meeting and AI Assistant launched in separate windows!",
        type: "success",
        isVisible: true,
      });

      console.log("✅ Meeting and AI popup started successfully");
    } catch (error) {
      console.error("Failed to start meeting as host:", error);
      setError("Failed to start meeting as host. Please try again.");
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
        emails: emails,
      });

      if (response.success) {
        setToast({
          message: `Meeting invites sent to ${emails.length} participants!`,
          type: "success",
          isVisible: true,
        });
        setIsInviteModalOpen(false);
      } else {
        setToast({
          message: "Failed to send meeting invites",
          type: "error",
          isVisible: true,
        });
      }
    } catch (error) {
      console.error("Failed to send meeting invites:", error);
      setError("Failed to send meeting invites. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinExistingMeeting = () => {
    if (!meetingNumber.trim()) {
      setError("Please enter a meeting ID");
      return;
    }
    joinMeeting(meetingNumber);
  };

  if (!isSDKLoaded) {
    return (
      <Card>
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading Zoom SDK...</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="h-full">
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Video className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Zoom Integration
              </h3>
              <p className="text-sm text-slate-600">
                {isMeetingActive
                  ? "Meeting in progress"
                  : "Ready to start or join meeting"}
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <div
                  className={`w-2 h-2 rounded-full ${
                    wsConnected ? "bg-emerald-500" : "bg-red-500"
                  }`}
                ></div>
                <span className="text-xs text-slate-500">
                  {wsConnected ? "AI Connected" : "AI Disconnected"}
                </span>
              </div>
            </div>
          </div>
          <div
            className={`w-3 h-3 rounded-full ${
              isMeetingActive ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
            }`}
          />
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

        <div className="min-h-[400px]">
          {!isMeetingActive ? (
            <div className="space-y-4">
              {meetingData ? (
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-medium text-slate-900 mb-2">
                    Meeting Created
                  </h4>
                  <div className="space-y-2 text-sm mb-4">
                    <div>
                      <span className="text-slate-600">Meeting ID:</span>
                      <span className="ml-2 font-mono">
                        {meetingData.meetingId}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-600">Password:</span>
                      <span className="ml-2 font-mono">
                        {meetingData.password}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-600">Join URL:</span>
                      <a
                        href={meetingData.joinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-blue-600 hover:text-blue-700 underline"
                      >
                        Open in Zoom App
                      </a>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() =>
                        joinMeetingAsHost(
                          meetingData.meetingId,
                          meetingData.password
                        )
                      }
                      disabled={isLoading}
                      className="col-span-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Starting...
                        </>
                      ) : (
                        <>
                          <Video className="h-4 w-4 mr-2" />
                          Start Meeting as Host
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setIsInviteModalOpen(true)}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2 px-3 rounded-lg transition-colors duration-200 border border-blue-200"
                    >
                      <Users className="h-4 w-4 inline mr-1" />
                      Send Invites
                    </button>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(meetingData.joinUrl);
                        setToast({
                          message: "Meeting link copied to clipboard!",
                          type: "success",
                          isVisible: true,
                        });
                      }}
                      className="bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium py-2 px-3 rounded-lg transition-colors duration-200 border border-slate-200"
                    >
                      Copy Link
                    </button>

                    <button
                      onClick={() => {
                        requestSuggestion();
                        setToast({
                          message: "Requesting AI suggestion...",
                          type: "info",
                          isVisible: true,
                        });
                      }}
                      disabled={!wsConnected}
                      className="bg-purple-50 hover:bg-purple-100 disabled:bg-slate-100 disabled:text-slate-400 text-purple-700 font-medium py-2 px-3 rounded-lg transition-colors duration-200 border border-purple-200 disabled:border-slate-200"
                    >
                      Request AI
                    </button>

                    <button
                      onClick={() => {
                        if (isAudioRecording) {
                          stopAudioRecording();
                          setToast({
                            message: "Audio recording stopped",
                            type: "info",
                            isVisible: true,
                          });
                        } else {
                          startAudioRecording();
                          setToast({
                            message: "Audio recording started",
                            type: "success",
                            isVisible: true,
                          });
                        }
                      }}
                      disabled={!isAudioSupported || !wsConnected}
                      className={`font-medium py-2 px-3 rounded-lg transition-colors duration-200 border ${
                        isAudioRecording
                          ? "bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                          : "bg-green-50 hover:bg-green-100 disabled:bg-slate-100 disabled:text-slate-400 text-green-700 border-green-200 disabled:border-slate-200"
                      }`}
                    >
                      {isAudioRecording ? (
                        <>
                          <MicOff className="h-4 w-4 inline mr-1" />
                          Stop Recording
                        </>
                      ) : (
                        <>
                          <Mic className="h-4 w-4 inline mr-1" />
                          Start Recording
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={createMeeting}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Video className="h-4 w-4 mr-2" />
                        Create New Meeting
                      </>
                    )}
                  </button>

                  <div className="text-center text-slate-500 text-sm font-medium">
                    or
                  </div>

                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Meeting ID"
                      value={meetingNumber}
                      onChange={(e) => setMeetingNumber(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                    <button
                      onClick={handleJoinExistingMeeting}
                      disabled={
                        isLoading || !meetingNumber.trim() || !isSDKLoaded
                      }
                      className="w-full bg-slate-50 hover:bg-slate-100 disabled:bg-slate-100 disabled:text-slate-400 text-slate-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 border border-slate-200 disabled:border-slate-200"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-400 mr-2"></div>
                          Joining...
                        </>
                      ) : (
                        <>Join Existing Meeting</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse mr-3" />
                  <span className="text-emerald-800 font-medium">
                    Meeting Active
                  </span>
                </div>
                <p className="text-emerald-700 text-sm mt-1">
                  AI assistance is monitoring your call and providing real-time
                  suggestions.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={toggleAudio}
                    className={`p-2 rounded-lg transition-colors ${
                      isAudioOn
                        ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                        : "bg-red-100 text-red-600 hover:bg-red-200"
                    }`}
                    title={isAudioOn ? "Mute Audio" : "Unmute Audio"}
                  >
                    {isAudioOn ? (
                      <Mic className="h-4 w-4" />
                    ) : (
                      <MicOff className="h-4 w-4" />
                    )}
                  </button>

                  <button
                    onClick={toggleVideo}
                    className={`p-2 rounded-lg transition-colors ${
                      isVideoOn
                        ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                        : "bg-red-100 text-red-600 hover:bg-red-200"
                    }`}
                    title={isVideoOn ? "Turn Off Video" : "Turn On Video"}
                  >
                    <Video className="h-4 w-4" />
                  </button>

                  <button
                    onClick={toggleScreenShare}
                    className={`p-2 rounded-lg transition-colors ${
                      isScreenSharing
                        ? "bg-blue-100 text-blue-600 hover:bg-blue-200"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                    title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
                  >
                    <Share className="h-4 w-4" />
                  </button>
                </div>

                <button
                  onClick={leaveMeeting}
                  className="bg-red-50 hover:bg-red-100 text-red-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 border border-red-200"
                >
                  Leave Meeting
                </button>
              </div>

              <div className="mt-4 bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium text-slate-900 mb-2 flex items-center">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse mr-2"></span>
                  Live Transcript ({transcripts.length} entries)
                </h4>
                <div className="max-h-32 overflow-y-auto">
                  {transcripts.length === 0 ? (
                    <div className="text-slate-500 text-sm flex items-center">
                      <span className="mr-2">💬</span>
                      Waiting for conversation to begin...
                    </div>
                  ) : (
                    transcripts.map((transcript, index) => (
                      <div
                        key={index}
                        className="text-sm mb-2 p-2 bg-white rounded border"
                      >
                        <span className="font-medium text-blue-600">
                          {transcript.speaker}:
                        </span>
                        <span className="ml-2">{transcript.text}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* AI Suggestions */}
              <div className="mt-4 bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-slate-900 mb-2 flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2"></span>
                  AI Suggestions ({aiSuggestions.length} active)
                </h4>
                <div className="max-h-32 overflow-y-auto">
                  {aiSuggestions.length === 0 ? (
                    <div className="text-slate-500 text-sm flex items-center">
                      <span className="mr-2">🤖</span>
                      AI is listening and will provide suggestions based on the
                      conversation.
                    </div>
                  ) : (
                    aiSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="text-sm mb-2 p-2 bg-white rounded border border-blue-200"
                      >
                        <span className="font-medium text-blue-600">
                          AI Suggestion:
                        </span>
                        <span className="ml-2">{suggestion.text}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

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
          onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
        />
      </Card>
    </div>
  );
};
