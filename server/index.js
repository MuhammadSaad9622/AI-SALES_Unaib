import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";
import jwt from "jsonwebtoken";
import helmet from "helmet";
import zoomRTMSService from "./services/zoomRTMSService.js";

// Import configuration and database
import config from "./config/config.js";
import database from "./config/database.js";

// Import middleware
import { globalErrorHandler } from "./middleware/errorHandler.js";
import { generalLimiter } from "./middleware/rateLimiter.js";

// Import routes
import authRoutes from "./routes/auth.js";
import callRoutes from "./routes/calls.js";
import meetingRoutes from "./routes/meetings.js";
import documentRoutes from "./routes/documentRoutes.js";
// import transcriptRoutes from './routes/transcripts.js';
// import aiRoutes from './routes/ai.js';
import analyticsRoutes from "./routes/analytics.js";

// Import services
import aiService from "./services/aiService.js";
import zoomService from "./services/zoomService.js";
import googleMeetService from "./services/googleMeetService.js";
import TranscriptAnalyzer from "./services/transcriptAnalyzer.js";
import mongoose from "mongoose";
import { text } from "stream/consumers";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
// Set up Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://mussab-ai-sales-ext.vercel.app", "https://ai-sales-unaib-j296qtaiw-muhammadsaad9622s-projects.vercel.app", "chrome-extension://*"]
        : ["http://localhost:3000", "chrome-extension://*"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Initialize RTMS service
// Set up RTMS transcript handler to follow same flow as existing transcription

// Initialize transcript analyzer for AI suggestions
const transcriptAnalyzer = new TranscriptAnalyzer();

// Global variable to store current call ID for RTMS
let globalCallId = null;

// Track processed transcripts to prevent duplicates
const processedTranscripts = new Set();

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication token required"));
    }

    // Allow development tokens for testing
    if (token.startsWith("dev-token-")) {
      socket.user = { id: "dev-user", name: "Development User" };
      socket.userId = "dev-user";
      console.log("🔧 Development token accepted");
      return next();
    }

    // Verify JWT token for production
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const userId = decoded.userId;

    if (!userId) {
      return next(new Error("Invalid token"));
    }

    // Get user from database
    const User = (await import("./models/User.js")).default;
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return next(new Error("User not found"));
    }

    // Attach user to socket
    socket.user = user;
    socket.userId = userId;

    next();
  } catch (error) {
    console.error("Socket.IO authentication error:", error);
    next(new Error("Authentication failed"));
  }
});

// Security middleware
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "ws:", "wss:"],
      },
    },
  })
);

// CORS configuration
const allowedOrigins = process.env.NODE_ENV === "production"
  ? [
      "https://mussab-ai-sales-ext.vercel.app",
      "https://ai-sales-unaib-j296qtaiw-muhammadsaad9622s-projects.vercel.app",
      "https://ai-sales-unaib.onrender.com",
      "chrome-extension://*"
    ]
  : [
      "http://localhost:3000",
      "http://localhost:5173",
      "chrome-extension://*"
    ];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parsing middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Rate limiting
app.use(generalLimiter);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, "..", "public");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Serve static files
app.use("/uploads", express.static(uploadsDir));
app.use(express.static(publicDir));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure the uploads directory exists before storing files
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|mp3|wav|mp4/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/calls", callRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/documents", documentRoutes);
// app.use('/api/transcripts', transcriptRoutes);
// app.use('/api/ai', aiRoutes);
app.use("/api/analytics", analyticsRoutes);

