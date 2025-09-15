import React, { useState, useEffect, useRef } from "react";
import { Video, MessageSquare, Brain } from "lucide-react";

import { ZoomIntegration } from "../integrations/ZoomIntegration";
import { useWebSocket } from "../../hooks/useWebSocket";

interface TranscriptEntry {
  id: string;
  speaker?: string;
  text: string;
  timestamp?: Date | number;
  confidence?: number;
  isFinal?: boolean;
}

interface Suggestion {
  id: string;
  text: string;
  timestamp?: Date | number;
  used?: boolean;
}

interface CallInterfaceProps {
  callId: string;
  userId?: string;
}

export const CallInterface: React.FC<CallInterfaceProps> = ({
  callId,
  userId = "default-user",
}) => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "video" | "transcript" | "suggestions"
  >("video");

  // Ref for auto-scrolling suggestions
  const suggestionsEndRef = useRef<HTMLDivElement>(null);

  // Use WebSocket hook for real-time data
  const {
    transcript,
    suggestions,
    isConnected,
    joinCall,
    leaveCall,
    requestSuggestion,
  } = useWebSocket(callId, userId);

  // Auto-scroll to bottom when new suggestions are added
  useEffect(() => {
    if (suggestionsEndRef.current && suggestions.length > 0) {
      suggestionsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [suggestions.length]);

  // Auto-generate suggestions every 60 seconds
  useEffect(() => {
    if (!isConnected || transcript.length === 0) return;

    const interval = setInterval(() => {
      requestSuggestion();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [isConnected, transcript.length, requestSuggestion]);

  // Auto-join the call when component mounts and WebSocket is connected
  useEffect(() => {
    if (isConnected && callId && userId) {
      console.log(`🔌 Auto-joining call ${callId} for user ${userId}`);
      joinCall(callId, userId, "zoom");
    }
  }, [isConnected, callId, userId, joinCall]);

  const handleMeetingStart = (data: unknown) => {
    setIsCallActive(true);
    console.log("Meeting started:", data);

    // Join the call when meeting starts
    if (isConnected) {
      joinCall(callId, userId, "zoom");
    }
  };

  const handleMeetingEnd = () => {
    setIsCallActive(false);
    console.log("Meeting ended");

    // Leave the call when meeting ends
    if (isConnected) {
      leaveCall(callId);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div
              className={`w-3 h-3 rounded-full mr-3 ${
                isCallActive
                  ? "bg-emerald-500 shadow-lg shadow-emerald-200 animate-pulse"
                  : "bg-slate-300"
              }`}
            />
            <h1 className="text-xl font-bold text-slate-800 bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text">
              AI Sales Assistant
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                isConnected
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                  : "bg-red-100 text-red-700 border border-red-200"
              }`}
            >
              {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
            </div>
            <span className="text-sm text-slate-600 font-mono bg-slate-100 px-3 py-1 rounded-lg">
              {callId.slice(0, 8)}...
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0 max-h-full">
        {/* Left Panel - Video/Meeting Area */}
        <div className="flex-1 flex flex-col min-h-0 max-h-full">
          {/* Video Area */}
          <div className="flex-1 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative video-area min-h-0 max-h-full overflow-hidden">
            {isCallActive ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-white text-center">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/20">
                    <Video className="h-10 w-10" />
                  </div>
                  <p className="text-2xl font-bold mb-2">Call Active</p>
                  <p className="text-slate-300">Zoom integration running</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-slate-400 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 bg-slate-700 rounded-2xl flex items-center justify-center">
                    <Video className="h-10 w-10" />
                  </div>
                  <p className="text-2xl font-semibold mb-2 text-slate-300">
                    Waiting for call
                  </p>
                  <p className="text-slate-400">
                    Start a Zoom meeting to begin
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Zoom Integration */}
          <div className="bg-white border-t border-slate-200 p-6 flex-shrink-0">
            <ZoomIntegration
              callId={callId}
              onMeetingStart={handleMeetingStart}
              onMeetingEnd={handleMeetingEnd}
            />
          </div>
        </div>

        {/* Right Panel - AI Features */}
      
      </div>
    </div>
  );
};
