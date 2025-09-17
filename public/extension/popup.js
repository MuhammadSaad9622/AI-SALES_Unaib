// Configuration object (inline to avoid import issues)
const CONFIG = {
  API: {
    BASE_URL: 'https://ai-sales-unaib.onrender.com',
    ENDPOINTS: {
      AUTH: '/api/auth',
      LOGIN: '/api/auth/login',
      REGISTER: '/api/auth/register',
      PROFILE: '/api/auth/profile',
      MEETINGS: '/api/meetings',
      CALLS: '/api/calls',
      ANALYTICS: '/api/analytics',
      AI: '/api/ai',
      DOCUMENTS: '/api/documents',
      USER: '/api/auth/profile'
    }
  },
  DASHBOARD: {
    BASE_URL: 'https://ai-sales-unaib.onrender.com',
    ROUTES: {
      HOME: '/',
      SESSIONS: '/sessions',
      ANALYTICS: '/analytics',
      SETTINGS: '/settings',
      CALLS: '/calls',
      MEETINGS: '/meetings'
    }
  },
  SETTINGS: {
    STORAGE_KEYS: {
      TRANSCRIPTION: 'isTranscribing',
      SUGGESTIONS: 'isSuggestionsEnabled',
      USER_DATA: 'userData',
      MEETING_DATA: 'meetingData',
      AUTH_TOKEN: 'authToken'
    },
    DEFAULT_THEME: 'light',
    REFRESH_INTERVAL: 5000
  },
  PLATFORMS: {
    ZOOM: 'Zoom',
    GOOGLE_MEET: 'Google Meet',
    MICROSOFT_TEAMS: 'Microsoft Teams'
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const transcriptionToggle = document.getElementById('transcription-toggle');
  const suggestionsToggle = document.getElementById('suggestions-toggle');
  const meetingInfo = document.getElementById('meeting-info');
  const viewDashboardBtn = document.getElementById('view-dashboard');
  const sessionHistoryBtn = document.getElementById('session-history');
  const userInfoElement = document.getElementById('user-info');
  const statusIndicator = document.getElementById('status-indicator');
  
  // Authentication elements
  const authSection = document.getElementById('auth-section');
  const mainContent = document.getElementById('main-content');
  const loginForm = document.getElementById('login-form');
  const registrationForm = document.getElementById('registration-form');
  const registerLink = document.getElementById('register-link');
  const loginLink = document.getElementById('login-link');
  const logoutBtn = document.getElementById('logout-btn');
  const userNameElement = document.getElementById('user-name');
  const userInitialsElement = document.getElementById('user-initials');
  const statusMessage = document.getElementById('status-message');
  
  let isTranscribing = false;
  let isSuggestionsEnabled = true;
  let currentMeeting = null;
  let userData = null;
  let authToken = null;
  
  // Initialize the popup
  initializePopup();
  
  function initializePopup() {
    // Load settings from storage
    chrome.storage.local.get([
      CONFIG.SETTINGS.STORAGE_KEYS.TRANSCRIPTION, 
      CONFIG.SETTINGS.STORAGE_KEYS.SUGGESTIONS,
      CONFIG.SETTINGS.STORAGE_KEYS.USER_DATA,
      CONFIG.SETTINGS.STORAGE_KEYS.MEETING_DATA,
      CONFIG.SETTINGS.STORAGE_KEYS.AUTH_TOKEN
    ], (data) => {
      isTranscribing = data[CONFIG.SETTINGS.STORAGE_KEYS.TRANSCRIPTION] || false;
      isSuggestionsEnabled = data[CONFIG.SETTINGS.STORAGE_KEYS.SUGGESTIONS] !== false;
      userData = data[CONFIG.SETTINGS.STORAGE_KEYS.USER_DATA] || null;
      currentMeeting = data[CONFIG.SETTINGS.STORAGE_KEYS.MEETING_DATA] || null;
      authToken = data[CONFIG.SETTINGS.STORAGE_KEYS.AUTH_TOKEN] || null;
      
      console.log('Popup initialized with auth token:', !!authToken);
      
      // Check authentication status
      if (authToken && userData) {
        showMainContent();
      } else {
        showAuthSection();
      }
      
      updateUI();
      setupEventListeners();
      getMeetingStatus();
    });
  }
  
  function showAuthSection() {
    authSection.style.display = 'block';
    mainContent.style.display = 'none';
    statusMessage.textContent = 'Please sign in to get started';
  }
  
  function showMainContent() {
    authSection.style.display = 'none';
    mainContent.style.display = 'block';
    
    if (userData) {
      userInfoElement.style.display = 'flex';
      userNameElement.textContent = userData.name || userData.email || 'User';
      const initials = (userData.name || userData.email || 'U').substring(0, 2).toUpperCase();
      userInitialsElement.textContent = initials;
      statusMessage.textContent = 'Ready to assist with your meetings';
    }
  }
  
  function setupEventListeners() {
    // Authentication event listeners
    if (loginForm) {
      loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registrationForm) {
      registrationForm.addEventListener('submit', handleRegister);
    }
    
    if (registerLink) {
      registerLink.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('.auth-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'block';
      });
    }
    
    if (loginLink) {
      loginLink.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('.auth-form').style.display = 'block';
        document.getElementById('register-form').style.display = 'none';
      });
    }
    
    if (logoutBtn) {
      logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Toggle transcription
    if (transcriptionToggle) {
      transcriptionToggle.addEventListener('change', () => {
        isTranscribing = transcriptionToggle.checked;
        chrome.runtime.sendMessage({
          type: isTranscribing ? 'START_TRANSCRIPTION' : 'STOP_TRANSCRIPTION'
        });
        
        chrome.storage.local.set({ 
          [CONFIG.SETTINGS.STORAGE_KEYS.TRANSCRIPTION]: isTranscribing 
        });
        
        updateStatusIndicator();
      });
    }
    
    // Toggle suggestions
    suggestionsToggle.addEventListener('change', () => {
      isSuggestionsEnabled = suggestionsToggle.checked;
      chrome.runtime.sendMessage({
        type: 'TOGGLE_SUGGESTIONS',
        enabled: isSuggestionsEnabled
      });
      
      chrome.storage.sync.set({ 
        [CONFIG.SETTINGS.STORAGE_KEYS.SUGGESTIONS]: isSuggestionsEnabled 
      });
    });
    
    // View dashboard
    viewDashboardBtn.addEventListener('click', () => {
      if (userData?.dashboardId) {
        chrome.tabs.create({
          url: `${CONFIG.DASHBOARD.BASE_URL}${CONFIG.DASHBOARD.ROUTES.HOME}/${userData.dashboardId}`
        });
      } else {
        showToast('Please sign in to access your dashboard', 'warning');
      }
    });
    
    // View session history
    sessionHistoryBtn.addEventListener('click', () => {
      if (userData?.dashboardId) {
        chrome.tabs.create({
          url: `${CONFIG.DASHBOARD.BASE_URL}${CONFIG.DASHBOARD.ROUTES.SESSIONS}/${userData.dashboardId}`
        });
      } else {
        showToast('Please sign in to view session history', 'warning');
      }
    });
    
    // Handle messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'UPDATE_MEETING_STATUS') {
        currentMeeting = request.meeting;
        updateMeetingInfo();
      } else if (request.type === 'UPDATE_USER_DATA') {
        userData = request.userData;
        updateUserInfo();
      } else if (request.type === 'UPDATE_TRANSCRIPTION_STATUS') {
        isTranscribing = request.isTranscribing;
        transcriptionToggle.checked = isTranscribing;
        updateStatusIndicator();
      } else if (request.type === 'UPDATE_SUGGESTIONS_STATUS') {
        isSuggestionsEnabled = request.isSuggestionsEnabled;
        suggestionsToggle.checked = isSuggestionsEnabled;
      }
    });
  }
  
  function getMeetingStatus() {
    chrome.runtime.sendMessage({ type: 'GET_MEETING_STATUS' }, (response) => {
      if (response) {
        currentMeeting = response.currentMeeting;
        isTranscribing = response.isTranscribing;
        isSuggestionsEnabled = response.isSuggestionsEnabled;
        
        updateUI();
      }
    });
  }
  
  function updateUI() {
    transcriptionToggle.checked = isTranscribing;
    suggestionsToggle.checked = isSuggestionsEnabled;
    updateMeetingInfo();
    updateUserInfo();
    updateStatusIndicator();
  }
  
  function updateMeetingInfo() {
    console.log('Updating meeting info...');
    
    // First check current tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        console.log('Current tab URL:', tabs[0].url);
        
        // Check if current tab is a meeting
        const url = tabs[0].url.toLowerCase();
        let currentPlatform = null;
        if (url.includes('meet.google.com')) currentPlatform = 'Google Meet';
        else if (url.includes('zoom.us') || url.includes('zoom.com')) currentPlatform = 'Zoom';
        else if (url.includes('teams.microsoft.com') || url.includes('teams.live.com')) currentPlatform = 'Microsoft Teams';
        
        console.log('Detected platform from URL:', currentPlatform);
        
        // Also get meeting status from background
        chrome.runtime.sendMessage({ type: 'GET_MEETING_STATUS' }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Error getting meeting status:', chrome.runtime.lastError);
            return;
          }
          
          console.log('Meeting status response:', response);
          
          const meetingInfo = document.getElementById('meeting-info');
          
          // Use current platform if background doesn't have meeting data
          const meeting = response.currentMeeting || (currentPlatform ? {
            platform: currentPlatform,
            startTime: new Date().toISOString(),
            url: tabs[0].url
          } : null);
          
          if (meeting) {
            const duration = meeting.startTime ? 
              Math.floor((Date.now() - new Date(meeting.startTime).getTime()) / 1000) : 0;
            
            const platformIcon = getPlatformIcon(meeting.platform);
            
            meetingInfo.innerHTML = `
              <div class="meeting-platform">
                <span class="platform-icon">${platformIcon}</span>
                ${meeting.platform}
              </div>
              <div class="meeting-details">
                <p><strong>Duration:</strong> ${formatDuration(duration)}</p>
                <p><strong>Status:</strong> <span class="status-active">Active</span></p>
                ${!response.currentMeeting ? '<p class="meeting-tip">Meeting detected but not initialized. Try refreshing the page.</p>' : ''}
              </div>
            `;
          } else {
            meetingInfo.innerHTML = `
              <div class="empty-meeting">
                <p>No active meeting detected</p>
                <p class="meeting-tip">Join a meeting on Google Meet, Zoom, or Microsoft Teams to get started.</p>
              </div>
            `;
          }
        });
      }
    });
  }
  
  function updateUserInfo() {
    if (userData && userInfoElement) {
      userInfoElement.innerHTML = `
        <div class="user-avatar">
          <img src="${userData.avatarUrl || 'icons/default-avatar.svg'}" alt="${userData.name || 'User'}">
        </div>
        <div class="user-details">
          <p class="user-name">${userData.name || 'Guest User'}</p>
          <p class="user-email">${userData.email || ''}</p>
        </div>
      `;
    } else if (userInfoElement) {
      userInfoElement.innerHTML = `
        <div class="user-avatar">
          <img src="icons/default-avatar.svg" alt="Guest">
        </div>
        <div class="user-details">
          <p class="user-name">Guest User</p>
          <p class="user-email">Sign in to access all features</p>
        </div>
      `;
    }
  }
  
  function updateStatusIndicator() {
    if (statusIndicator) {
      statusIndicator.className = isTranscribing ? 'status-indicator active' : 'status-indicator';
      statusIndicator.title = isTranscribing ? 'AI Assistant is active' : 'AI Assistant is inactive';
    }
  }
  
  function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
  
  function getPlatformIcon(platform) {
    const platformLower = platform.toLowerCase();
    if (platformLower.includes('google') || platformLower.includes('meet')) {
      return '🟢';
    } else if (platformLower.includes('zoom')) {
      return '🔵';
    } else if (platformLower.includes('teams') || platformLower.includes('microsoft')) {
      return '🟣';
    } else {
      return '🎥';
    }
  }
  
  // Authentication functions
  async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
      showToast('Please fill in all fields', 'error');
      return;
    }
    
    try {
      statusMessage.textContent = 'Signing in...';
      
      const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.LOGIN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (response.ok && data.token) {
        // Store authentication data
        authToken = data.token;
        userData = data.user || { email, name: data.name };
        
        await chrome.storage.local.set({
          [CONFIG.SETTINGS.STORAGE_KEYS.AUTH_TOKEN]: authToken,
          [CONFIG.SETTINGS.STORAGE_KEYS.USER_DATA]: userData
        });
        
        showToast('Successfully signed in!', 'success');
        showMainContent();
        
        // Clear form
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';
        
      } else {
        throw new Error(data.message || 'Login failed');
      }
      
    } catch (error) {
      console.error('Login error:', error);
      showToast(error.message || 'Login failed. Please try again.', 'error');
      statusMessage.textContent = 'Please sign in to get started';
    }
  }
  
  async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    
    if (!name || !email || !password) {
      showToast('Please fill in all fields', 'error');
      return;
    }
    
    try {
      statusMessage.textContent = 'Creating account...';
      
      const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.REGISTER}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password })
      });
      
      const data = await response.json();
      
      if (response.ok && data.token) {
        // Store authentication data
        authToken = data.token;
        userData = data.user || { email, name };
        
        await chrome.storage.local.set({
          [CONFIG.SETTINGS.STORAGE_KEYS.AUTH_TOKEN]: authToken,
          [CONFIG.SETTINGS.STORAGE_KEYS.USER_DATA]: userData
        });
        
        showToast('Account created successfully!', 'success');
        showMainContent();
        
        // Clear form
        document.getElementById('reg-name').value = '';
        document.getElementById('reg-email').value = '';
        document.getElementById('reg-password').value = '';
        
      } else {
        throw new Error(data.message || 'Registration failed');
      }
      
    } catch (error) {
      console.error('Registration error:', error);
      showToast(error.message || 'Registration failed. Please try again.', 'error');
      statusMessage.textContent = 'Please sign in to get started';
    }
  }
  
  async function handleLogout() {
    try {
      // Clear stored data
      await chrome.storage.local.remove([
        CONFIG.SETTINGS.STORAGE_KEYS.AUTH_TOKEN,
        CONFIG.SETTINGS.STORAGE_KEYS.USER_DATA
      ]);
      
      authToken = null;
      userData = null;
      
      showToast('Successfully signed out', 'success');
      showAuthSection();
      
    } catch (error) {
      console.error('Logout error:', error);
      showToast('Error signing out', 'error');
    }
  }
  
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 4px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;
    
    if (type === 'error') {
      toast.style.backgroundColor = '#f44336';
    } else if (type === 'success') {
      toast.style.backgroundColor = '#4caf50';
    } else {
      toast.style.backgroundColor = '#2196f3';
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
});