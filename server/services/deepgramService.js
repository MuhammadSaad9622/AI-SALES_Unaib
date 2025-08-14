import pkg from '@deepgram/sdk';
const { Deepgram } = pkg;
import config from '../config/config.js';

class DeepgramService {
  constructor() {
    this.deepgram = new Deepgram(config.DEEPGRAM_API_KEY);
    this.activeTranscriptions = new Map();
    this.connections = new Map();
  }

  // Start real-time transcription
  async startRealTimeTranscription(callId, onTranscript, onError) {
    try {
      if (!config.DEEPGRAM_API_KEY) {
        throw new Error('Deepgram API key not configured');
      }
      
      console.log('Starting Deepgram transcription with API key:', config.DEEPGRAM_API_KEY.substring(0, 10) + '...');

      // Create real-time connection with enhanced configuration
      const connection = this.deepgram.transcription.live({
        model: config.DEEPGRAM_MODEL || 'nova-2',
        language: config.DEEPGRAM_LANGUAGE || 'en-US',
        smart_format: true,
        punctuate: true,
        interim_results: true, // Enable interim results for better UX
        encoding: 'linear16',
        channels: 1,
        sample_rate: 16000,
        keywords: ['sales', 'product', 'pricing', 'demo', 'contract', 'budget', 'ROI', 'solution', 'proposal', 'deal', 'closing'],
        boost_param: 'high',
        diarize: true, // Enable speaker diarization
        utterances: true, // Enable utterance detection
        endpointing: 200, // End utterance after 200ms of silence
        vad_events: true, // Voice activity detection events
        vad_turnoff: 500 // Turn off VAD after 500ms of silence
      });

      // Handle connection events
      connection.on('open', () => {
        console.log(`✅ Deepgram connection opened for call ${callId}`);
        this.connections.set(callId, connection);
      });

      connection.on('close', () => {
        console.log(`🔴 Deepgram connection closed for call ${callId}`);
        this.activeTranscriptions.delete(callId);
        this.connections.delete(callId);
      });

      connection.on('error', (error) => {
        console.error(`❌ Deepgram error for call ${callId}:`, error);
        onError(error);
      });

      // Handle transcription results
      connection.on('transcription', (transcription) => {
        if (transcription.is_final) {
          const transcriptData = {
            id: Date.now().toString(),
            callId,
            text: transcription.channel.alternatives[0].transcript,
            confidence: transcription.channel.alternatives[0].confidence || 0.9,
            speaker: this.detectSpeaker(transcription),
            timestamp: new Date(),
            words: transcription.channel.alternatives[0].words || [],
            startTime: transcription.start || 0,
            endTime: transcription.end || 0,
            isFinal: true
          };
          onTranscript(transcriptData);
        }
      });

      // Handle interim results for better UX
      connection.on('transcription', (transcription) => {
        if (!transcription.is_final) {
          const transcriptData = {
            id: Date.now().toString(),
            callId,
            text: transcription.channel.alternatives[0].transcript,
            confidence: transcription.channel.alternatives[0].confidence || 0.7,
            speaker: this.detectSpeaker(transcription),
            timestamp: new Date(),
            words: transcription.channel.alternatives[0].words || [],
            startTime: transcription.start || 0,
            endTime: transcription.end || 0,
            isFinal: false
          };
          onTranscript(transcriptData);
        }
      });

      // Handle utterance events for speaker diarization
      connection.on('utterance', (utterance) => {
        console.log(`🗣️ Utterance detected for call ${callId}:`, utterance);
      });

      // Handle VAD events
      connection.on('vad', (vad) => {
        console.log(`🎤 VAD event for call ${callId}:`, vad);
      });

      this.activeTranscriptions.set(callId, connection);
      
      console.log(`✅ Deepgram real-time transcription started for call ${callId}`);
      return connection;
    } catch (error) {
      console.error('Failed to start Deepgram real-time transcription:', error);
      throw error;
    }
  }

