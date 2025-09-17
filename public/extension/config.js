// Configuration file for Sales AI Assistant Extension
// This file centralizes all API endpoints and configuration settings

const CONFIG = {
  // API endpoints - Using your existing server
  API: {
    BASE_URL: 'https://ai-sales-unaib.onrender.com/',  // Your server runs on port 3002
    ENDPOINTS: {
      // Authentication endpoints
      AUTH: '/api/auth',
      LOGIN: '/api/auth/login',
      REGISTER: '/api/auth/register',
      PROFILE: '/api/auth/profile',
      
      // Meeting endpoints
      MEETINGS: '/api/meetings',
      CALLS: '/api/calls',
      
      // Analytics and AI endpoints
      ANALYTICS: '/api/analytics',
      AI: '/api/ai',
      
      // Document endpoints
      DOCUMENTS: '/api/documents',
      
      // User data endpoint (using auth profile)
      USER: '/api/auth/profile'
    }
  },
  
  // Dashboard URLs - Using your existing server
  DASHBOARD: {
    BASE_URL: 'https://ai-sales-unaib.onrender.com/',
    ROUTES: {
      HOME: '/',
      SESSIONS: '/sessions',
      ANALYTICS: '/analytics',
      SETTINGS: '/settings',
      CALLS: '/calls',
      MEETINGS: '/meetings'
    }
  },
  
  // Extension settings
  SETTINGS: {
    STORAGE_KEYS: {
      TRANSCRIPTION: 'isTranscribing',
      SUGGESTIONS: 'isSuggestionsEnabled',
      USER_DATA: 'userData',
      MEETING_DATA: 'meetingData',
      AUTH_TOKEN: 'authToken'
    },
    DEFAULT_THEME: 'light',
    REFRESH_INTERVAL: 5000, // milliseconds
    
    // Server configuration
    SERVER: {
      PORT: 3002,
      HOST: 'localhost',
      PROTOCOL: 'http'
    }
  },
  
  // Meeting platforms supported
  PLATFORMS: {
    ZOOM: 'Zoom',
    GOOGLE_MEET: 'Google Meet',
    MICROSOFT_TEAMS: 'Microsoft Teams'
  },
  
  // API Keys configuration (will be loaded from environment)
  API_KEYS: {
    // These will be loaded from your server's environment variables
    // The extension will authenticate with your server using JWT tokens
    OPENAI_API_KEY: null,  // Handled by server
    ASSEMBLYAI_API_KEY: null,  // Handled by server
    ZOOM_SDK_KEY: null,  // Handled by server
    GOOGLE_CLIENT_ID: null  // Handled by server
  }
};

export default CONFIG;
