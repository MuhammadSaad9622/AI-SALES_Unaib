const OpenAI = require('openai');
const config = require('../config/config.js');

class TranscriptionService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.OPENAI_API_KEY
    });
  }

  async transcribeAudio(audioBuffer, options = {}) {
    try {
      // Convert audio buffer to base64 for GPT-4o-transcribe
      const audioData = audioBuffer.toString('base64');
      
      const transcription = await this.openai.audio.transcriptions.create({
        file: Buffer.from(audioData, 'base64'),
        model: "gpt-4o-transcribe",
        language: options.language || 'en',
        response_format: "verbose_json",
        timestamp_granularities: ["word"],
        ...options
      });

      return {
        success: true,
        text: transcription.text,
        language: transcription.language,
        duration: transcription.duration,
        segments: transcription.segments,
        confidence: this.calculateConfidence(transcription.segments)
      };
    } catch (error) {
      console.error('GPT-4o-transcribe error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async transcribeStream(audioStream, options = {}) {
    try {
      const transcription = await this.openai.audio.transcriptions.create({
        file: audioStream,
        model: "gpt-4o-transcribe",
        language: options.language || 'en',
        response_format: "verbose_json",
        timestamp_granularities: ["word"],
        ...options
      });

      return {
        success: true,
        text: transcription.text,
        language: transcription.language,
        duration: transcription.duration,
        segments: transcription.segments,
        confidence: this.calculateConfidence(transcription.segments)
      };
    } catch (error) {
      console.error('GPT-4o-transcribe stream error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  calculateConfidence(segments) {
    if (!segments || segments.length === 0) return 0;
    
    const totalConfidence = segments.reduce((sum, segment) => {
      return sum + (segment.avg_logprob || 0);
    }, 0);
    
    return Math.exp(totalConfidence / segments.length);
  }

  async detectLanguage(audioBuffer) {
    try {
      const audioData = audioBuffer.toString('base64');
      
      const transcription = await this.openai.audio.transcriptions.create({
        file: Buffer.from(audioData, 'base64'),
        model: "gpt-4o-transcribe",
        response_format: "verbose_json"
      });

      return {
        success: true,
        language: transcription.language,
        confidence: transcription.language_probability || 0
      };
    } catch (error) {
      console.error('GPT-4o-transcribe language detection error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async transcribeWithSpeakerDiarization(audioBuffer, speakers = 2) {
    try {
      // This would require additional processing for speaker diarization
      // For now, we'll use a simplified approach
      const transcription = await this.transcribeAudio(audioBuffer);
      
      if (transcription.success) {
        // Simple speaker assignment based on silence gaps
        const segments = this.assignSpeakers(transcription.segments, speakers);
        
        return {
          ...transcription,
          segments,
          speakers: speakers
        };
      }
      
      return transcription;
    } catch (error) {
      console.error('GPT-4o-transcribe speaker diarization error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  assignSpeakers(segments, speakerCount) {
    if (!segments || segments.length === 0) return segments;
    
    let currentSpeaker = 0;
    const silenceThreshold = 1.0; // seconds
    
    return segments.map((segment, index) => {
      // Check for silence gap between segments
      if (index > 0) {
        const gap = segment.start - segments[index - 1].end;
        if (gap > silenceThreshold) {
          currentSpeaker = (currentSpeaker + 1) % speakerCount;
        }
      }
      
      return {
        ...segment,
        speaker: `Speaker ${currentSpeaker + 1}`
      };
    });
  }

  async processRealTimeAudio(audioChunks, callId) {
    try {
      // Combine audio chunks into a single buffer
      const audioBuffer = Buffer.concat(audioChunks);
      
      // Transcribe the audio
      const result = await this.transcribeAudio(audioBuffer, {
        language: 'en',
        prompt: 'This is a sales conversation. Focus on business terminology and sales context.'
      });
      
      if (result.success) {
        // Store in database
        const Transcript = (await import('../models/Transcript.js')).default;
        await Transcript.create({
          call: callId,
          speaker: 'Unknown', // Will be updated by diarization
          text: result.text,
          confidence: result.confidence,
          timestamp: new Date(),
          language: result.language,
          duration: result.duration
        });
        
        return result;
      }
      
      return result;
    } catch (error) {
      console.error('GPT-4o-transcribe real-time processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new TranscriptionService(); 