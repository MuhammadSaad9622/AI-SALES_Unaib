import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CallInterface } from "../components/call/CallInterface";
import { useAuth } from "../contexts/AuthContext";
import { APIService } from "../lib/api";

export const CallPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [callId, setCallId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeCall = async () => {
      try {
        setIsLoading(true);

        if (id) {
          // If we have a call ID from URL, use it
          setCallId(id);
          // Store in cookie
          document.cookie = `xczhfba=${id}; path=/; max-age=3600`;
        } else {
          // Create a new call session
          const response = await APIService.createCall({
            title: `AI Sales Call - ${new Date().toLocaleString()}`,
            description:
              "AI-assisted sales call with real-time transcription and suggestions",
            platform: "zoom", // Default to Zoom
            startTime: new Date().toISOString(),
          });

          if (response.success) {
            setCallId(response.data.call._id);
            // Store in cookie
            document.cookie = `xczhfba=${id}; path=/; max-age=3600`;
            // Update URL with the new call ID
            navigate(`/call/${response.data.call._id}`, { replace: true });
          } else {
            setError("Failed to create call session");
          }
        }
      } catch (err) {
        console.error("Error initializing call:", err);
        setError("Failed to initialize call session");
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      initializeCall();
    }
  }, [id, user, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing AI Sales Call...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Call Initialization Failed
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!callId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up call session...</p>
        </div>
      </div>
    );
  }

  return <CallInterface callId={callId} />;
};
