import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CallInterface } from "../components/call/CallInterface";

interface CallPageProps {}

export const CallPage: React.FC<CallPageProps> = () => {
  const { callId } = useParams<{ callId: string }>();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Don't create any calls automatically - just initialize the page
    const initializePage = () => {
      console.log("✅ Call page initialized for callId:", callId);

      // Clear any previous call session data to prevent conflicts
      localStorage.removeItem("currentDatabaseCallId");
      localStorage.removeItem("currentMeetingId");

      setIsInitialized(true);
    };

    if (callId) {
      initializePage();
    } else {
      // Generate a simple call ID if none provided
      const generatedCallId = `call_${Date.now()}`;
      console.log("📝 Generated call ID:", generatedCallId);
      setIsInitialized(true);
    }
  }, [callId]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading call interface...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CallInterface
        callId={callId || `call_${Date.now()}`}
        userId={localStorage.getItem("userId") || undefined}
      />
    </div>
  );
};
export default CallPage;
