# AI Sales Assistant

A comprehensive AI-powered sales call assistant with real-time transcription, AI suggestions, and multi-platform integration.

## 🚀 Features

- **Real-time AI Suggestions**: Get intelligent sales suggestions during live calls
- **Multi-platform Support**: Zoom, Google Meet, and browser-based calls
- **Live Transcription**: Powered by Deepgram for accurate speech-to-text
- **Document Processing**: Upload and analyze sales documents
- **Analytics Dashboard**: Track call performance and insights
- **Browser Extension**: Overlay mode for seamless integration

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express, MongoDB, Socket.io
- **AI Services**: OpenAI GPT-4, Deepgram STT, AssemblyAI
- **Integrations**: Zoom SDK, Google Meet API
- **Real-time**: WebSocket communication for live features

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB (local or Atlas)
- API keys for:
  - OpenAI
  - Deepgram (recommended) or AssemblyAI
  - Zoom SDK

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd AI-SALES
npm install
```

### 2. Environment Setup

**Important**: Create the `.env` file in the `server/` directory, not the root directory.

```bash
# Navigate to server directory
cd server

# Create environment file
cp .env.example .env
# OR create manually: touch .env
```

Add your environment variables to `server/.env`:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/ai-sales-assistant

# JWT
JWT_SECRET=your-super-secret-jwt-key-here

# Server
PORT=3002
NODE_ENV=development

# AI Services
OPENAI_API_KEY=sk-your-openai-api-key-here
DEEPGRAM_API_KEY=your-deepgram-api-key-here

# Zoom SDK
ZOOM_SDK_KEY=your-zoom-sdk-key-here
ZOOM_SDK_SECRET=your-zoom-sdk-secret-here

# Frontend (Vite)
VITE_API_URL=https://ai-sales-unaib.onrender.com/
VITE_ZOOM_SDK_KEY=your-zoom-sdk-key-here

# Configuration
TRANSCRIPTION_PROVIDER=deepgram
CORS_ORIGIN=http://localhost:5173
```

### 3. Get API Keys

#### OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Create an API key
3. Add to `.env` as `OPENAI_API_KEY`

#### Deepgram API Key (Recommended)
1. Visit [Deepgram Console](https://console.deepgram.com/)
2. Create account and project
3. Generate API key
4. Add to `.env` as `DEEPGRAM_API_KEY`

#### Zoom SDK Keys
1. Visit [Zoom Marketplace](https://marketplace.zoom.us/)
2. Create "SDK App"
3. Get SDK Key and Secret
4. Add to `.env` as `ZOOM_SDK_KEY` and `ZOOM_SDK_SECRET`

### 4. Start the Application

```bash
# From the root directory
npm run dev
```

This will start both the frontend (port 5173) and backend (port 3002).

### 5. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: https://ai-sales-unaib.onrender.com/

## 📖 Usage

### Starting an AI-Assisted Call

1. Click "Active Call" in the sidebar
2. Select your preferred platform (Zoom, Google Meet, etc.)
3. Create or join a meeting
4. AI features will automatically activate:
   - Real-time transcription
   - AI suggestions based on conversation
   - Call analytics

### Document Processing

1. Go to "Documents" page
2. Upload sales documents (PDF, DOCX, TXT)
3. Documents are analyzed and used for AI suggestions

### Analytics

1. Visit "Analytics" page
2. View call performance metrics
3. Track AI suggestion effectiveness

## 🔧 Configuration

### Transcription Provider

Choose your preferred speech-to-text service:

```env
# Use Deepgram (recommended)
TRANSCRIPTION_PROVIDER=deepgram

# Or use AssemblyAI
TRANSCRIPTION_PROVIDER=assemblyai
```

### AI Suggestion Frequency

Control how often AI suggestions are generated:

```env
AI_SUGGESTION_INTERVAL=30000  # 30 seconds
```

## 🐛 Troubleshooting

### Common Issues

1. **"process is not defined" error**
   - Ensure `.env` file is in `server/` directory
   - Restart the development server
   - Check that Vite variables use `VITE_` prefix

2. **"WebSocket connection failed"**
   - Verify backend is running on port 3002
   - Check CORS settings
   - Ensure firewall allows the connection

3. **"AI suggestions unavailable"**
   - Verify OpenAI API key is correct
   - Check OpenAI account has sufficient credits

4. **"Transcription failed"**
   - Verify Deepgram/AssemblyAI API key
   - Check microphone permissions
   - Ensure stable internet connection

### Debug Mode

Enable debug logging:

```env
LOG_LEVEL=debug
VITE_ENABLE_DEBUG=true
```

## 📁 Project Structure

```
AI-SALES/
├── src/                    # Frontend React app
│   ├── components/         # React components
│   ├── pages/             # Page components
│   ├── contexts/          # React contexts
│   ├── hooks/             # Custom hooks
│   └── lib/               # Utilities and API
├── server/                # Backend Node.js app
│   ├── config/            # Configuration files
│   ├── controllers/       # Route controllers
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   └── middleware/        # Express middleware
├── public/                # Static files
└── package.json           # Dependencies and scripts
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the troubleshooting section
- Review the environment setup guide
- Open an issue on GitHub

## 🔄 Updates

Stay updated with the latest features and fixes:
- Follow the repository for updates
- Check the changelog for new features
- Review breaking changes before updating