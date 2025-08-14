import express from 'express';
const router = express.Router();
import aiService from '../services/aiService.js';
import transcriptionService from '../services/transcriptionService.js';
import { authenticate } from '../middleware/auth.js';

// Generate AI suggestion
router.post('/suggestion', authenticate, async (req, res) => {
  try {
    const { callId, transcriptHistory, documentContext, userPreferences } = req.body;

    if (!callId || !transcriptHistory) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const suggestion = await aiService.generateSuggestion(
      callId,
      transcriptHistory,
      documentContext,
      userPreferences
    );

    res.json(suggestion);
  } catch (error) {
    console.error('AI suggestion error:', error);
    res.status(500).json({ error: 'Failed to generate AI suggestion' });
  }
});

// Analyze conversation
router.post('/analyze', authenticate, async (req, res) => {
  try {
    const { transcriptHistory } = req.body;

    if (!transcriptHistory || !Array.isArray(transcriptHistory)) {
      return res.status(400).json({ error: 'Invalid transcript history' });
    }

    const analysis = await aiService.analyzeConversation(transcriptHistory);
    res.json(analysis);
  } catch (error) {
    console.error('Conversation analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze conversation' });
  }
});

// Process document for context
router.post('/process-document', authenticate, async (req, res) => {
  try {
    const { content, type } = req.body;

    if (!content || !type) {
      return res.status(400).json({ error: 'Missing content or type' });
    }

    const context = await aiService.processDocumentForContext(content, type);
    res.json(context);
  } catch (error) {
    console.error('Document processing error:', error);
    res.status(500).json({ error: 'Failed to process document' });
  }
});

// Start real-time transcription
router.post('/transcription/start', authenticate, async (req, res) => {
  try {
    const { callId } = req.body;

    if (!callId) {
      return res.status(400).json({ error: 'Missing callId' });
    }

    // This would typically be handled via WebSocket
    // Here we're just acknowledging the request
    res.json({ 
      message: 'Transcription started',
      callId,
      status: 'active'
    });
  } catch (error) {
    console.error('Transcription start error:', error);
    res.status(500).json({ error: 'Failed to start transcription' });
  }
});

// Transcribe audio data
router.post('/transcribe', authenticate, async (req, res) => {
  try {
    const { audioData, format, callId } = req.body;

    if (!audioData) {
      return res.status(400).json({ error: 'Missing audio data' });
    }

    const transcript = await transcriptionService.transcribeAudio(audioData, format);
    
    // Save transcript to database if callId provided
    if (callId && transcript) {
      await transcriptionService.saveTranscript(callId, transcript, req.user._id);
    }
    
    res.json({ 
      success: true,
      transcript: transcript,
      id: callId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

// Stop real-time transcription
router.post('/transcription/stop', authenticate, async (req, res) => {
  try {
    const { callId } = req.body;

    if (!callId) {
      return res.status(400).json({ error: 'Missing callId' });
    }

    await transcriptionService.stopRealTimeTranscription(callId);
    
    res.json({ 
      message: 'Transcription stopped',
      callId,
      status: 'stopped'
    });
  } catch (error) {
    console.error('Transcription stop error:', error);
    res.status(500).json({ error: 'Failed to stop transcription' });
  }
});

// Transcribe audio file
router.post('/transcription/file', authenticate, async (req, res) => {
  try {
    const { audioFilePath, options } = req.body;

    if (!audioFilePath) {
      return res.status(400).json({ error: 'Missing audio file path' });
    }

    const transcript = await transcriptionService.transcribeAudioFile(audioFilePath, options);
    res.json(transcript);
  } catch (error) {
    console.error('File transcription error:', error);
    res.status(500).json({ error: 'Failed to transcribe audio file' });
  }
});

// Get transcription status
router.get('/transcription/status/:transcriptId', authenticate, async (req, res) => {
  try {
    const { transcriptId } = req.params;
    const status = await transcriptionService.getTranscriptionStatus(transcriptId);
    res.json(status);
  } catch (error) {
    console.error('Transcription status error:', error);
    res.status(500).json({ error: 'Failed to get transcription status' });
  }
});

export default router;