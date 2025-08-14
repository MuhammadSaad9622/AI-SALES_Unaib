const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const config = require('../config/config.js');

class WebSocketService {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map(); // Map of client connections
    this.callRooms = new Map(); // Map of call rooms
    this.participantTranscriptions = new Map(); // Map of participant transcriptions per call
    this.aiSuggestionContexts = new Map(); // Map of AI suggestion contexts per call
    
    this.initialize();
  }

  initialize() {
    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });
  }

  handleConnection(ws, req) {
    // Extract token from query parameters
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    const callId = url.searchParams.get('callId');
    const participantId = url.searchParams.get('participantId');
    const participantName = url.searchParams.get('participantName');

    if (!token) {
      ws.close(1008, 'Authentication required');
      return;
    }

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, config.JWT_SECRET);
      const userId = decoded.userId;

      // Store client connection with participant info
      this.clients.set(ws, {
        userId,
        callId,
        participantId: participantId || userId,
        participantName: participantName || 'Unknown',
        connectedAt: new Date(),
        isHost: false // Will be updated based on Zoom meeting role
      });

      // Join call room if callId is provided
      if (callId) {
        this.joinCallRoom(ws, callId);
        this.initializeCallRoom(callId);
      }

      console.log(`WebSocket connected: User ${userId}, Call ${callId || 'None'}, Participant ${participantName || 'Unknown'}`);

      // Handle incoming messages
      ws.on('message', (data) => {
        this.handleMessage(ws, data);
      });

      // Handle client disconnect
      ws.on('close', () => {
        this.handleDisconnect(ws);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.handleDisconnect(ws);
      });

      // Send welcome message
      this.sendToClient(ws, {
        type: 'connected',
        message: 'Connected to AI Sales Assistant',
        participantId: participantId || userId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('WebSocket authentication error:', error);
      ws.close(1008, 'Invalid token');
    }
  }

  initializeCallRoom(callId) {
    if (!this.participantTranscriptions.has(callId)) {
      this.participantTranscriptions.set(callId, new Map());
    }
    if (!this.aiSuggestionContexts.has(callId)) {
      this.aiSuggestionContexts.set(callId, {
        fullTranscript: [],
        lastSuggestionTime: 0,
        participants: new Set()
      });
    }
  }

  handleMessage(ws, data) {
    try {
      const message = JSON.parse(data);
      const client = this.clients.get(ws);

      if (!client) {
        return;
      }

      switch (message.type) {
        case 'transcript':
          this.handleTranscript(ws, message, client);
          break;
        case 'participant_joined':
          this.handleParticipantJoined(ws, message, client);
          break;
        case 'participant_left':
          this.handleParticipantLeft(ws, message, client);
          break;
        case 'suggestion_request':
          this.handleSuggestionRequest(ws, message, client);
          break;
        case 'call_status':
          this.handleCallStatus(ws, message, client);
          break;
        case 'ping':
          this.sendToClient(ws, { type: 'pong', timestamp: new Date().toISOString() });
          break;
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  async handleTranscript(ws, message, client) {
    try {
      // Process transcript with Whisper AI
      const whisperService = (await import('./whisperService.js')).default;
      const audioBuffer = Buffer.from(message.audioData, 'base64');
      
      const result = await whisperService.transcribeAudio(audioBuffer, {
        language: 'en',
        prompt: 'This is a sales conversation. Focus on business terminology and sales context.',
        speaker: client.participantName
      });

      if (result.success) {
        // Store transcript in database
        const Transcript = (await import('../models/Transcript.js')).default;
        const transcript = await Transcript.create({
          call: client.callId,
          speaker: client.participantName,
          speakerId: client.participantId,
          text: result.text,
          confidence: result.confidence,
          timestamp: new Date(),
          language: result.language,
          duration: result.duration,
          isHost: client.isHost
        });

        // Update participant transcriptions
        this.updateParticipantTranscription(client.callId, client.participantId, transcript);

        // Broadcast transcript to all clients in the call room
        this.broadcastToCallRoom(client.callId, {
          type: 'transcript_update',
          transcript: {
            id: transcript._id,
            speaker: transcript.speaker,
            speakerId: transcript.speakerId,
            text: transcript.text,
            confidence: transcript.confidence,
            timestamp: transcript.timestamp,
            isHost: transcript.isHost
          }
        });

        // Generate AI suggestions based on full conversation context
        await this.generateMultiParticipantSuggestions(client.callId, transcript);
      }
    } catch (error) {
      console.error('Error handling transcript:', error);
      this.sendToClient(ws, {
        type: 'error',
        message: 'Failed to process transcript',
        error: error.message
      });
    }
  }

  updateParticipantTranscription(callId, participantId, transcript) {
    if (!this.participantTranscriptions.has(callId)) {
      this.participantTranscriptions.set(callId, new Map());
    }
    
    const callTranscriptions = this.participantTranscriptions.get(callId);
    if (!callTranscriptions.has(participantId)) {
      callTranscriptions.set(participantId, []);
    }
    
    callTranscriptions.get(participantId).push(transcript);
    
    // Keep only last 50 transcripts per participant to manage memory
    if (callTranscriptions.get(participantId).length > 50) {
      callTranscriptions.set(participantId, callTranscriptions.get(participantId).slice(-50));
    }
  }

  async generateMultiParticipantSuggestions(callId, newTranscript) {
    try {
      const context = this.aiSuggestionContexts.get(callId);
      if (!context) return;

      // Add new transcript to context
      context.fullTranscript.push(newTranscript);
      
      // Keep only last 100 transcripts total
      if (context.fullTranscript.length > 100) {
        context.fullTranscript = context.fullTranscript.slice(-100);
      }

      // Check if enough time has passed since last suggestion (30 seconds)
      const now = Date.now();
      if (now - context.lastSuggestionTime < 30000) {
        return;
      }

      // Import AI service
      const aiService = (await import('./aiService.js')).default;
      
      // Create conversation context from all participants
      const conversationContext = this.buildMultiParticipantContext(callId);
      
      // Generate AI suggestion
      const suggestion = await aiService.generateSuggestion(
        callId,
        conversationContext,
        '', // document context
        {} // user preferences
      );

      // Store suggestion in database
      const AISuggestion = (await import('../models/AISuggestion.js')).default;
      const savedSuggestion = await AISuggestion.create({
        call: callId,
        text: suggestion.text,
        type: suggestion.type,
        confidence: suggestion.confidence,
        reasoning: suggestion.reasoning,
        priority: suggestion.priority,
        used: false,
        context: {
          participantCount: context.participants.size,
          recentSpeakers: this.getRecentSpeakers(callId)
        }
      });

      // Update last suggestion time
      context.lastSuggestionTime = now;

      // Broadcast suggestion to all clients in the call room
      this.broadcastToCallRoom(callId, {
        type: 'newSuggestion',
        suggestion: {
          id: savedSuggestion._id,
          text: savedSuggestion.text,
          type: savedSuggestion.type,
          confidence: savedSuggestion.confidence,
          reasoning: savedSuggestion.reasoning,
          priority: savedSuggestion.priority,
          timestamp: savedSuggestion.createdAt,
          context: savedSuggestion.context
        }
      });

    } catch (error) {
      console.error('Error generating multi-participant suggestions:', error);
    }
  }

  buildMultiParticipantContext(callId) {
    const context = this.aiSuggestionContexts.get(callId);
    if (!context) return [];

    // Build conversation context from all participants
    const allTranscripts = context.fullTranscript
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .map(t => ({
        speaker: t.speaker,
        speakerId: t.speakerId,
        text: t.text,
        timestamp: t.timestamp,
        isHost: t.isHost
      }));

    return allTranscripts;
  }

  getRecentSpeakers(callId) {
    const context = this.aiSuggestionContexts.get(callId);
    if (!context) return [];

    const recentTranscripts = context.fullTranscript.slice(-10);
    const speakers = [...new Set(recentTranscripts.map(t => t.speaker))];
    return speakers;
  }

  handleParticipantJoined(ws, message, client) {
    const context = this.aiSuggestionContexts.get(client.callId);
    if (context) {
      context.participants.add(client.participantId);
    }

    // Update client info
    client.isHost = message.isHost || false;
    client.participantName = message.participantName || client.participantName;

    // Broadcast participant joined to all clients
    this.broadcastToCallRoom(client.callId, {
      type: 'participant_joined',
      participant: {
        id: client.participantId,
        name: client.participantName,
        isHost: client.isHost,
        timestamp: new Date().toISOString()
      }
    });

    console.log(`Participant joined: ${client.participantName} (${client.isHost ? 'Host' : 'Participant'})`);
  }

  handleParticipantLeft(ws, message, client) {
    const context = this.aiSuggestionContexts.get(client.callId);
    if (context) {
      context.participants.delete(client.participantId);
    }

    // Broadcast participant left to all clients
    this.broadcastToCallRoom(client.callId, {
      type: 'participant_left',
      participant: {
        id: client.participantId,
        name: client.participantName,
        timestamp: new Date().toISOString()
      }
    });

    console.log(`Participant left: ${client.participantName}`);
  }

  async handleSuggestionRequest(ws, message, client) {
    try {
      // Generate AI suggestions
      await this.generateMultiParticipantSuggestions(client.callId, null);
    } catch (error) {
      console.error('Error handling suggestion request:', error);
      this.sendToClient(ws, {
        type: 'error',
        message: 'Failed to generate suggestions',
        error: error.message
      });
    }
  }

  handleCallStatus(ws, message, client) {
    // Update call status and notify other clients
    this.broadcastToCallRoom(client.callId, {
      type: 'call_status_update',
      status: message.status,
      timestamp: new Date().toISOString()
    });
  }

  joinCallRoom(ws, callId) {
    if (!this.callRooms.has(callId)) {
      this.callRooms.set(callId, new Set());
    }
    
    this.callRooms.get(callId).add(ws);
    console.log(`Client joined call room: ${callId}`);
  }

  leaveCallRoom(ws, callId) {
    if (this.callRooms.has(callId)) {
      this.callRooms.get(callId).delete(ws);
      
      // Remove empty rooms
      if (this.callRooms.get(callId).size === 0) {
        this.callRooms.delete(callId);
        this.participantTranscriptions.delete(callId);
        this.aiSuggestionContexts.delete(callId);
      }
    }
  }

  broadcastToCallRoom(callId, message) {
    if (this.callRooms.has(callId)) {
      const room = this.callRooms.get(callId);
      room.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          this.sendToClient(client, message);
        }
      });
    }
  }

  sendToClient(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  handleDisconnect(ws) {
    const client = this.clients.get(ws);
    
    if (client) {
      // Leave call room
      if (client.callId) {
        this.leaveCallRoom(ws, client.callId);
      }
      
      // Remove from clients
      this.clients.delete(ws);
      
      console.log(`WebSocket disconnected: User ${client.userId}, Participant ${client.participantName}`);
    }
  }

  // Utility methods
  getConnectedClients() {
    return Array.from(this.clients.values());
  }

  getCallRoomSize(callId) {
    return this.callRooms.has(callId) ? this.callRooms.get(callId).size : 0;
  }

  getCallParticipants(callId) {
    const participants = new Set();
    if (this.callRooms.has(callId)) {
      this.callRooms.get(callId).forEach(ws => {
        const client = this.clients.get(ws);
        if (client) {
          participants.add({
            id: client.participantId,
            name: client.participantName,
            isHost: client.isHost
          });
        }
      });
    }
    return Array.from(participants);
  }

  broadcastToAll(message) {
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        this.sendToClient(client, message);
      }
    });
  }
}

module.exports = WebSocketService; 