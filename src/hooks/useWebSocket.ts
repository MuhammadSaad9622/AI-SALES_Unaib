import { useState, useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";

interface TranscriptEntry {
  id: string;
  speaker: string;
  text: string;
  confidence: number;
  timestamp: Date;
  isFinal?: boolean;
  callId: string;
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
    isConnected: false,
  });

  const connect = useCallback(() => {
    if (!callId || !userId) {
      console.log("❌ Cannot connect: missing callId or userId", {
        callId,
        userId,
      });
      return;
    }

    console.log("🔌 Creating Socket.IO connection...");
    console.log(
      "🌐 Server URL:",
      import.meta.env.VITE_API_URL || "https://ai-sales-unaib.onrender.com"
    );

    const authToken =
      localStorage.getItem("authToken") || "dummy-token-for-development";
    console.log("🔑 Auth token present:", !!authToken);

    const newSocket = io(
      import.meta.env.VITE_API_URL || "https://ai-sales-unaib.onrender.com",
      {
        transports: ["websocket", "polling"],
        auth: {
          token: authToken,
        },
      }
    );

    newSocket.on("connect", () => {
      console.log("✅ WebSocket connected with ID:", newSocket.id);
      setData((prev) => ({ ...prev, isConnected: true }));
    });

    newSocket.on("disconnect", () => {
      console.log("❌ WebSocket disconnected");
      setData((prev) => ({ ...prev, isConnected: false }));
    });

    newSocket.on("connect_error", (error) => {
      console.error("❌ WebSocket connection error:", error);
      setData((prev) => ({ ...prev, isConnected: false }));
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
        isConnected: false,
      });
    }
  }, [socket]);

  const joinCall = useCallback(
    (callId: string, userId: string, platform?: string) => {
      console.log("📞 Attempting to join call:", { callId, userId, platform });
      console.log("🔌 Socket connected:", socket?.connected);

      if (socket && socket.connected) {
        console.log(
          `📞 Joining call ${callId} on platform ${platform || "unknown"}`
        );
        socket.emit("joinCall", {
          callId,
          userId,
          platform: platform || "unknown",
        });
      } else {
        console.log("❌ Socket not connected, cannot join call");
      }
    },
    [socket]
  );

  const leaveCall = useCallback(
    (callId: string) => {
      if (socket && socket.connected) {
        console.log(`📞 Leaving call ${callId}`);
        socket.emit("leaveCall", { callId });
      }
    },
    [socket]
  );

  const markSuggestionUsed = useCallback(
    (suggestionId: string) => {
      if (socket && socket.connected) {
        socket.emit("useSuggestion", {
          suggestionId,
          callId,
          feedback: "used",
        });
      }
    },
    [socket, callId]
  );

  const requestSuggestion = useCallback(async () => {
    console.log("🧪 Requesting AI suggestion via test endpoint...");
    try {
      const response = await fetch("/api/test-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callId,
          message: "Test message for AI response",
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log("✅ Test AI suggestion sent:", result);
      } else {
        console.error("❌ Failed to send test AI suggestion");
      }
    } catch (error) {
      console.error("❌ Error sending test AI suggestion:", error);
    }
  }, [callId]);

  useEffect(() => {
    if (!socket) {
      connect();
      return;
    }

    // Real-time transcript events with deduplication
    socket.on("newTranscript", (transcript: TranscriptEntry) => {
      setData((prev) => {
        // Check for duplicates by text and timestamp to prevent multiple entries
        const isDuplicate = prev.transcript.some(
          (existing) =>
            existing.text === transcript.text &&
            existing.speaker === transcript.speaker &&
            Math.abs(
              new Date(existing.timestamp).getTime() -
                new Date(transcript.timestamp).getTime()
            ) < 5000
        );

        if (isDuplicate) {
          return prev;
        }

        return {
          ...prev,
          transcript: [...prev.transcript.slice(-50), transcript],
        };
      });
    });

    // AI suggestion events
    socket.on("newSuggestion", (suggestion: AISuggestion) => {
      setData((prev) => {
        // Check for duplicates based on text and timestamp
        const isDuplicate = prev.suggestions.some(existing => 
          existing.text === suggestion.text && 
          Math.abs(new Date(existing.timestamp).getTime() - new Date(suggestion.timestamp).getTime()) < 1000
        );
        
        if (isDuplicate) {
          return prev;
        }
        
        const newSuggestions = [...prev.suggestions.slice(-10), suggestion];
        return {
          ...prev,
          suggestions: newSuggestions,
        };
      });
    });

    // Suggestion usage events
    socket.on(
      "suggestionUsed",
      ({ suggestionId }: { suggestionId: string }) => {
        setData((prev) => ({
          ...prev,
          suggestions: prev.suggestions.map((s) =>
            s.id === suggestionId ? { ...s, used: true } : s
          ),
        }));
      }
    );

    // Meeting events
    socket.on("meetingStarted", ({ meetingId }: { meetingId: string }) => {
      console.log("🎬 Meeting started:", meetingId);
    });

    socket.on("meetingEnded", ({ meetingId }: { meetingId: string }) => {
      console.log("🏁 Meeting ended:", meetingId);
    });

    socket.on(
      "participantJoined",
      ({ participant }: { participant: unknown }) => {
        console.log("👤 Participant joined:", participant);
      }
    );

    socket.on(
      "participantLeft",
      ({ participant }: { participant: unknown }) => {
        console.log("👋 Participant left:", participant);
      }
    );

    // Call events
    socket.on(
      "callJoined",
      ({ callId, platform }: { callId: string; platform: string }) => {
        console.log(`✅ Successfully joined call ${callId} on ${platform}`);
      }
    );

    socket.on("callLeft", ({ callId }: { callId: string }) => {
      console.log(`👋 Successfully left call ${callId}`);
    });

    // Error events
    socket.on("transcriptionError", ({ error }: { error: string }) => {
      console.error("❌ Transcription error:", error);
    });

    socket.on("suggestionError", ({ error }: { error: string }) => {
      console.error("❌ AI suggestion error:", error);
    });

    socket.on("error", ({ message }: { message: string }) => {
      console.error("❌ Socket error:", message);
    });

    // Cleanup event listeners
    return () => {
      socket.off("newTranscript");
      socket.off("newSuggestion");
      socket.off("suggestionUsed");
      socket.off("meetingStarted");
      socket.off("meetingEnded");
      socket.off("participantJoined");
      socket.off("participantLeft");
      socket.off("callJoined");
      socket.off("callLeft");
      socket.off("transcriptionError");
      socket.off("suggestionError");
      socket.off("error");
    };
  }, [socket, connect]);

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
        socket.emit("audioData", { audioData });
      }
    },
  };
};
