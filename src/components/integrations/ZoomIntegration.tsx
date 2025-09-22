import React, { useEffect, useState, useCallback } from "react";
import {
  Video,
  Settings,
  Users,
  Mic,
  MicOff,
  Share,
  Clock,
} from "lucide-react";
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
    sendDurationUpdate,
    sendMeetingStart,
    sendMeetingEnd,
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

        // Create call record ONLY when meeting is successfully created
        try {
          const callResponse = await APIService.createCall({
            title: `AI Sales Call - ${new Date().toLocaleString()}`,
            meetingId: response.data.meeting.meetingId,
            platform: "zoom",
            status: "scheduled",
            startTime: new Date().toISOString(),
          });

          console.log("✅ Call record created:", callResponse);

          // Check the response structure and extract ID properly
          if (
            callResponse.success &&
            callResponse.data &&
            callResponse.data._id
          ) {
            localStorage.setItem(
              "currentDatabaseCallId",
              callResponse.data._id
            );
            localStorage.setItem(
              "currentMeetingId",
              response.data.meeting.meetingId
            );
            console.log("✅ Stored call ID:", callResponse.data._id);
          } else {
            console.error("❌ Invalid call response structure:", callResponse);
            throw new Error("Invalid response from call creation");
          }
        } catch (callError) {
          console.error("Failed to create call record:", callError);
          setError("Failed to initialize call session. Please try again.");
          return;
        }

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

      // Open the AI popup in a separate window (half screen)
      const popupUrl = `/popup/${callId}`;
      const popupWindow = window.open(
        popupUrl,
        "ai-assistant",
        `width=${Math.floor(screen.width / 2)},height=${
          screen.height
        },scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no,left=${Math.floor(
          screen.width / 2
        )},top=0`
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
        `width=${Math.floor(screen.width / 2)},height=${
          screen.height
        },scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no,left=${Math.floor(
          screen.width / 2
        )},top=0`
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

  // NEW: Meeting duration tracking state
  const [meetingStartTime, setMeetingStartTime] = useState<Date | null>(null);
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(
    null
  );
  const [isTimerActive, setIsTimerActive] = useState(false);

  // NEW: Meeting duration utility functions
  const formatDuration = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // NEW: Start meeting duration timer (fixed to use correct call ID)
  const startMeetingTimer = useCallback(async () => {
    const startTime = new Date();
    setMeetingStartTime(startTime);
    setIsTimerActive(true);
    setMeetingDuration(0);

    // Store start time in localStorage for persistence
    localStorage.setItem(`meeting_${callId}_start`, startTime.toISOString());
    localStorage.setItem(`meeting_${callId}_active`, "true");

    // Get the database call ID that was created when we created the meeting
    const databaseCallId = localStorage.getItem("currentDatabaseCallId");

    console.log("📝 Starting timer for call ID:", databaseCallId || callId);

    // Update existing call status to active (don't create new)
    try {
      const callIdToUpdate = databaseCallId || callId;
      await APIService.updateCall(callIdToUpdate, {
        status: "active",
        startTime: startTime.toISOString(),
      });
      console.log("✅ Call status updated to active for:", callIdToUpdate);
    } catch (error) {
      console.warn("⚠️ Failed to update call status:", error.message);
    }

    // Send meeting start via WebSocket
    if (wsConnected && sendMeetingStart) {
      try {
        sendMeetingStart(startTime.toISOString());
      } catch (error) {
        console.error("Failed to send meeting start via WebSocket:", error);
      }
    }

    // Start the timer (only update duration, don't create records)
    const interval = setInterval(async () => {
      const now = new Date();
      const duration = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setMeetingDuration(duration);

      // Update localStorage every 10 seconds
      if (duration % 10 === 0) {
        localStorage.setItem(`meeting_${callId}_duration`, duration.toString());
      }

      // Sync with database every 30 seconds (update existing call only)
      if (duration % 30 === 0) {
        try {
          const callIdToUpdate = databaseCallId || callId;
          await APIService.updateCall(callIdToUpdate, {
            duration: duration,
          });
          console.log(
            `✅ Duration synced: ${duration}s for call:`,
            callIdToUpdate
          );
        } catch (error) {
          console.warn(
            "⚠️ Failed to sync duration to database:",
            error.message
          );
        }
      }

      // Send duration update via WebSocket every 30 seconds
      if (duration % 30 === 0 && wsConnected && sendDurationUpdate) {
        try {
          sendDurationUpdate(duration);
        } catch (error) {
          console.error("Failed to send duration update via WebSocket:", error);
        }
      }
    }, 1000);

    setTimerInterval(interval);
    console.log(
      "✅ Meeting duration timer started for call:",
      databaseCallId || callId
    );
  }, [callId, wsConnected, sendMeetingStart, sendDurationUpdate]);

  // NEW: Stop meeting duration timer (fixed to use correct call ID)
  const stopMeetingTimer = useCallback(async () => {
    if (!meetingStartTime || !isTimerActive) return;

    const endTime = new Date();
    const finalDuration = Math.floor(
      (endTime.getTime() - meetingStartTime.getTime()) / 1000
    );

    // Clear timer
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }

    setIsTimerActive(false);
    setMeetingDuration(finalDuration);

    // Clean up localStorage
    localStorage.removeItem(`meeting_${callId}_start`);
    localStorage.removeItem(`meeting_${callId}_duration`);
    localStorage.removeItem(`meeting_${callId}_active`);

    // Get the database call ID
    const databaseCallId = localStorage.getItem("currentDatabaseCallId");
    const callIdToUpdate = databaseCallId || callId;

    console.log(
      `📝 Stopping timer for call: ${callIdToUpdate}, duration: ${finalDuration}s`
    );

    // Update existing call with final duration and completed status
    try {
      await APIService.updateCall(callIdToUpdate, {
        duration: finalDuration,
        endTime: endTime.toISOString(),
        status: "completed",
      });

      console.log(
        `✅ Call completed with duration: ${finalDuration} seconds for call: ${callIdToUpdate}`
      );
    } catch (error) {
      console.warn("⚠️ Failed to update final call duration:", error.message);
    }

    // Send via WebSocket if available
    if (wsConnected && sendMeetingEnd) {
      try {
        sendMeetingEnd(endTime.toISOString(), finalDuration);
      } catch (error) {
        console.error("Failed to send duration via WebSocket:", error);
      }
    }
  }, [
    meetingStartTime,
    timerInterval,
    isTimerActive,
    callId,
    wsConnected,
    sendMeetingEnd,
  ]);

  // NEW: Recovery mechanism for page refresh
  useEffect(() => {
    const storedStart = localStorage.getItem(`meeting_${callId}_start`);
    const storedActive = localStorage.getItem(`meeting_${callId}_active`);
    const storedDuration = localStorage.getItem(`meeting_${callId}_duration`);

    if (storedStart && storedActive === "true" && !isTimerActive) {
      const startTime = new Date(storedStart);
      const now = new Date();
      const recoveredDuration = Math.floor(
        (now.getTime() - startTime.getTime()) / 1000
      );

      setMeetingStartTime(startTime);
      setMeetingDuration(recoveredDuration);
      setIsTimerActive(true);

      // Resume timer
      const interval = setInterval(() => {
        const currentTime = new Date();
        const duration = Math.floor(
          (currentTime.getTime() - startTime.getTime()) / 1000
        );
        setMeetingDuration(duration);

        if (duration % 10 === 0) {
          localStorage.setItem(
            `meeting_${callId}_duration`,
            duration.toString()
          );
        }

        if (duration % 30 === 0 && wsConnected) {
          try {
            const durationUpdateEvent = {
              type: "duration_update",
              data: {
                callId: callId,
                duration: duration,
                timestamp: new Date().toISOString(),
              },
            };
            sendAudioData(JSON.stringify(durationUpdateEvent));
          } catch (error) {
            console.error("Failed to sync duration after recovery:", error);
          }
        }
      }, 1000);

      setTimerInterval(interval);
      console.log("✅ Meeting timer recovered after page refresh");
    }
  }, [callId, isTimerActive, wsConnected, sendAudioData]);

  // NEW: Handle page unload with beacon API for reliable duration saving
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (isTimerActive && meetingStartTime) {
        const finalDuration = Math.floor(
          (new Date().getTime() - meetingStartTime.getTime()) / 1000
        );

        const durationData = {
          callId: callId,
          duration: finalDuration,
          endTime: new Date().toISOString(),
          platform: "zoom",
          source: "page_unload",
        };

        // Use navigator.sendBeacon for reliable data sending on page unload
        if (navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify(durationData)], {
            type: "application/json",
          });
          navigator.sendBeacon(
            `${
              import.meta.env.VITE_API_URL || "http://localhost:3002"
            }/api/meetings/duration`,
            blob
          );
        }

        // Fallback: try regular fetch with keepalive
        try {
          await fetch(
            `${
              import.meta.env.VITE_API_URL || "http://localhost:3002"
            }/api/meetings/duration`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("authToken")}`,
              },
              body: JSON.stringify(durationData),
              keepalive: true,
            }
          );
        } catch (error) {
          console.error("Failed to save duration on page unload:", error);
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isTimerActive, meetingStartTime, callId]);

  // NEW: Enhanced joinMeetingAsHost with better call tracking
  const joinMeetingAsHostWithTimer = useCallback(
    async (meetingNumber: string, password: string) => {
      try {
        // Get the database call ID that should already exist
        const databaseCallId = localStorage.getItem("currentDatabaseCallId");
        const meetingId = localStorage.getItem("currentMeetingId");

        console.log("📝 Starting meeting with:", {
          databaseCallId,
          meetingId,
          meetingNumber,
        });

        if (!databaseCallId) {
          console.error("❌ No database call ID found");
          setError("Call initialization failed. Please create a new meeting.");
          return;
        }

        // Verify the call exists and update it
        try {
          await APIService.updateCall(databaseCallId, {
            status: "active",
            startTime: new Date().toISOString(),
          });
          console.log("✅ Call status updated to active");
        } catch (error) {
          console.error("Failed to update call status:", error);
          setError("Failed to initialize call session. Please try again.");
          return;
        }

        // Start the timer
        await startMeetingTimer();

        // Call existing function
        await joinMeetingAsHost(meetingNumber, password);
      } catch (error) {
        console.error("Failed to start meeting:", error);
        // If meeting fails to start, stop the timer
        if (isTimerActive) {
          stopMeetingTimer();
        }
        setError("Failed to start meeting. Please try again.");
      }
    },
    [startMeetingTimer, joinMeetingAsHost, stopMeetingTimer, isTimerActive]
  );

  // NEW: Enhanced leaveMeeting with timer integration and state reset (Fixed)
  const leaveMeetingWithTimer = useCallback(async () => {
    console.log("🏁 Leave meeting called - Timer active:", isTimerActive);

    // Stop timer and save final duration BEFORE doing anything else
    if (isTimerActive && meetingStartTime) {
      console.log("🏁 Stopping timer and saving duration...");

      const endTime = new Date();
      const finalDuration = Math.floor(
        (endTime.getTime() - meetingStartTime.getTime()) / 1000
      );

      // Clear timer immediately
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }

      setIsTimerActive(false);
      setMeetingDuration(finalDuration);

      // Get the database call ID
      const databaseCallId = localStorage.getItem("currentDatabaseCallId");
      const callIdToUpdate = databaseCallId || callId;

      console.log(
        `🏁 Saving final duration: ${finalDuration}s for call: ${callIdToUpdate}`
      );

      // Update existing call with final duration and completed status - use AWAIT
      try {
        await APIService.updateCall(callIdToUpdate, {
          duration: finalDuration,
          endTime: endTime.toISOString(),
          status: "completed",
        });

        console.log(
          `✅ Call completed with duration: ${finalDuration} seconds`
        );

        setToast({
          message: `Meeting completed - Duration: ${Math.floor(
            finalDuration / 60
          )}m ${finalDuration % 60}s`,
          type: "success",
          isVisible: true,
        });
      } catch (error) {
        console.warn("⚠️ Failed to update final call duration:", error.message);

        // Try WebSocket as fallback
        if (wsConnected && sendMeetingEnd) {
          try {
            sendMeetingEnd(endTime.toISOString(), finalDuration);
            console.log("✅ Duration sent via WebSocket as fallback");
          } catch (wsError) {
            console.error("Failed to send duration via WebSocket:", wsError);
          }
        }
      }

      // Clean up localStorage
      localStorage.removeItem(`meeting_${callId}_start`);
      localStorage.removeItem(`meeting_${callId}_duration`);
      localStorage.removeItem(`meeting_${callId}_active`);
    }

    // Clean up local storage for database call ID
    localStorage.removeItem("currentDatabaseCallId");

    // Now handle the Zoom SDK cleanup
    if (window.ZoomMtg) {
      window.ZoomMtg.leaveMeeting({
        success: () => {
          console.log("✅ Zoom SDK leave meeting successful");
          handleMeetingEndCleanup();
        },
        error: () => {
          console.log(
            "⚠️ Zoom SDK leave meeting failed, but continuing cleanup"
          );
          handleMeetingEndCleanup();
        },
      });
    } else {
      console.log("⚠️ Zoom SDK not available, doing direct cleanup");
      handleMeetingEndCleanup();
    }

    // Cleanup function to reset UI state
    function handleMeetingEndCleanup() {
      // Reset all meeting-related state to go back to create meeting view
      setIsMeetingActive(false);
      setMeetingData(null);
      setMeetingNumber("");
      setTranscripts([]);
      setAiSuggestions([]);
      setParticipants([]);
      setError(null);

      // Reset audio/video states
      setIsVideoOn(true);
      setIsAudioOn(true);
      setIsScreenSharing(false);

      // Stop audio recording if active
      if (isAudioRecording) {
        stopAudioRecording();
      }

      // Leave WebSocket call
      if (wsConnected) {
        leaveCall(callId);
      }

      // Show completion message
      if (!toast.isVisible) {
        setToast({
          message:
            "Left meeting successfully. You can now create a new meeting.",
          type: "success",
          isVisible: true,
        });
      }

      if (onMeetingEnd) {
        onMeetingEnd();
      }
    }
  }, [
    isTimerActive,
    meetingStartTime,
    timerInterval,
    callId,
    wsConnected,
    sendMeetingEnd,
    isAudioRecording,
    stopAudioRecording,
    leaveCall,
    onMeetingEnd,
    toast.isVisible,
  ]);

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
                        joinMeetingAsHostWithTimer(
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse mr-3" />
                    <span className="text-emerald-800 font-medium">
                      Meeting Active
                    </span>
                  </div>
                  {/* NEW: Live duration display */}
                  {isTimerActive && (
                    <div className="flex items-center bg-white px-3 py-1 rounded-full border border-emerald-200">
                      <Clock className="h-4 w-4 text-emerald-600 mr-2" />
                      <span className="font-mono text-emerald-700 font-semibold">
                        {formatDuration(meetingDuration)}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-emerald-700 text-sm mt-1">
                  AI assistance is monitoring your call and providing real-time
                  suggestions.
                  {isTimerActive &&
                    ` Duration: ${formatDuration(meetingDuration)}`}
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
                  onClick={leaveMeetingWithTimer}
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
