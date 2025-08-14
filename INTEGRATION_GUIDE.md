# AI Sales Assistant - Integration Guide

## Overview

This guide explains how the AI Sales Assistant integrates Zoom video calls with Deepgram speech-to-text transcription and OpenAI-powered real-time AI suggestions.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   External APIs │
│   (React)       │    │   (Node.js)     │    │                 │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Call Interface│◄──►│ • WebSocket     │◄──►│ • Zoom SDK      │
│ • Zoom Integration│  │ • Transcription │    │ • Deepgram API  │
│ • AI Suggestions│    │ • AI Service    │◄──►│ • OpenAI API    │
│ • Transcript    │    │ • Database      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Key Features

### 1. Zoom Integration
- **Real-time meeting creation and joining**
- **Web SDK integration for seamless video calls**
- **Automatic meeting monitoring and event handling**
- **Webhook support for meeting lifecycle events**

### 2. Deepgram Speech-to-Text
- **Real-time transcription with high accuracy**
- **Speaker diarization and identification**
- **Sales-specific keyword boosting**
- **Multi-language support**

### 3. OpenAI AI Suggestions
- **Context-aware sales suggestions**
- **Real-time conversation analysis**
- **Objection handling recommendations**
- **Closing and follow-up suggestions**

## How It Works

### 1. Starting a Call

1. **User selects Zoom integration** from the dropdown
2. **Creates or joins a meeting** using the Zoom interface
3. **WebSocket connection** is established for real-time communication
4. **Deepgram transcription** starts automatically
5. **AI monitoring** begins analyzing the conversation

### 2. Real-time Processing

```
Audio Stream → Deepgram → Transcription → OpenAI → AI Suggestions → Frontend
```

1. **Audio capture** from the Zoom meeting
2. **Deepgram processes** the audio in real-time
3. **Transcription results** are sent to the server
4. **OpenAI analyzes** the conversation context
5. **AI suggestions** are generated and sent to the frontend
6. **User sees suggestions** in real-time during the call

### 3. AI Suggestion Types

- **Objection Handling**: Responses to common sales objections
- **Closing**: Techniques to close the deal
- **Questions**: Strategic questions to ask the prospect
- **Pricing**: How to discuss pricing and value
- **Feature Highlight**: When to highlight specific features
- **Rapport Building**: Ways to build relationships
- **Next Steps**: Suggestions for follow-up actions

## Setup Instructions

### 1. Environment Configuration

Create a `.env` file with the following variables:

```env
# Required
OPENAI_API_KEY=sk-your-openai-api-key
DEEPGRAM_API_KEY=your-deepgram-api-key
ZOOM_SDK_KEY=your-zoom-sdk-key
ZOOM_SDK_SECRET=your-zoom-sdk-secret

# Optional but recommended
TRANSCRIPTION_PROVIDER=deepgram
AI_SUGGESTION_INTERVAL=30000
```

### 2. API Key Setup

#### Deepgram API Key
1. Visit [Deepgram Console](https://console.deepgram.com/)
2. Create an account and project
3. Generate an API key
4. Add to your `.env` file

#### Zoom SDK Setup
1. Go to [Zoom Marketplace](https://marketplace.zoom.us/)
2. Create a "SDK App"
3. Get your SDK Key and Secret
4. Configure webhook endpoints
5. Add credentials to `.env`

#### OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Create an API key
3. Add to your `.env` file

### 3. Installation

```bash
# Install dependencies
npm install

# Start the application
npm run dev
```

## Usage Flow

### 1. Starting a Call

1. Navigate to the Call page
2. Select "Zoom" from the integration dropdown
3. Click "Create New Meeting" or enter existing meeting details
4. Join the meeting via Web SDK or Zoom app
5. AI assistance begins automatically

### 2. During the Call

- **Real-time transcription** appears in the sidebar
- **AI suggestions** are generated based on conversation context
- **Click "Use Suggestion"** to mark suggestions as used
- **Toggle panels** to show/hide transcript and suggestions

### 3. Call Analytics

- **Performance metrics** are tracked automatically
- **Suggestion effectiveness** is measured
- **Conversation insights** are available in the Analytics page

## Technical Details

### WebSocket Events

```javascript
// Client to Server
socket.emit('joinCall', { callId, userId, platform })
socket.emit('leaveCall', { callId })
socket.emit('useSuggestion', { suggestionId, callId, feedback })

// Server to Client
socket.on('newTranscript', transcriptData)
socket.on('newSuggestion', suggestionData)
socket.on('suggestionUsed', { suggestionId })
socket.on('meetingEvent', { event, platform, payload })
```

### Deepgram Configuration

```javascript
const connection = deepgram.transcription.live({
  model: 'nova-2',
  language: 'en-US',
  smart_format: true,
  punctuate: true,
  diarize: true,
  utterances: true,
  keywords: ['sales', 'product', 'pricing', 'demo', 'contract', 'budget', 'ROI'],
  boost_param: 'high'
});
```

### AI Suggestion Generation

```javascript
const suggestion = await aiService.generateSuggestion(
  callId,
  transcriptHistory,
  documentContext,
  userPreferences
);
```

## Troubleshooting

### Common Issues

1. **"Zoom SDK not loaded"**
   - Check internet connection
   - Verify Zoom SDK credentials
   - Ensure HTTPS in production

2. **"Transcription failed"**
   - Verify Deepgram API key
   - Check microphone permissions
   - Ensure stable internet connection

3. **"AI suggestions unavailable"**
   - Check OpenAI API key
   - Verify API credits
   - Check server logs for errors

4. **"WebSocket connection failed"**
   - Verify server is running
   - Check CORS settings
   - Ensure firewall allows connections

### Debug Mode

Enable debug logging:

```env
LOG_LEVEL=debug
```

Check browser console and server logs for detailed error information.

## Performance Optimization

### 1. Transcription Settings

- **Model**: Use `nova-2` for best accuracy
- **Keywords**: Add sales-specific terms for better recognition
- **Language**: Set to your primary language

### 2. AI Suggestion Frequency

- **Interval**: Adjust `AI_SUGGESTION_INTERVAL` based on call length
- **Confidence**: Set `AI_CONFIDENCE_THRESHOLD` for quality control
- **Context**: Upload relevant documents for better suggestions

### 3. Network Optimization

- **WebSocket**: Use WebSocket transport for real-time communication
- **Compression**: Enable gzip compression on server
- **CDN**: Use CDN for static assets in production

## Security Considerations

1. **API Keys**: Never expose API keys in client-side code
2. **Authentication**: Use JWT tokens for user authentication
3. **CORS**: Configure CORS properly for your domain
4. **HTTPS**: Use HTTPS in production (required for Zoom SDK)
5. **Rate Limiting**: Implement rate limiting to prevent abuse

## Production Deployment

### Requirements

- **HTTPS**: Required for Zoom SDK
- **Public Domain**: For webhook endpoints
- **Database**: MongoDB Atlas or self-hosted
- **Environment Variables**: All API keys configured

### Deployment Steps

1. **Set up environment variables** for production
2. **Configure HTTPS** certificates
3. **Set up webhook endpoints** for Zoom
4. **Deploy frontend** to CDN
5. **Deploy backend** to cloud platform
6. **Test all integrations** thoroughly

## Support

For technical support:

1. Check the troubleshooting section
2. Review server logs for errors
3. Verify API key configurations
4. Test with minimal setup first
5. Contact support with specific error messages

## Future Enhancements

- **Google Meet integration** (in progress)
- **Microsoft Teams integration**
- **Advanced analytics dashboard**
- **Custom AI model training**
- **Multi-language support**
- **Mobile app development** 