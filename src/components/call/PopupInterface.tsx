import React, { useState, useEffect, useRef } from "react";
import { X, Mic, MicOff, StopCircle, RotateCcw } from "lucide-react";
import { useWebSocket } from "../../hooks/useWebSocket";

interface PopupInterfaceProps {
  callId: string;
  userId?: string;
  onClose?: () => void;
}

export const PopupInterface: React.FC<PopupInterfaceProps> = ({
  callId,
  userId = "default-user",
  onClose,
}) => {
  const [isListening, setIsListening] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Use WebSocket hook for real-time data
  const {
    transcript,
    suggestions,
    isConnected,
    joinCall,
    leaveCall,
    requestSuggestion,
    socket,
  } = useWebSocket(callId, userId);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcript, suggestions]);


  // Auto-join the call when component mounts
  useEffect(() => {
    if (isConnected && callId && userId) {
      console.log(`🔌 Auto-joining call ${callId} for user ${userId}`);
      joinCall(callId, userId, "zoom");
    }
  }, [isConnected, callId, userId, joinCall]);

  // Debug: Log transcript and suggestions data
  useEffect(() => {
    console.log("📊 PopupInterface - Current data:", {
      transcriptCount: transcript.length,
      suggestionsCount: suggestions.length,
      isConnected,
      callId,
      userId
    });
    
    if (transcript.length > 0) {
      console.log("📝 Latest transcript:", transcript[transcript.length - 1]);
    }
    
    if (suggestions.length > 0) {
      console.log("🤖 Latest suggestion:", suggestions[suggestions.length - 1]);
    }
  }, [transcript, suggestions, isConnected, callId, userId]);

  const handleClose = () => {
    if (isConnected) {
      leaveCall(callId);
    }
    if (onClose) {
      onClose();
    } else {
      window.close();
    }
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleStopListening = () => {
    setIsListening(!isListening);
    // You can add logic here to actually stop/start listening
  };

  const handleClear = () => {
    // Clear the current conversation
    if (socket) {
      socket.emit("clearConversation", { callId });
    }
  };


  if (isMinimized) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={handleMinimize}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2"
        >
          <Mic className="h-4 w-4" />
          <span>AI Assistant</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-black flex flex-col overflow-hidden">
      <div className="bg-gray-900 w-full h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gray-800 px-6 py-4 flex items-center justify-between border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">AI</span>
            </div>
            <span className="text-white font-semibold">Sales AI Assistant</span>
            <button
              onClick={handleMinimize}
              className="text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700 transition-colors"
            >
              Hide
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleStopListening}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  isListening
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-gray-600 text-white hover:bg-gray-700"
                }`}
              >
                {isListening ? (
                  <>
                    <StopCircle className="h-4 w-4 inline mr-1" />
                    Stop Listening
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 inline mr-1" />
                    Start Listening
                  </>
                )}
              </button>
              <button
                onClick={handleClear}
                className="px-3 py-1 bg-gray-600 text-white rounded text-sm font-medium hover:bg-gray-700 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={handleClose}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Exit
              </button>
            </div>
          </div>
        </div>


        {/* Connection Status */}
        <div className="bg-gray-800 px-6 py-2 border-b border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <span className="flex items-center text-gray-300">
                <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
                {isConnected ? "Connected" : "Disconnected"}
              </span>
              <span className="text-gray-400">
                {transcript.length} Messages • {suggestions.length} AI Insights
              </span>
            </div>
            <span className="text-gray-500 font-mono text-xs">
              Call ID: {callId.slice(0, 8)}...
            </span>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden bg-gray-900">
          {transcript.length === 0 && suggestions.length === 0 ? (
            // Empty State
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
                  <Mic className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Ready to Assist
                </h3>
                <p className="text-gray-400 mb-4">
                  Your AI assistant is listening and will provide real-time insights during the conversation.
                </p>
                <div className="text-sm text-gray-500">
                  Participant messages on left • AI responses on right
                </div>
              </div>
            </div>
          ) : (
            // Messages Container
            <div className="h-full overflow-y-auto p-6">
              <div className="space-y-6">
                {(() => {
                  const allMessages = [
                    ...transcript.map((t) => ({ ...t, type: "transcript" })),
                    ...suggestions.map((s) => ({ ...s, type: "suggestion" })),
                  ].sort((a, b) => {
                    const timeA = new Date(a.timestamp || 0).getTime();
                    const timeB = new Date(b.timestamp || 0).getTime();
                    return timeA - timeB;
                  });

                  return allMessages.map((message, index) => {
                    if (message.type === "transcript") {
                      const transcriptMessage = message as typeof message & { speaker: string };
                      return (
                        <div key={`transcript-${index}`} className="flex justify-start">
                          <div className="flex space-x-4 max-w-2xl">
                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-sm font-semibold">
                                {transcriptMessage.speaker?.charAt(0) || "U"}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="bg-gray-800 rounded-lg px-4 py-3 border border-gray-700">
                                <p className="text-white text-base leading-relaxed">
                                  {transcriptMessage.text}
                                </p>
                              </div>
                              <div className="mt-2 flex items-center space-x-3 text-sm text-gray-400">
                                <span className="font-medium">{transcriptMessage.speaker}</span>
                                <span>•</span>
                                <span>
                                  {new Date(transcriptMessage.timestamp).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      const suggestionMessage = message as typeof message & { reasoning?: string };
                      return (
                        <div key={`suggestion-${index}`} className="flex justify-end">
                          <div className="flex space-x-4 max-w-2xl flex-row-reverse">
                            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-lg">🤖</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg px-4 py-3">
                                <div className="flex items-center space-x-2 mb-2">
                                  <span className="text-yellow-400">⭐</span>
                                  <span className="text-white font-medium text-base">Answer:</span>
                                </div>
                                <p className="text-white text-base leading-relaxed mb-3">
                                  {suggestionMessage.text}
                                </p>
                                {suggestionMessage.reasoning && (
                                  <div className="pt-3 border-t border-blue-400/30">
                                    <p className="text-blue-100 text-sm italic">
                                      💡 {suggestionMessage.reasoning}
                                    </p>
                                  </div>
                                )}
                              </div>
                              <div className="mt-2 flex items-center justify-end text-sm text-gray-400">
                                <span>
                                  AI •{" "}
                                  {new Date(suggestionMessage.timestamp).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  });
                })()}
                <div ref={chatEndRef} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