// Endpoint: Generate call summary using OpenAI
app.post("/api/calls/:id/summary", async (req, res) => {
  try {
    const { id } = req.params;

    const CallModel = (await import("./models/Call.js")).default;
    const Transcript = (await import("./models/Transcript.js")).default;

    // Try to resolve a Call document by _id or meetingId
    let callDoc = null;
    try {
      callDoc = await CallModel.findById(id)
        .lean()
        .catch(() => null);
    } catch (e) {
      callDoc = null;
    }
    if (!callDoc) {
      try {
        callDoc = await CallModel.findOne({ meetingId: id })
          .lean()
          .catch(() => null);
      } catch (e) {
        callDoc = null;
      }
    }

    // Build query keys for transcripts
    const callKeys = [id];
    if (callDoc && callDoc._id) callKeys.push(String(callDoc._id));

    // Fetch transcripts for the call
    const transcripts = await Transcript.find({ call: { $in: callKeys } })
      .sort({ timestamp: 1 })
      .lean()
      .limit(500); // Limit to prevent too much data

    if (!transcripts || transcripts.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No transcripts found for this call",
      });
    }

    // Convert transcripts to conversation text
    const conversationText = transcripts
      .map((t) => `${t.speaker}: ${t.text}`)
      .join("\n");

    if (!conversationText.trim()) {
      return res.status(400).json({
        success: false,
        message: "No conversation content found",
      });
    }

    // Generate summary using AI service
    const prompt = `You are a professional business analyst specializing in meeting documentation and call analysis. 

Generate a comprehensive, well-structured call summary report that is easy to read and understand. Follow this exact format:

**MEETING OVERVIEW**
- Brief 2-3 sentence description of the meeting purpose and outcome

**PARTICIPANTS**
- List all speakers/participants mentioned in the call
- Include their roles if identifiable from context

**KEY DISCUSSION POINTS**
- Main topics discussed (use bullet points)
- Important concepts and ideas presented
- Questions raised and addressed

**DECISIONS MADE**
- Specific decisions reached during the call
- Agreements or consensus points
- Approved actions or changes

**ACTION ITEMS**
- Clear list of tasks assigned
- Who is responsible for each action (if mentioned)
- Deadlines or timelines (if mentioned)

**NEXT STEPS**
- Follow-up meetings or calls planned
- Immediate next actions required
- Future considerations discussed

**ADDITIONAL NOTES**
- Any other relevant information
- Concerns or risks mentioned
- Opportunities identified

Use clear, professional language. Make extensive use of bullet points and numbered lists for easy reading. Keep sentences concise but informative.

Call conversation to analyze:

${conversationText}`;

    const summary = await aiService.generateCompletion(prompt, {
      model: "gpt-3.5-turbo",
      maxTokens: 1000,
      temperature: 0.7,
    });

    if (!summary || !summary.content) {
      return res.status(500).json({
        success: false,
        message: "Failed to generate summary",
      });
    }

    // Update call document with summary if it exists
    if (callDoc) {
      try {
        await CallModel.findByIdAndUpdate(callDoc._id, {
          summary: summary.content,
          summaryGeneratedAt: new Date(),
        });
      } catch (updateError) {
        console.error("Error updating call with summary:", updateError);
      }
    }

    return res.json({
      success: true,
      data: {
        summary: summary.content,
        transcriptCount: transcripts.length,
        callTitle: callDoc?.title || `Call ${id}`,
      },
    });
  } catch (error) {
    console.error("Error generating call summary:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate call summary",
      error: error.message,
    });
  }
});
// Endpoint: Get call transcripts and AI suggestions by call ID
app.get("/api/calls/:id/log", async (req, res) => {
  try {
    const { id } = req.params;

    const CallModel = (await import("./models/Call.js")).default;
    const Transcript = (await import("./models/Transcript.js")).default;
    const AISuggestion = (await import("./models/AISuggestion.js")).default;

    // Try to resolve a Call document by _id or meetingId
    let callDoc = null;
    try {
      callDoc = await CallModel.findById(id)
        .lean()
        .catch(() => null);
    } catch (e) {
      callDoc = null;
    }
    if (!callDoc) {
      try {
        callDoc = await CallModel.findOne({ meetingId: id })
          .lean()
          .catch(() => null);
      } catch (e) {
        callDoc = null;
      }
    }

    // Build query keys for transcripts and suggestions
    const callKeys = [id];
    if (callDoc && callDoc._id) callKeys.push(String(callDoc._id));

    // Fetch transcripts and suggestions
    const transcripts = await Transcript.find({ call: { $in: callKeys } })
      .sort({ timestamp: 1 })
      .lean()
      .limit(200);

    const suggestions = await AISuggestion.find({ call: { $in: callKeys } })
      .sort({ createdAt: -1 })
      .lean()
      .limit(200);

    return res.json({
      success: true,
      data: { call: callDoc, transcripts, suggestions },
    });
  } catch (error) {
    console.error("Error fetching call log:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch call log",
      error: error.message,
    });
  }
});

