import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

// Get current file path (ES modules equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Validate required environment variables
const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET'
];

// Optional environment variables
const optionalEnvVars = [
  'OPENAI_API_KEY',
  'ASSEMBLYAI_API_KEY',
  'DEEPGRAM_API_KEY',
  'ZOOM_CLIENT_ID',
  'ZOOM_CLIENT_SECRET',
  'ZOOM_SDK_KEY',
  'ZOOM_SDK_SECRET',
  'GOOGLE_CLIENT_ID',
  'TRANSCRIPTION_MODEL' // Added transcription model as optional
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please check your .env file and ensure all required variables are set.');
  process.exit(1);
}

// Log warning for missing optional variables
const missingOptionalVars = optionalEnvVars.filter(envVar => !process.env[envVar]);
if (missingOptionalVars.length > 0) {
  console.warn('⚠️ Missing optional environment variables:', missingOptionalVars.join(', '));
  console.warn('Some features may be limited or unavailable.');
}

export default {
  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Server Configuration
  PORT: parseInt(process.env.PORT) || 3002, // Changed from default 5000 to avoid port conflicts
  
  // Database Configuration
  MONGODB_URI: process.env.MONGODB_URI,
  MONGODB_TEST_URI: process.env.MONGODB_TEST_URI || process.env.MONGODB_URI + '_test',
  
  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  
  // OpenAI Configuration
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
  
  // AssemblyAI Configuration
  ASSEMBLYAI_API_KEY: process.env.ASSEMBLYAI_API_KEY,
  
  // Deepgram Configuration
  DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY,
  DEEPGRAM_MODEL: process.env.DEEPGRAM_MODEL || 'nova-2',
  DEEPGRAM_LANGUAGE: process.env.DEEPGRAM_LANGUAGE || 'en-US',
  
  // Zoom Configuration
  ZOOM_CLIENT_ID: process.env.ZOOM_CLIENT_ID,
  ZOOM_CLIENT_SECRET: process.env.ZOOM_CLIENT_SECRET,
  ZOOM_SDK_KEY: process.env.ZOOM_SDK_KEY || process.env.ZOOM_CLIENT_ID,
  ZOOM_SDK_SECRET: process.env.ZOOM_SDK_SECRET || process.env.ZOOM_CLIENT_SECRET,
  ZOOM_WEBHOOK_SECRET: process.env.ZOOM_WEBHOOK_SECRET,
  
  // Google Meet Configuration
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  
  // File Storage Configuration
  UPLOAD_PATH: process.env.UPLOAD_PATH || path.join(process.cwd(), 'server', 'uploads'),
  MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || '10MB',
  
  // AI Configuration
  AI_SUGGESTION_INTERVAL: parseInt(process.env.AI_SUGGESTION_INTERVAL) || 30000,
  TRANSCRIPTION_LANGUAGE: process.env.TRANSCRIPTION_LANGUAGE || 'en-US',
  AI_CONFIDENCE_THRESHOLD: parseFloat(process.env.AI_CONFIDENCE_THRESHOLD) || 0.8,
  TRANSCRIPTION_MODEL: process.env.TRANSCRIPTION_MODEL || 'deepgram', // Default to Deepgram
  TRANSCRIPTION_PROVIDER: process.env.TRANSCRIPTION_PROVIDER || 'deepgram', // deepgram, assemblyai, openai
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute for dev
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10000, // very high for dev
  
  // Security
  BCRYPT_ROUNDS: 12,
  
  // CORS Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  
  // Email Configuration
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Feature Flags
  FEATURES: {
    REAL_TIME_TRANSCRIPTION: process.env.FEATURE_REAL_TIME_TRANSCRIPTION !== 'false',
    AI_SUGGESTIONS: process.env.FEATURE_AI_SUGGESTIONS !== 'false',
    DOCUMENT_PROCESSING: process.env.FEATURE_DOCUMENT_PROCESSING !== 'false',
    ANALYTICS: process.env.FEATURE_ANALYTICS !== 'false'
  }
};