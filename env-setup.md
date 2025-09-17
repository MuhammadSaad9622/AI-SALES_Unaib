# Quick Environment Setup

## Fix the "process is not defined" Error

The error you're seeing is because Vite uses `import.meta.env` instead of `process.env` for environment variables.

### 1. Create Environment File

Create a `.env` file in the server directory (`AI-SALES/server/.env`) with these variables:

```env
# Backend Environment Variables
MONGODB_URI=mongodb://localhost:27017/ai-sales-assistant
JWT_SECRET=your-super-secret-jwt-key-here
PORT=3002
NODE_ENV=development

# AI Services
OPENAI_API_KEY=sk-your-openai-api-key-here
DEEPGRAM_API_KEY=your-deepgram-api-key-here

# Zoom SDK
ZOOM_SDK_KEY=your-zoom-sdk-key-here
ZOOM_SDK_SECRET=your-zoom-sdk-secret-here

# Frontend Environment Variables (Vite)
VITE_API_URL=https://ai-sales-unaib.onrender.com/
VITE_ZOOM_SDK_KEY=your-zoom-sdk-key-here

# Configuration
TRANSCRIPTION_PROVIDER=deepgram
AI_SUGGESTION_INTERVAL=30000
CORS_ORIGIN=http://localhost:5173
```

### 2. Get Your API Keys

#### OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Create an API key
3. Add to `.env` as `OPENAI_API_KEY`

#### Deepgram API Key
1. Visit [Deepgram Console](https://console.deepgram.com/)
2. Create account and project
3. Generate API key
4. Add to `.env` as `DEEPGRAM_API_KEY`

#### Zoom SDK Keys
1. Visit [Zoom Marketplace](https://marketplace.zoom.us/)
2. Create "SDK App"
3. Get SDK Key and Secret
4. Add to `.env` as `ZOOM_SDK_KEY` and `ZOOM_SDK_SECRET`

### 3. Restart the Application

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

### 4. Test the Integration

1. Click "Active Call" in the sidebar
2. Select Zoom integration
3. Create or join a meeting
4. AI features should now work!

## Troubleshooting

- **Still getting "process is not defined"**: Make sure you restarted the dev server after creating `.env`
- **"API key not found"**: Check that your API keys are correctly copied to `.env`
- **"WebSocket connection failed"**: Ensure the backend server is running on port 3002

## Important Notes

- Environment variables starting with `VITE_` are available in the frontend
- Variables without `VITE_` prefix are only available in the backend
- Never commit your `.env` file to version control
- The `.env` file should be in the server directory (`AI-SALES/server/.env`) 