// Alternative endpoint: Get call transcripts and AI suggestions by call ID (non-conflicting)
app.get("/api/calls/log/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const CallModel = (await import("./models/Call.js")).default;
    const Transcript = (await import("./models/Transcript.js")).default;
    const AISuggestion = (await import("./models/AISuggestion.js")).default;

    // Try to resolve a Call document by _id or meetingId
    let callDoc = null;
    try {
      callDoc = await CallModel.findById(id)
        .lean()
        .catch(() => null);
    } catch (e) {
      callDoc = null;
    }
    if (!callDoc) {
      try {
        callDoc = await CallModel.findOne({ meetingId: id })
          .lean()
          .catch(() => null);
      } catch (e) {
        callDoc = null;
      }
    }

    const callKeys = [id];
    if (callDoc && callDoc._id) callKeys.push(String(callDoc._id));

    const transcripts = await Transcript.find({ call: { $in: callKeys } })
      .sort({ timestamp: 1 })
      .lean()
      .limit(200);

    const suggestions = await AISuggestion.find({ call: { $in: callKeys } })
      .sort({ createdAt: -1 })
      .lean()
      .limit(200);

    return res.json({
      success: true,
      data: { call: callDoc, transcripts, suggestions },
    });
  } catch (error) {
    console.error("Error fetching call log (alt):", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch call log",
      error: error.message,
    });
  }
});

// Health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    const dbHealth = await database.healthCheck();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: config.NODE_ENV,
      services: {
        database: dbHealth,
        ai: !!config.OPENAI_API_KEY,
        ai_model: "gpt-4o-mini", // Using cost-effective GPT-4o-mini
        transcription: "zoom_rtms", // Only using Zoom RTMS for transcription
        zoom: !!config.ZOOM_SDK_KEY,
        meet: !!config.GOOGLE_CLIENT_ID,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Health check failed",
      error: error.message,
    });
  }
});

// Test endpoint for AI suggestions
app.post("/api/test-ai", async (req, res) => {
  try {
    const { callId, message } = req.body;
    console.log(`🧪 Test AI request for call ${callId}: "${message}"`);

    if (!callId) {
      return res.status(400).json({ error: "Call ID is required" });
    }

    // Test the simple AI service
    console.log("🧪 Testing simple AI service with message:", message);
    const aiResponse = await generateSimpleAIResponse(message);
    console.log("🧪 Simple AI service response:", aiResponse);

    // Generate a test suggestion
    const testSuggestion = {
      id: Date.now().toString(),
      type: "general",
      text: aiResponse || `Test AI response to: "${message}"`,
      confidence: 0.9,
      reasoning: "Test suggestion",
      priority: "high",
      customerSentiment: "positive",
      used: false,
      timestamp: new Date(),
      trigger: "test",
      context: message,
      model: "gpt-4o-mini",
    };

    console.log("🧪 Broadcasting test suggestion:", testSuggestion);

    // Broadcast to the specific call
    io.to(callId).emit("newSuggestion", testSuggestion);

    // Also broadcast to all clients as backup
    io.emit("newSuggestion", testSuggestion);

    res.json({ success: true, suggestion: testSuggestion });
  } catch (error) {
    console.error("Error in test AI endpoint:", error);
    res.status(500).json({ error: "Failed to generate test suggestion" });
  }
});

