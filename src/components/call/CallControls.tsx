import React from 'react';
import { motion } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  Settings,
  Volume2,
  MoreHorizontal
} from 'lucide-react';
import { Card } from '../ui/Card';

interface CallControlsProps {
  isMuted: boolean;
  isVideoOff: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
  compact?: boolean;
}

export const CallControls: React.FC<CallControlsProps> = ({
  isMuted,
  isVideoOff,
  onToggleMute,
  onToggleVideo,
  onEndCall,
  compact = false
}) => {
  const controls = [
    {
      icon: isMuted ? MicOff : Mic,
      active: !isMuted,
      onClick: onToggleMute,
      color: isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
      label: isMuted ? 'Unmute' : 'Mute'
    },
    {
      icon: isVideoOff ? VideoOff : Video,
      active: !isVideoOff,
      onClick: onToggleVideo,
      color: isVideoOff ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
      label: isVideoOff ? 'Start Video' : 'Stop Video'
    },
    {
      icon: Volume2,
      active: true,
      onClick: () => {},
      color: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
      label: 'Audio Settings'
    },
    {
      icon: Settings,
      active: true,
      onClick: () => {},
      color: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
      label: 'Settings'
    }
  ];

  if (compact) {
    return (
      <div className="flex items-center justify-center space-x-2">
        <button
          onClick={onToggleMute}
          className={`
            p-2 rounded-lg transition-all duration-200
            ${isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
          `}
        >
          {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
        <button
          onClick={onToggleVideo}
          className={`
            p-2 rounded-lg transition-all duration-200
            ${isVideoOff ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
          `}
        >
          {isVideoOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
        </button>
        <button
          onClick={onEndCall}
          className="p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
        >
          <PhoneOff className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-center space-x-4">
        {controls.map((control, index) => (
          <motion.button
            key={index}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={control.onClick}
            className={`
              p-4 rounded-xl transition-all duration-200
              ${control.color}
            `}
            title={control.label}
          >
            <control.icon className="h-6 w-6" />
          </motion.button>
        ))}
        
        {/* End Call Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onEndCall}
          className="p-4 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors"
          title="End Call"
        >
          <PhoneOff className="h-6 w-6" />
        </motion.button>
      </div>
    </Card>
  );
};