  // Stop real-time transcription
  async stopRealTimeTranscription(callId) {
    try {
      const connection = this.connections.get(callId);
      if (connection) {
        connection.finish();
        this.activeTranscriptions.delete(callId);
        this.connections.delete(callId);
        console.log(`✅ Deepgram transcription stopped for call ${callId}`);
      }
    } catch (error) {
      console.error('Failed to stop Deepgram transcription:', error);
      throw error;
    }
  }

  // Send audio data to active transcription
  async sendAudioData(callId, audioBuffer) {
    try {
      const connection = this.connections.get(callId);
      if (connection && connection.getReadyState() === 1) { // OPEN state
        connection.send(audioBuffer);
      } else {
        console.warn(`Deepgram connection not ready for call ${callId}`);
      }
    } catch (error) {
      console.error('Failed to send audio data to Deepgram:', error);
      throw error;
    }
  }

  // Transcribe audio file
  async transcribeAudioFile(audioFilePath, options = {}) {
    try {
      const audio = { buffer: audioFilePath };
      
      const response = await this.deepgram.transcription.preRecorded(audio, {
        model: options.model || config.DEEPGRAM_MODEL,
        language: options.language || config.DEEPGRAM_LANGUAGE,
        smart_format: true,
        punctuate: true,
        diarize: true,
        utterances: true,
        keywords: options.keywords || ['sales', 'product', 'pricing', 'demo', 'contract', 'budget', 'ROI', 'solution'],
        boost_param: 'high'
      });

      const result = response.results;
      
      return {
        id: Date.now().toString(),
        text: result.channels[0].alternatives[0].transcript,
        confidence: result.channels[0].alternatives[0].confidence || 0.9,
        speakers: this.processSpeakerLabels(result.utterances),
        words: result.channels[0].alternatives[0].words || [],
        duration: result.metadata.duration || 0,
        language: result.metadata.language || config.DEEPGRAM_LANGUAGE
      };
    } catch (error) {
      console.error('Failed to transcribe audio file with Deepgram:', error);
      throw error;
    }
  }

  // Transcribe audio data (for extension)
  async transcribeAudio(audioData, format = 'webm') {
    try {
      // Convert audio data to buffer if needed
      let audioBuffer;
      if (typeof audioData === 'string') {
        audioBuffer = Buffer.from(audioData, 'base64');
      } else {
        audioBuffer = audioData;
      }

      const audio = { buffer: audioBuffer };
      
      const response = await this.deepgram.transcription.preRecorded(audio, {
        model: config.DEEPGRAM_MODEL,
        language: config.DEEPGRAM_LANGUAGE,
        smart_format: true,
        punctuate: true,
        keywords: ['sales', 'product', 'pricing', 'demo', 'contract', 'budget', 'ROI', 'solution'],
        boost_param: 'high'
      });

      const result = response.results;
      return result.channels[0].alternatives[0].transcript || '';
    } catch (error) {
      console.error('Failed to transcribe audio data with Deepgram:', error);
      return '';
    }
  }

  // Detect speaker from transcription
  detectSpeaker(transcription) {
    try {
      if (transcription.channel.alternatives[0].words && transcription.channel.alternatives[0].words.length > 0) {
        const firstWord = transcription.channel.alternatives[0].words[0];
        if (firstWord.speaker !== undefined) {
          return `Speaker ${firstWord.speaker + 1}`;
        }
      }
      return 'Unknown';
    } catch (error) {
      console.error('Error detecting speaker:', error);
      return 'Unknown';
    }
  }

  // Process speaker labels from utterances
  processSpeakerLabels(utterances) {
    if (!utterances) return [];
    
    return utterances.map(utterance => ({
      speaker: `Speaker ${utterance.speaker + 1}`,
      start: utterance.start,
      end: utterance.end,
      confidence: utterance.confidence,
      text: utterance.transcript
    }));
  }

  // Check if transcription is active for a call
  isTranscriptionActive(callId) {
    return this.activeTranscriptions.has(callId);
  }

  // Get active transcription count
  getActiveTranscriptionCount() {
    return this.activeTranscriptions.size;
  }
}

export default new DeepgramService(); 