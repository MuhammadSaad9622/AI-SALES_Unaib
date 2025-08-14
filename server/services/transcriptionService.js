import { AssemblyAI } from 'assemblyai';
import config from '../config/config.js';
import deepgramService from './deepgramService.js';

class TranscriptionService {
  constructor() {
    this.assemblyaiClient = config.ASSEMBLYAI_API_KEY ? new AssemblyAI({
      apiKey: config.ASSEMBLYAI_API_KEY
    }) : null;
    this.activeTranscriptions = new Map();
  }

  // Start real-time transcription with provider selection
  async startRealTimeTranscription(callId, onTranscript, onError, provider = null) {
    const selectedProvider = provider || config.TRANSCRIPTION_PROVIDER;
    
    try {
      switch (selectedProvider) {
        case 'deepgram':
          return await deepgramService.startRealTimeTranscription(callId, onTranscript, onError);
        
        case 'assemblyai':
          return await this.startAssemblyAITranscription(callId, onTranscript, onError);
        
        default:
          console.warn(`Unknown transcription provider: ${selectedProvider}, falling back to Deepgram`);
          return await deepgramService.startRealTimeTranscription(callId, onTranscript, onError);
      }
    } catch (error) {
      console.error(`Failed to start transcription with ${selectedProvider}:`, error);
      
      // Fallback to Deepgram if other provider fails
      if (selectedProvider !== 'deepgram') {
        console.log('Falling back to Deepgram transcription...');
        return await deepgramService.startRealTimeTranscription(callId, onTranscript, onError);
      }
      throw error;
    }
  }

  // AssemblyAI transcription (legacy support)
  async startAssemblyAITranscription(callId, onTranscript, onError) {
    if (!this.assemblyaiClient) {
      throw new Error('AssemblyAI API key not configured');
    }

    const rt = this.assemblyaiClient.realtime.createService({
      sampleRate: 16000,
      wordBoost: ['sales', 'product', 'pricing', 'demo', 'contract', 'budget', 'ROI', 'solution'],
      boostParam: 'high',
      encoding: 'pcm_s16le'
    });

    rt.on('transcript', (transcript) => {
      if (transcript.message_type === 'FinalTranscript') {
        const transcriptData = {
          id: Date.now().toString(),
          callId,
          text: transcript.text,
          confidence: transcript.confidence,
          speaker: this.detectSpeaker(transcript),
          timestamp: new Date(),
          words: transcript.words || [],
          startTime: transcript.audio_start || 0,
          endTime: transcript.audio_end || 0
        };
        onTranscript(transcriptData);
      }
    });

    rt.on('error', (error) => {
      console.error('Real-time transcription error:', error);
      onError(error);
    });

    rt.on('close', () => {
      console.log('Real-time transcription connection closed');
      this.activeTranscriptions.delete(callId);
    });

    await rt.connect();
    this.activeTranscriptions.set(callId, rt);
    
    console.log(`✅ AssemblyAI real-time transcription started for call ${callId}`);
    return rt;
  }

  // Stop real-time transcription
  async stopRealTimeTranscription(callId) {
    try {
      // Try Deepgram first
      if (deepgramService.isTranscriptionActive(callId)) {
        await deepgramService.stopRealTimeTranscription(callId);
        return;
      }

      // Fallback to AssemblyAI
      const rt = this.activeTranscriptions.get(callId);
      if (rt) {
        rt.close();
        this.activeTranscriptions.delete(callId);
        console.log(`✅ Transcription stopped for call ${callId}`);
      }
    } catch (error) {
      console.error('Failed to stop transcription:', error);
      throw error;
    }
  }

  // Process audio file for transcription
  async transcribeAudioFile(audioFilePath, options = {}) {
    const provider = options.provider || config.TRANSCRIPTION_PROVIDER;
    
    try {
      switch (provider) {
        case 'deepgram':
          return await deepgramService.transcribeAudioFile(audioFilePath, options);
        
        case 'assemblyai':
          return await this.transcribeAudioFileAssemblyAI(audioFilePath, options);
        
        default:
          return await deepgramService.transcribeAudioFile(audioFilePath, options);
      }
    } catch (error) {
      console.error(`Failed to transcribe audio file with ${provider}:`, error);
      
      // Fallback to Deepgram
      if (provider !== 'deepgram') {
        console.log('Falling back to Deepgram transcription...');
        return await deepgramService.transcribeAudioFile(audioFilePath, options);
      }
      throw error;
    }
  }

