import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PopupInterface } from "../components/call/PopupInterface";

export const PopupPage: React.FC = () => {
  const { callId } = useParams<{ callId: string }>();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    // Get userId from localStorage or generate one
    const storedUserId = localStorage.getItem("userId");
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      const newUserId = `user-${Date.now()}`;
      localStorage.setItem("userId", newUserId);
      setUserId(newUserId);
    }
  }, []);

  const handleClose = () => {
    // Close the popup window
    window.close();
  };

  if (!callId || !userId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Loading AI Assistant...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <PopupInterface
        callId={callId}
        userId={userId}
        onClose={handleClose}
      />
    </div>
  );
};
