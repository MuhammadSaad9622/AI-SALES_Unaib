import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, User } from "lucide-react";
import { TranscriptEntry } from "../../types";
import { Card } from "../ui/Card";
import { formatDistanceToNow } from "date-fns";

interface TranscriptDisplayProps {
  transcript: TranscriptEntry[];
}

export const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({
  transcript,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <Card className="h-80">
      <div className="flex items-center mb-4">
        <MessageCircle className="h-5 w-5 text-primary-600 mr-2" />
        <h3 className="font-semibold text-gray-900">Live Transcript</h3>
        <span className="ml-auto text-xs text-gray-500">
          {transcript.length} entries
        </span>
      </div>

      <div ref={scrollRef} className="space-y-3 overflow-y-auto h-64 pr-2">
        <AnimatePresence>
          {transcript.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex space-x-3"
            >
              <div
                className={`
                flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                ${
                  entry.speaker === "You"
                    ? "bg-primary-100 text-primary-600"
                    : "bg-gray-100 text-gray-600"
                }
              `}
              >
                <User className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span
                    className={`
                    text-sm font-medium
                    ${
                      entry.speaker === "You"
                        ? "text-primary-600"
                        : "text-gray-900"
                    }
                  `}
                  >
                    {entry.speaker}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
                  </span>
                  <div
                    className={`
                    text-xs px-1.5 py-0.5 rounded
                    ${
                      entry.confidence > 0.9
                        ? "bg-green-100 text-green-600"
                        : entry.confidence > 0.7
                        ? "bg-yellow-100 text-yellow-600"
                        : "bg-red-100 text-red-600"
                    }
                  `}
                  >
                    {Math.round(entry.confidence * 100)}%
                  </div>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {entry.text}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {transcript.length === 0 && (
          <div className="text-center py-8">
            <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              Waiting for conversation to begin...
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};
