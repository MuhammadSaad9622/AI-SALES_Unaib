import rtms from "@zoom/rtms";
import { v4 as uuidv4 } from "uuid";

class ZoomRTMSService {
  constructor() {
    this.transcriptHandlers = [];
    this.activeTranscriptions = new Map();
    this.initializeRTMS();
  }

  initializeRTMS() {
    rtms.onWebhookEvent(({ payload }) => {
      console.log("📡 RTMS Webhook received:", payload.event);
      this.startRTMSTranscription(payload);
    });

    console.log("✅ Zoom RTMS service initialized");
  }

  async startRTMSTranscription(payload) {
    try {
      console.log("🎤 Starting RTMS transcription");

      rtms.onTranscriptData((data, size, timestamps, metadata) => {
        // Convert Buffer to string if needed
        const textData = Buffer.isBuffer(data) ? data.toString("utf8") : data;

        const transcriptData = {
          id: uuidv4(),
          text: textData,
          speaker: metadata.userName || "Unknown",
          speakerId: metadata.userId || metadata.userName,
          confidence: metadata.confidence || 0.9,
          timestamp: new Date(),
          startTime: timestamps?.start || Date.now(),
          endTime: timestamps?.end || Date.now(),
          isHost: metadata.isHost || false,
          isFinal: true,
          words: [],
          metadata,
          meetingId: payload.object?.id || payload.object?.uuid,
        };

        // Send to all registered handlers
        this.transcriptHandlers.forEach((handler) => {
          try {
            handler(transcriptData);
          } catch (error) {
            console.error("❌ Error in RTMS transcript handler:", error);
          }
        });
      });

      await rtms.join(payload);

      const meetingId = payload.object?.id || payload.object?.uuid;
      this.activeTranscriptions.set(meetingId, {
        payload,
        startTime: new Date(),
      });

      console.log("✅ RTMS transcription started for meeting:", meetingId);
    } catch (error) {
      console.error("❌ Failed to start RTMS transcription:", error);
    }
  }

  async stopRTMSTranscription(meetingId) {
    try {
      if (this.activeTranscriptions.has(meetingId)) {
        await rtms.leave();
        this.activeTranscriptions.delete(meetingId);
        console.log(`⏹️ RTMS transcription stopped for meeting: ${meetingId}`);
      }
    } catch (error) {
      console.error("❌ Failed to stop RTMS transcription:", error);
    }
  }

  onTranscript(handler) {
    // Clear existing handlers to prevent duplicates
    this.transcriptHandlers = [];
    this.transcriptHandlers.push(handler);
  }

  getActiveTranscriptions() {
    return Array.from(this.activeTranscriptions.keys());
  }

  isTranscribing(meetingId) {
    return this.activeTranscriptions.has(meetingId);
  }
}

export default new ZoomRTMSService();