  // AssemblyAI audio file transcription
  async transcribeAudioFileAssemblyAI(audioFilePath, options = {}) {
    if (!this.assemblyaiClient) {
      throw new Error('AssemblyAI API key not configured');
    }

    const transcript = await this.assemblyaiClient.transcripts.transcribe({
      audio: audioFilePath,
      speaker_labels: true,
      auto_highlights: true,
      sentiment_analysis: true,
      entity_detection: true,
      iab_categories: true,
      content_safety: true,
      language_code: options.language || config.TRANSCRIPTION_LANGUAGE,
      word_boost: options.wordBoost || ['sales', 'product', 'pricing', 'demo', 'contract', 'budget'],
      boost_param: 'high',
      punctuate: true,
      format_text: true,
      dual_channel: options.dualChannel || false,
      model: options.model || config.TRANSCRIPTION_MODEL
    });

    return {
      id: transcript.id,
      text: transcript.text,
      confidence: transcript.confidence,
      speakers: this.processSpeakerLabels(transcript.utterances),
      highlights: transcript.auto_highlights_result?.results || [],
      sentiment: transcript.sentiment_analysis_results || [],
      entities: transcript.entities || [],
      categories: transcript.iab_categories_result?.summary || {},
      contentSafety: transcript.content_safety_labels?.summary || {},
      summary: transcript.summary,
      chapters: transcript.chapters || []
    };
  }

  // Transcribe audio data (for extension)
  async transcribeAudio(audioData, format = 'webm', provider = null) {
    const selectedProvider = provider || config.TRANSCRIPTION_PROVIDER;
    
    try {
      switch (selectedProvider) {
        case 'deepgram':
          return await deepgramService.transcribeAudio(audioData, format);
        
        case 'assemblyai':
          return await this.transcribeAudioAssemblyAI(audioData, format);
        
        default:
          return await deepgramService.transcribeAudio(audioData, format);
      }
    } catch (error) {
      console.error(`Failed to transcribe audio data with ${selectedProvider}:`, error);
      
      // Fallback to Deepgram
      if (selectedProvider !== 'deepgram') {
        console.log('Falling back to Deepgram transcription...');
        return await deepgramService.transcribeAudio(audioData, format);
      }
      return '';
    }
  }

  // AssemblyAI audio data transcription
  async transcribeAudioAssemblyAI(audioData, format = 'webm') {
    if (!this.assemblyaiClient) {
      throw new Error('AssemblyAI API key not configured');
    }

    let audioBuffer;
    if (typeof audioData === 'string') {
      audioBuffer = Buffer.from(audioData, 'base64');
    } else {
      audioBuffer = audioData;
    }

    const transcript = await this.assemblyaiClient.transcripts.transcribe({
      audio: audioBuffer,
      speaker_labels: false,
      language_code: 'en',
      word_boost: ['sales', 'product', 'pricing', 'demo', 'contract'],
      boost_param: 'high'
    });

    return transcript.text || '';
  }

  // Save transcript to database
  async saveTranscript(callId, transcriptText, userId) {
    try {
      const Transcript = (await import('../models/Transcript.js')).default;
      
      const transcript = new Transcript({
        call: callId,
        user: userId,
        text: transcriptText,
        timestamp: new Date(),
        confidence: 0.9,
        speaker: 'user'
      });

      await transcript.save();
      return transcript;
    } catch (error) {
      console.error('Failed to save transcript:', error);
      throw error;
    }
  }

  // Transcribe audio from URL
  async transcribeAudioUrl(audioUrl, options = {}) {
    const provider = options.provider || config.TRANSCRIPTION_PROVIDER;
    
    try {
      switch (provider) {
        case 'deepgram':
          return await deepgramService.transcribeAudioFile(audioUrl, options);
        
        case 'assemblyai':
          return await this.transcribeAudioUrlAssemblyAI(audioUrl, options);
        
        default:
          return await deepgramService.transcribeAudioFile(audioUrl, options);
      }
    } catch (error) {
      console.error(`Failed to transcribe audio URL with ${provider}:`, error);
      
      // Fallback to Deepgram
      if (provider !== 'deepgram') {
        console.log('Falling back to Deepgram transcription...');
        return await deepgramService.transcribeAudioFile(audioUrl, options);
      }
      throw error;
    }
  }

  // AssemblyAI audio URL transcription
  async transcribeAudioUrlAssemblyAI(audioUrl, options = {}) {
    if (!this.assemblyaiClient) {
      throw new Error('AssemblyAI API key not configured');
    }

    const transcript = await this.assemblyaiClient.transcripts.transcribe({
      audio_url: audioUrl,
      speaker_labels: true,
      auto_highlights: true,
      sentiment_analysis: true,
      entity_detection: true,
      language_code: options.language || config.TRANSCRIPTION_LANGUAGE,
      word_boost: options.wordBoost || ['sales', 'product', 'pricing'],
      boost_param: 'high',
      model: options.model || config.TRANSCRIPTION_MODEL
    });

    return {
      id: transcript.id,
      text: transcript.text,
      confidence: transcript.confidence,
      speakers: this.processSpeakerLabels(transcript.utterances),
      highlights: transcript.auto_highlights_result?.results || [],
      sentiment: transcript.sentiment_analysis_results || [],
      entities: transcript.entities || []
    };
  }

  // Detect speaker from transcription
  detectSpeaker(transcript) {
    try {
      if (transcript.words && transcript.words.length > 0) {
        const firstWord = transcript.words[0];
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
    return deepgramService.isTranscriptionActive(callId) || this.activeTranscriptions.has(callId);
  }

  // Get active transcription count
  getActiveTranscriptionCount() {
    return deepgramService.getActiveTranscriptionCount() + this.activeTranscriptions.size;
  }
}

export default new TranscriptionService();