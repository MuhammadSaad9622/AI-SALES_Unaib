import { useState, useEffect, useRef, useCallback } from 'react';

interface AudioCaptureState {
  isRecording: boolean;
  isSupported: boolean;
  error: string | null;
}

export const useAudioCapture = (onAudioData?: (audioData: string) => void) => {
  const [state, setState] = useState<AudioCaptureState>({
    isRecording: false,
    isSupported: false,
    error: null
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Check if audio capture is supported
  useEffect(() => {
    const checkSupport = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setState(prev => ({ ...prev, isSupported: false, error: 'Audio capture not supported' }));
          return;
        }

        // Test microphone access
        const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        testStream.getTracks().forEach(track => track.stop());
        
        setState(prev => ({ ...prev, isSupported: true }));
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          isSupported: false, 
          error: 'Microphone access denied' 
        }));
      }
    };

    checkSupport();
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1
        }
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          
          // Convert to base64 and send to callback
          if (onAudioData) {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64Data = (reader.result as string).split(',')[1];
              onAudioData(base64Data);
            };
            reader.readAsDataURL(event.data);
          }
        }
      };

      mediaRecorder.onstart = () => {
        setState(prev => ({ ...prev, isRecording: true }));
        console.log('🎤 Audio recording started');
      };

      mediaRecorder.onstop = () => {
        setState(prev => ({ ...prev, isRecording: false }));
        console.log('🎤 Audio recording stopped');
      };

      mediaRecorder.onerror = (event) => {
        setState(prev => ({ 
          ...prev, 
          isRecording: false, 
          error: 'Recording error occurred' 
        }));
        console.error('MediaRecorder error:', event);
      };

      // Start recording with 1-second timeslices for real-time processing
      mediaRecorder.start(1000);

    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isRecording: false, 
        error: 'Failed to start recording' 
      }));
      console.error('Failed to start audio recording:', error);
    }
  }, [onAudioData]);

  // Stop recording
  const stopRecording = useCallback(() => {
    try {
      if (mediaRecorderRef.current && state.isRecording) {
        mediaRecorderRef.current.stop();
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  }, [state.isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return {
    ...state,
    startRecording,
    stopRecording
  };
}; 