// WebSocket for real-time features
io.on("connection", (socket) => {
  console.log(`👤 User connected: ${socket.id} (User: ${socket.userId})`);

  // Handle authentication errors
  socket.on("connect_error", (error) => {
    console.error("Socket connection error:", error);
    socket.emit("error", { message: "Connection failed: " + error.message });
  });

  socket.on("error", (error) => {
    console.error("Socket error:", error);
    socket.emit("error", { message: "Socket error: " + error.message });
  });

  socket.on("joinCall", async (data) => {
    try {
      const { callId, userId, platform } = data;

      if (!callId || !userId) {
        socket.emit("error", { message: "Call ID and User ID are required" });
        return;
      }

      socket.join(callId);
      console.log(
        `📞 User ${socket.id} joined call ${callId} on ${
          platform || "unknown"
        } platform`
      );

      // Start platform-specific monitoring
      if (platform === "zoom") {
        await zoomService.startAIMonitoring(data.meetingId, callId, io);
      } else if (platform === "google_meet") {
        await googleMeetService.startAIMonitoring(data.meetingId, callId, io);
      }

      // Store socket user ID for later use
      socket.userId = userId;
      socket.callId = callId;
      socket.platform = platform;
      socket.meetingId = data.meetingId;
      globalCallId = callId;

      // Emit successful join
      socket.emit("callJoined", { callId, platform });
    } catch (error) {
      console.error("Error joining call:", error);
      socket.emit("error", { message: "Failed to join call" });
    }
  });

  socket.on("leaveCall", async (data) => {
    try {
      const { callId } = data;
      socket.leave(callId);

      // Stop RTMS transcription if active
      if (socket.platform === "zoom" && socket.meetingId) {
        await zoomRTMSService.stopRTMSTranscription(socket.meetingId);
      }

      // Clear AI conversation context
      aiService.clearConversationContext(callId);

      console.log(`📞 User ${socket.id} left call ${callId}`);
      socket.emit("callLeft", { callId });
    } catch (error) {
      console.error("Error leaving call:", error);
    }
  });

  socket.on("useSuggestion", async (data) => {
    try {
      const { suggestionId, callId, feedback } = data;

      console.log(
        `📝 Suggestion ${suggestionId} marked as used for call ${callId}`
      );

      // Broadcast to all clients that suggestion was used
      io.to(callId).emit("suggestionUsed", { suggestionId, feedback });
    } catch (error) {
      console.error("Error marking suggestion as used:", error);
      socket.emit("suggestionError", {
        error: "Failed to mark suggestion as used",
      });
    }
  });

  socket.on("requestSuggestion", async (data) => {
    try {
      const { callId } = data;

      console.log("🤖 Manual suggestion request for call:", callId);

      // Get recent context for manual suggestion request
      const context = transcriptAnalyzer.getRecentContext();

      if (context) {
        const suggestionTrigger = {
          trigger: "manual_request",
          context: context,
        };

        await generateAISuggestion(callId, suggestionTrigger);
      } else {
        console.log("📝 No context available, generating test suggestion");

        // Generate a test suggestion if no context is available
        const testSuggestion = {
          id: Date.now().toString(),
          type: "test",
          text: "This is a test AI suggestion to verify the system is working correctly.",
          confidence: 0.8,
          reasoning: "Test suggestion for development",
          priority: "low",
          used: false,
          timestamp: new Date(),
          trigger: "test",
          model: "gpt-4o-mini",
        };

        console.log("🧪 Broadcasting test suggestion:", testSuggestion);

        // Broadcast to the specific call
        io.to(callId).emit("newSuggestion", testSuggestion);

        // Also broadcast to all clients as backup
        io.emit("newSuggestion", testSuggestion);
      }
    } catch (error) {
      console.error("Error requesting suggestion:", error);
      socket.emit("suggestionError", {
        error: "Failed to generate suggestion",
      });
    }
  });

  socket.on("audioData", async (data) => {
    try {
      const { callId, audioData, format = "base64" } = data;

      if (!callId || !audioData) {
        return socket.emit("transcriptionError", {
          error: "Missing callId or audioData",
        });
      }

      console.log(
        `🎤 Audio data received for call ${callId} - Using Zoom RTMS for transcription`
      );

      // Audio data is handled by Zoom RTMS automatically
      // No additional processing needed as RTMS captures directly from Zoom
    } catch (error) {
      console.error("Error processing audio data:", error);
      socket.emit("transcriptionError", {
        error: "Failed to process audio data",
      });
    }
  });

  // Add test transcript generator for development
  socket.on("generateTestTranscript", async (data) => {
    try {
      const { callId } = data;

      console.log("🧪 Generating test transcript for call:", callId);

      const testTranscript = {
        id: Date.now().toString(),
        speaker: "Test Speaker",
        text: "This is a test transcript entry to verify the system is working correctly.",
        confidence: 0.95,
        timestamp: new Date(),
        isFinal: true,
      };

      console.log("📡 Broadcasting test transcript:", testTranscript);

      // Broadcast to the specific call
      io.to(callId).emit("newTranscript", testTranscript);

      // Also broadcast to all clients as backup
      io.emit("newTranscript", testTranscript);
    } catch (error) {
      console.error("Error generating test transcript:", error);
    }
  });
  socket.on("meetingEvent", async (data) => {
    try {
      const { callId, event, platform, payload } = data;

      // Handle platform-specific meeting events
      console.log(
        `📹 Meeting event: ${event} on ${platform} for call ${callId}`
      );

      // Broadcast to all participants in the call
      io.to(callId).emit("meetingEvent", { event, platform, payload });
    } catch (error) {
      console.error("Error handling meeting event:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log(`👤 User disconnected: ${socket.id}`);

    // Clear processed transcripts for this call when user disconnects
    if (socket.callId) {
      const keysToRemove = Array.from(processedTranscripts).filter((key) =>
        key.startsWith(`${socket.callId}-`)
      );
      keysToRemove.forEach((key) => processedTranscripts.delete(key));
      console.log(
        `🧹 Cleared ${keysToRemove.length} processed transcripts for call ${socket.callId}`
      );
    }

    // Clean up RTMS transcription if user was in a Zoom call
    if (socket.callId && socket.platform === "zoom" && socket.meetingId) {
      zoomRTMSService
        .stopRTMSTranscription(socket.meetingId)
        .catch((error) =>
          console.error(
            "Error stopping RTMS transcription on disconnect:",
            error
          )
        );
    }
  });
});

// Handle new transcript: persist to DB, broadcast, analyze and optionally generate suggestions
async function handleNewTranscript(callId, transcriptData, socket) {
  try {
    const formattedTranscript = {
      id: transcriptData.id || Date.now().toString(),
      speaker: transcriptData.speaker || "Unknown",
      text: transcriptData.text,
      confidence:
        typeof transcriptData.confidence === "number"
          ? transcriptData.confidence
          : 0.9,
      timestamp: transcriptData.timestamp
        ? new Date(transcriptData.timestamp)
        : new Date(),
      isFinal: transcriptData.isFinal !== false,
      startTime: transcriptData.startTime,
      endTime: transcriptData.endTime,
      words: transcriptData.words,
      raw: transcriptData.raw,
    };

    // Persist transcript to DB
    try {
      const Transcript = (await import("./models/Transcript.js")).default;
      const Call = (await import("./models/Call.js")).default;

      // Resolve call document if possible (support meetingId fallback)
      let callDoc = null;
      if (callId) {
        // Try as ObjectId first
        try {
          callDoc = await Call.findById(callId).catch(() => null);
        } catch (e) {
          callDoc = null;
        }
        if (!callDoc) {
          try {
            callDoc = await Call.findOne({ meetingId: callId }).catch(
              () => null
            );
          } catch (e) {
            callDoc = null;
          }
        }
      }

      const payload = {
        call: callId,
        speaker: formattedTranscript.speaker,
        text: formattedTranscript.text || "",
        confidence: formattedTranscript.confidence ?? 0,
        timestamp: formattedTranscript.timestamp,
        isFinal: formattedTranscript.isFinal,
        startTime: formattedTranscript.startTime,
        endTime: formattedTranscript.endTime,
        // Normalize words: prefer provided structured words; fall back to splitting text
        words: formattedTranscript.words || [],

        raw: formattedTranscript.raw,
      };

      const saved = await Transcript.create(payload);

      // Update Call metadata if call found
      if (callDoc) {
        callDoc.lastActivity = payload.timestamp;
        callDoc.transcriptCount = (callDoc.transcriptCount || 0) + 1;
        if (!callDoc.status || callDoc.status === "pending")
          callDoc.status = "in_progress";
        await callDoc.save().catch(() => {});
      }

      // Replace id with saved _id for clients
      formattedTranscript._id = saved._id;
    } catch (dbErr) {
      console.error("Error saving transcript to DB:", dbErr);
    }

    // Broadcast transcript to all clients in the call room
    io.to(callId).emit("newTranscript", formattedTranscript);
    // Backup broadcast
    io.emit("newTranscript", formattedTranscript);

    // Add to transcript analyzer for AI suggestions
    transcriptAnalyzer.addTranscript(transcriptData);

    // Generate simple AI response for EVERY transcript (with deduplication)
    if (transcriptData.text) {
      // Create a unique key for this transcript to prevent duplicates
      const transcriptKey = `${callId}-${transcriptData.text}-${transcriptData.timestamp}`;

      if (processedTranscripts.has(transcriptKey)) {
        return;
      }

      // Mark this transcript as processed
      processedTranscripts.add(transcriptKey);

      // Clean up old entries (keep only last 100)
      if (processedTranscripts.size > 100) {
        const entries = Array.from(processedTranscripts);
        processedTranscripts.clear();
        entries.slice(-50).forEach((key) => processedTranscripts.add(key));
      }

      try {
        // Simple AI response generation
        const aiResponse = await generateSimpleAIResponse(transcriptData.text);

        if (aiResponse) {
          // Create simple suggestion object
          const simpleSuggestion = {
            id: Date.now().toString(),
            type: "general",
            text: aiResponse,
            confidence: 0.8,
            reasoning: `Response to: "${transcriptData.text.substring(
              0,
              50
            )}..."`,
            priority: "medium",
            customerSentiment: "neutral",
            used: false,
            timestamp: new Date(),
            trigger: "transcript_received",
            context: transcriptData.text,
            model: "gpt-4o-mini",
          };

          // Broadcast to the specific call
          io.to(callId).emit("newSuggestion", simpleSuggestion);
          io.emit("newSuggestion", simpleSuggestion);
        }
      } catch (error) {
        console.error("❌ Error generating simple AI response:", error);
      }
    }
  } catch (error) {
    console.error("Error handling new transcript:", error);
    if (socket) {
      socket.emit("transcriptionError", {
        error: "Failed to process transcript",
      });
    }
  }
}

// Set up RTMS transcript handler to follow same flow as existing transcription
zoomRTMSService.onTranscript(async (transcriptData) => {
  try {
    // Convert text to string if it's a Buffer
    const textData = Buffer.isBuffer(transcriptData.text)
      ? transcriptData.text.toString("utf8")
      : transcriptData.text;

    const callId = globalCallId;

    // Ensure text is properly converted before processing
    const processedTranscriptData = {
      ...transcriptData,
      text: textData,
    };

    // Delegate to unified handler which will persist, broadcast and analyze
    await handleNewTranscript(callId, processedTranscriptData);
  } catch (error) {
    console.error("❌ Error handling RTMS transcript:", error);
  }
});

// Generate AI suggestion based on transcript analysis
async function generateAISuggestion(callId, suggestionTrigger) {
  try {
    console.log(
      `🤖 Generating AI suggestion using GPT-4o-mini for call ${callId} - Trigger: ${suggestionTrigger.trigger}`
    );
    console.log(`📝 Context: "${suggestionTrigger.context}"`);

    // Mark that we're generating a suggestion to prevent duplicates
    transcriptAnalyzer.markSuggestionGenerated();

    // Generate AI suggestion using OpenAI GPT-4o-mini
    console.log(
      `🔄 Calling generateSalesAISuggestion with context: "${suggestionTrigger.context}"`
    );
    const suggestion = await generateSalesAISuggestion(
      suggestionTrigger.context,
      suggestionTrigger.trigger
    );
    console.log(`🔄 generateSalesAISuggestion returned:`, suggestion);

    if (!suggestion) {
      console.log("⚠️ No suggestion generated, creating fallback suggestion");
      // Create a fallback suggestion if AI fails
      suggestion = {
        type: "general",
        text: "I'm analyzing the conversation to provide sales guidance. Please continue sharing your thoughts.",
        reasoning: "Fallback response when AI suggestion generation fails",
        priority: "medium",
        confidence: 0.5,
        customer_sentiment: "neutral",
      };
    }

    // Try to persist suggestion to DB and attach to call if possible
    try {
      const AISuggestion = (await import("./models/AISuggestion.js")).default;
      const Call = (await import("./models/Call.js")).default;

      // Resolve call document if possible (support meetingId fallback)
      let callDoc = null;
      if (callId) {
        try {
          callDoc = await Call.findById(callId).catch(() => null);
        } catch (e) {
          callDoc = null;
        }
        if (!callDoc) {
          try {
            callDoc = await Call.findOne({ meetingId: callId }).catch(
              () => null
            );
          } catch (e) {
            callDoc = null;
          }
        }
      }

      // Derive userId from callDoc if available
      const userId = callDoc && callDoc.user ? String(callDoc.user) : "UserID";

      if (!userId) {
        console.warn(
          `No user found for call ${callId}. Skipping DB persist for suggestion.`
        );
        // Fallback: broadcast ephemeral suggestion
        const ephemeral = {
          id: Date.now().toString(),
          type: suggestion.type || "general",
          text: suggestion.text,
          confidence: suggestion.confidence || 0.8,
          reasoning: suggestion.reasoning,
          priority: suggestion.priority || "medium",
          customerSentiment: suggestion.customer_sentiment,
          used: false,
          timestamp: new Date(),
          trigger: suggestionTrigger.trigger,
          context: (suggestionTrigger.context || "").substring(0, 200) + "...",
          model: "gpt-4o-mini",
        };

        console.log(
          `📡 Broadcasting ephemeral AI suggestion to call ${callId}:`,
          ephemeral
        );
        io.to(callId).emit("newSuggestion", ephemeral);
        io.emit("newSuggestion", ephemeral);
        return;
      }

      // Ensure suggestion.type maps to allowed enum values expected by AISuggestion model
      const allowedTypes = [
        "objection_handling",
        "closing",
        "question",
        "pricing",
        "feature_highlight",
        "rapport_building",
        "next_steps",
        "follow_up",
      ];

      let sugType = suggestion.type;
      if (!sugType || !allowedTypes.includes(sugType)) {
        // Map common external types to internal enums
        if (sugType === "meeting_summary" || sugType === "summary") {
          sugType = "follow_up";
        } else {
          sugType = "follow_up";
        }
      }

      // Validate conversationPhase
      const allowedPhases = [
        "opening",
        "discovery",
        "presentation",
        "objection",
        "closing",
        "follow_up",
      ];

      const conversationPhase = suggestionTrigger.conversationPhase;
      const validConversationPhase = allowedPhases.includes(conversationPhase)
        ? conversationPhase
        : undefined;

      // Build DB payload
      const payload = {
        call: callId,
        user: userId,
        type: sugType,
        text: suggestion.text,
        confidence: suggestion.confidence ?? 0.8,
        reasoning: suggestion.reasoning,
        priority: suggestion.priority || "medium",
        context: (
          suggestionTrigger.context ||
          suggestion.context ||
          ""
        ).substring(0, 2000),
        triggerContext: {
          lastTranscripts: Array.isArray(suggestionTrigger.context)
            ? suggestionTrigger.context.slice(-3)
            : [],
          // only include if valid
          ...(validConversationPhase
            ? { conversationPhase: validConversationPhase }
            : {}),
        },
        trigger: suggestionTrigger.trigger,
        metadata: {
          modelVersion: "gpt-4o-mini",
          processingTime: null,
        },
      };

      const saved = await AISuggestion.create(payload);

      // Update call counters if attached to a call
      if (callDoc) {
        callDoc.suggestionCount = (callDoc.suggestionCount || 0) + 1;
        await callDoc.save().catch(() => {});
      }

      const broadcastObj = {
        _id: saved._id,
        type: saved.type,
        text: saved.text,
        confidence: saved.confidence,
        reasoning: saved.reasoning,
        priority: saved.priority,
        trigger: saved.trigger,
        context: saved.context,
        createdAt: saved.createdAt,
        used: saved.used,
        model: saved.metadata?.modelVersion || "gpt-4o-mini",
      };

      // Broadcast saved suggestion
      console.log(
        `📡 Broadcasting AI suggestion to call ${callId}:`,
        broadcastObj
      );
      io.to(callId).emit("newSuggestion", broadcastObj);
      io.emit("newSuggestion", broadcastObj);

      console.log(`✅ AI suggestion saved and broadcast for call ${callId}`);
    } catch (saveErr) {
      console.error("Error saving AI suggestion to DB:", saveErr);

      // Fallback broadcast with ephemeral id
      const fallback = {
        id: Date.now().toString(),
        type: suggestion.type || "general",
        text: suggestion.text,
        confidence: suggestion.confidence ?? 0.8,
        reasoning: suggestion.reasoning,
        priority: suggestion.priority || "medium",
        trigger: suggestionTrigger.trigger,
        timestamp: new Date(),
        context: (suggestionTrigger.context || "").substring(0, 200) + "...",
        model: "gpt-4o-mini",
      };
      io.to(callId).emit("newSuggestion", fallback);
      io.emit("newSuggestion", fallback);
    }
  } catch (error) {
    console.error("❌ Error generating AI suggestion:", error);
  }
}

// Generate simple AI response for any transcript
async function generateSimpleAIResponse(transcript) {
  try {
    const prompt = `You are a helpful AI sales assistant. Respond to this sales conversation in a concise, helpful way (max 50 words):

"${transcript}"

Provide a brief, actionable response:`;

    const response = await aiService.generateCompletion(prompt, {
      model: "gpt-4o-mini",
      maxTokens: 80,
      temperature: 0.7,
    });

    if (response && response.content) {
      return response.content.trim();
    }

    return null;
  } catch (error) {
    console.error("❌ Error in generateSimpleAIResponse:", error);
    return "I'm here to help with your sales conversation. Please continue.";
  }
}

// Generate sales-focused AI suggestions using OpenAI GPT-4o-mini
async function generateSalesAISuggestion(context, trigger) {
  try {
    console.log("🚀 Starting generateSalesAISuggestion with context:", context);
    const prompt = `You are an expert AI sales assistant helping during live sales calls. Your primary objective is to help convert prospects into customers through strategic, contextual guidance.

Key Focus Areas:
- CLOSING THE DEAL: Always look for opportunities to move towards a close
- OBJECTION HANDLING: Address concerns immediately with proven techniques
- VALUE PROPOSITION: Highlight benefits that resonate with the prospect's needs
- URGENCY CREATION: Create appropriate urgency without being pushy
- RAPPORT BUILDING: Strengthen relationships to build trust
- DISCOVERY: Uncover pain points and buying motivations
- PRICING STRATEGY: Guide pricing discussions to maximize value perception

Guidelines:
- Provide specific, actionable suggestions that directly impact sales outcomes
- Consider the conversation flow and timing for maximum effectiveness
- Be concise but highly impactful
- Focus on moving the sale forward at every opportunity
- Handle objections with empathy, evidence, and redirection to benefits
- Suggest strategic questions to uncover needs and buying criteria
- Recommend appropriate closing techniques based on conversation stage
- Provide pricing guidance that maximizes deal value
- Identify buying signals and suggest immediate follow-up actions
- Create urgency through scarcity, timing, or competitive pressures
- Even for short or incomplete statements, provide helpful sales guidance
- If the context is unclear, ask clarifying questions or provide general sales tips

The following was just said: "${context}"

Provide a helpful, actionable sales response (max 80 words).`;

    console.log("🔄 Calling aiService.generateCompletion...");
    console.log("🔍 aiService status:", {
      isEnabled: aiService.isEnabled,
      hasOpenAI: !!aiService.openai,
    });

    const response = await aiService.generateCompletion(prompt, {
      model: "gpt-4o-mini", // Use GPT-4o-mini for cost efficiency
      maxTokens: 120,
      temperature: 0.7,
    });

    console.log("🔍 AI Service response:", response);

    if (response && response.content) {
      // Determine suggestion type based on content
      const content = response.content.toLowerCase();
      let type = "general";
      let priority = "medium";

      if (
        content.includes("object") ||
        content.includes("concern") ||
        content.includes("worry")
      ) {
        type = "objection_handling";
        priority = "high";
      } else if (
        content.includes("close") ||
        content.includes("sign") ||
        content.includes("contract") ||
        content.includes("purchase")
      ) {
        type = "closing";
        priority = "high";
      } else if (
        content.includes("price") ||
        content.includes("cost") ||
        content.includes("budget") ||
        content.includes("money")
      ) {
        type = "pricing";
        priority = "high";
      } else if (content.includes("question") || content.includes("ask")) {
        type = "question";
        priority = "medium";
      } else if (
        content.includes("feature") ||
        content.includes("benefit") ||
        content.includes("value")
      ) {
        type = "feature_highlight";
        priority = "medium";
      } else if (
        content.includes("rapport") ||
        content.includes("relationship") ||
        content.includes("trust")
      ) {
        type = "rapport_building";
        priority = "low";
      } else if (content.includes("follow") || content.includes("next")) {
        type = "follow_up";
        priority = "medium";
      }

      return {
        type: type,
        text: response.content.trim(),
        reasoning: `Response to: "${context.substring(0, 50)}..."`,
        priority: priority,
        confidence: 0.8,
        customer_sentiment: "neutral",
      };
    }

    console.log("⚠️ No response content, returning null");
    return null;
  } catch (error) {
    console.error("❌ Error in generateSalesAISuggestion:", error);
    console.error("❌ Error details:", {
      message: error.message,
      stack: error.stack,
      context: context,
      trigger: trigger,
    });
    return null;
  }
}

// 404 handler for API routes
app.all("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handling middleware
app.use(globalErrorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await database.connect();

    // Create database indexes
    await database.createIndexes();

    // Start server
    server.listen(config.PORT, () => {
      console.log(
        `🚀 AI Sales Call Assistant Server running on port ${config.PORT}`
      );
      console.log(`📡 WebSocket server ready for real-time communication`);
      console.log(
        `🗄️  Database: ${database.connection ? "✅" : "❌"} Connected`
      );
      console.log(
        `🤖 AI Services: ${config.OPENAI_API_KEY ? "✅" : "❌"} OpenAI`
      );
      console.log(`🎤 Transcription: ✅ Zoom RTMS Only`);
      console.log(
        `📹 Zoom SDK: ${config.ZOOM_SDK_KEY ? "✅" : "❌"} Configured`
      );
      console.log(
        `📱 Google Meet: ${config.GOOGLE_CLIENT_ID ? "✅" : "❌"} Configured`
      );
      console.log(`🌍 Environment: ${config.NODE_ENV}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  console.log("🔄 SIGTERM received. Shutting down gracefully...");
  server.close(async () => {
    await database.disconnect();
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  console.log("🔄 SIGINT received. Shutting down gracefully...");
  server.close(async () => {
    await database.disconnect();
    process.exit(0);
  });
});

// Start the server
startServer();

export default app;
