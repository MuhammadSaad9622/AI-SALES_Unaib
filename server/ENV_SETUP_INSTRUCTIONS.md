# Environment Setup Instructions

## Required Environment Variables

Create a `.env` file in the server directory with the following variables:

### Database Configuration
```env
MONGODB_URI=mongodb://localhost:27017/ai-sales-assistant
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai-sales-assistant
```

### JWT Configuration
```env
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d
```

### Server Configuration
```env
PORT=3002
NODE_ENV=development
```

### AI Services Configuration

#### OpenAI (Required for AI Suggestions)
```env
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4-turbo-preview
```

#### Deepgram (Recommended for Speech-to-Text)
```env
DEEPGRAM_API_KEY=your-deepgram-api-key-here
DEEPGRAM_MODEL=nova-2
DEEPGRAM_LANGUAGE=en-US
```

#### AssemblyAI (Alternative Speech-to-Text)
```env
ASSEMBLYAI_API_KEY=your-assemblyai-api-key-here
```

### Transcription Configuration
```env
TRANSCRIPTION_PROVIDER=deepgram
TRANSCRIPTION_MODEL=deepgram
TRANSCRIPTION_LANGUAGE=en-US
AI_CONFIDENCE_THRESHOLD=0.8
AI_SUGGESTION_INTERVAL=30000
```

### Zoom SDK Configuration
```env
ZOOM_SDK_KEY=your-zoom-sdk-key-here
ZOOM_SDK_SECRET=your-zoom-sdk-secret-here
ZOOM_WEBHOOK_SECRET=your-zoom-webhook-secret-here
```

### Google Meet Configuration
```env
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
```

### Frontend Configuration (Vite Environment Variables)
```env
# API Configuration
VITE_API_URL=https://ai-sales-unaib.onrender.com

# Zoom SDK Configuration
VITE_ZOOM_SDK_KEY=your-zoom-sdk-key-here

# Feature Flags
VITE_ENABLE_DEBUG=false
VITE_ENABLE_ANALYTICS=true
```

### Security & Performance
```env
CORS_ORIGIN=http://localhost:5173
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10000
```

## API Key Setup Instructions

### 1. OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Create an account or sign in
3. Go to API Keys section
4. Create a new API key
5. Copy the key and add to your `.env` file

### 2. Deepgram API Key (Recommended)
1. Visit [Deepgram Console](https://console.deepgram.com/)
2. Create an account or sign in
3. Create a new project
4. Generate an API key
5. Copy the key and add to your `.env` file

### 3. Zoom SDK Setup
1. Go to [Zoom Marketplace](https://marketplace.zoom.us/)
2. Sign in with your Zoom account
3. Click "Develop" → "Build App"
4. Choose "SDK App" type
5. Fill in app information
6. Get your SDK Key and Secret
7. Add webhook endpoint: `http://your-domain.com/api/meetings/zoom/webhook`
8. Add credentials to your `.env` file

### 4. Google Meet Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `https://ai-sales-unaib.onrender.com/api/meetings/google/callback`
6. Add credentials to your `.env` file

## Installation Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set up Environment Variables**
   - Copy the example above
   - Fill in your actual API keys
   - Save as `.env` in the server directory

3. **Start the Application**
   ```bash
   npm run dev
   ```

## Feature Configuration

### Transcription Provider Selection
The application supports multiple transcription providers:

- **Deepgram** (Recommended): Best accuracy and real-time performance
- **AssemblyAI**: Good accuracy with additional features
- **OpenAI Whisper**: Fallback option

Set `TRANSCRIPTION_PROVIDER=deepgram` in your `.env` file to use Deepgram.

### AI Suggestion Frequency
Control how often AI suggestions are generated:
```env
AI_SUGGESTION_INTERVAL=30000  # 30 seconds
```

### Confidence Threshold
Set the minimum confidence for AI suggestions:
```env
AI_CONFIDENCE_THRESHOLD=0.8  # 80% confidence
```

## Troubleshooting

### Common Issues

1. **"AI suggestions unavailable"**
   - Check your OpenAI API key is correct
   - Ensure you have sufficient OpenAI credits

2. **"Transcription failed"**
   - Verify your Deepgram API key
   - Check your internet connection
   - Ensure microphone permissions are granted

3. **"Zoom SDK not loaded"**
   - Check your Zoom SDK credentials
   - Ensure you're using HTTPS in production
   - Verify webhook endpoints are accessible

4. **"WebSocket connection failed"**
   - Check if the server is running on port 3002
   - Verify CORS settings
   - Check firewall settings

5. **"process is not defined" error**
   - Ensure you're using `VITE_` prefix for frontend environment variables
   - Check that `.env` file is in the server directory
   - Restart the development server after changing environment variables

### Debug Mode
Enable debug logging by setting:
```env
LOG_LEVEL=debug
VITE_ENABLE_DEBUG=true
```

## Production Deployment

For production deployment, ensure:

1. **HTTPS is enabled** (required for Zoom SDK)
2. **Environment variables are properly set**
3. **Database is accessible**
4. **Webhook endpoints are publicly accessible**
5. **Rate limiting is configured appropriately**

### Example Production .env
```env
NODE_ENV=production
PORT=3002
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai-sales-assistant
JWT_SECRET=your-production-jwt-secret
OPENAI_API_KEY=sk-your-openai-api-key
DEEPGRAM_API_KEY=your-deepgram-api-key
ZOOM_SDK_KEY=your-zoom-sdk-key
ZOOM_SDK_SECRET=your-zoom-sdk-secret
CORS_ORIGIN=https://yourdomain.com
VITE_API_URL=https://yourdomain.com
VITE_ZOOM_SDK_KEY=your-zoom-sdk-key
```

## File Location

**Important**: The `.env` file should be placed in the `server/` directory, not the root directory. This is where the backend server runs and where it will look for environment variables.
