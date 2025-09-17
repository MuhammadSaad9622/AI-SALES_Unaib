// Content script that runs in meeting pages
let currentMeetingPlatform = null;
let meetingData = null;
let panelVisible = false;
let transcript = '';
let audioContext = null;
let processor = null;
let mediaStream = null;
let audioChunks = [];
let transcriptionInterval = null;

// Detect meeting platform from URL
function detectMeetingPlatform() {
  const url = window.location.href;
  if (url.includes('meet.google.com')) return 'Google Meet';
  if (url.includes('zoom.us') || url.includes('zoom.com')) return 'Zoom';
  if (url.includes('teams.microsoft.com')) return 'Microsoft Teams';
  return null;
}

// Initialize the extension on page load
function initializeExtension() {
  currentMeetingPlatform = detectMeetingPlatform();
  console.log('Content script initialized. Platform detected:', currentMeetingPlatform);
  
  if (currentMeetingPlatform) {
    // Inject the AI suggestions panel
    injectPanel();
    
    // Notify background script
    chrome.runtime.sendMessage({
      type: 'MEETING_DETECTED_FROM_CONTENT',
      platform: currentMeetingPlatform,
      url: window.location.href
    });
  }
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}

// Inject the panel UI into the page
function injectPanel() {
  console.log('=== injectPanel called ===');
  
  // Check if panel already exists
  if (document.getElementById('sales-ai-panel-container')) {
    console.log('Panel already exists, skipping injection');
    return;
  }
  
  console.log('Creating AI suggestions panel...');
  
  // Create panel container
  const panelContainer = document.createElement('div');
  panelContainer.id = 'sales-ai-panel-container';
  panelContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 350px;
    height: 500px;
    z-index: 10000;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    overflow: hidden;
    background: white;
  `;
  
  // First, inject the CSS
  const cssUrl = chrome.runtime.getURL('panel/panel.css');
  const cssLink = document.createElement('link');
  cssLink.rel = 'stylesheet';
  cssLink.href = cssUrl;
  cssLink.onerror = () => {
    console.error('Failed to load panel CSS from:', cssUrl);
    // Add inline styles as fallback
    const style = document.createElement('style');
    style.textContent = `
      #sales-ai-panel-container {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 350px;
        height: 500px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 10000;
        font-family: Arial, sans-serif;
        overflow: hidden;
      }
      .panel-header {
        background: #4a6cf7;
        color: white;
        padding: 12px 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: move;
      }
      .panel-header h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
      }
      .panel-content {
        padding: 15px;
        height: calc(100% - 100px);
        overflow-y: auto;
      }
    `;
    document.head.appendChild(style);
  };
  document.head.appendChild(cssLink);
  
  // Load the panel HTML
  const panelUrl = chrome.runtime.getURL('panel/panel.html');
  console.log('Loading panel HTML from:', panelUrl);
  
  fetch(panelUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load panel HTML: ${response.status}`);
      }
      return response.text();
    })
    .then(html => {
      console.log('Panel HTML loaded successfully');
      
      // Remove the script tag from HTML to avoid conflicts
      const cleanHtml = html.replace(/<script[^>]*>.*?<\/script>/gis, '');
      panelContainer.innerHTML = cleanHtml;
      
      // Add to page
      document.body.appendChild(panelContainer);
      console.log('Panel container added to DOM');
      
      // Update panel header with meeting info
      const headerTitle = panelContainer.querySelector('.panel-header h3');
      if (headerTitle) {
        headerTitle.textContent = `AI Assistant - ${currentMeetingPlatform || 'Meeting'}`;
      }
      
      // Initialize panel content
      const transcriptContainer = panelContainer.querySelector('#sales-ai-transcript');
      if (transcriptContainer) {
        transcriptContainer.innerHTML = '<p style="color: #666; font-style: italic;">Ready to record. Click the microphone button to start.</p>';
      }
      
      const suggestionsContainer = panelContainer.querySelector('#sales-ai-suggestions');
      if (suggestionsContainer) {
        suggestionsContainer.innerHTML = '<p style="color: #666; font-style: italic;">AI suggestions will appear here during the conversation.</p>';
      }
      
      // Set up event listeners
      setupPanelEventListeners();
      
      // Make panel draggable
      setupDragHandling();
      
      panelVisible = true;
      console.log('Panel injection completed successfully');
    })
    .catch(error => {
      console.error('Error loading panel HTML:', error);
      // Create a simple fallback panel
      createFallbackPanel(panelContainer);
      document.body.appendChild(panelContainer);
    });
}

// Set up event listeners for the panel
function setupPanelEventListeners() {
  console.log('Setting up panel event listeners...');
  
  // Close panel button
  const closeBtn = document.getElementById('close-panel');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      const panel = document.getElementById('sales-ai-panel-container');
      if (panel) {
        panel.remove();
        panelVisible = false;
        console.log('Panel closed');
      }
    });
  }
  
  // Toggle transcription button
  const toggleTranscriptionBtn = document.getElementById('toggle-transcription');
  if (toggleTranscriptionBtn) {
    toggleTranscriptionBtn.addEventListener('click', () => {
      console.log('Transcription toggle clicked, isCapturing:', isCapturing);
      if (isCapturing) {
        stopAudioCapture();
        toggleTranscriptionBtn.innerHTML = '<span class="icon">🎙️</span>';
        toggleTranscriptionBtn.classList.remove('active');
      } else {
        startAudioCapture();
        toggleTranscriptionBtn.innerHTML = '<span class="icon">🛑</span>';
        toggleTranscriptionBtn.classList.add('active');
      }
    });
  }
  
  // Tab switching functionality
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');
      console.log('Tab clicked:', targetTab);
      
      // Remove active class from all tabs and contents
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding content
      button.classList.add('active');
      const targetContent = document.getElementById(`${targetTab}-tab`);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
  });
  
  // Copy suggestions button
  const copySuggestionsBtn = document.getElementById('copy-suggestions');
  if (copySuggestionsBtn) {
    copySuggestionsBtn.addEventListener('click', () => {
      const suggestions = document.getElementById('sales-ai-suggestions');
      if (suggestions && suggestions.innerText.trim()) {
        navigator.clipboard.writeText(suggestions.innerText)
          .then(() => {
            console.log('Suggestions copied to clipboard');
            copySuggestionsBtn.textContent = 'Copied!';
            setTimeout(() => {
              copySuggestionsBtn.textContent = 'Copy Suggestions';
            }, 2000);
          })
          .catch(err => {
            console.error('Failed to copy suggestions:', err);
          });
      }
    });
  }
  
  // Open dashboard button
  const openDashboardBtn = document.getElementById('open-dashboard');
  if (openDashboardBtn) {
    openDashboardBtn.addEventListener('click', () => {
      const dashboardUrl = 'https://ai-sales-unaib.onrender.com';
      window.open(dashboardUrl, '_blank');
    });
  }
  
  console.log('Panel event listeners set up');
}

// Create a simple fallback panel if HTML loading fails
function createFallbackPanel(container) {
  container.innerHTML = `
    <div id="sales-ai-panel" style="
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #4285f4, #3367d6);
      color: white;
      display: flex;
      flex-direction: column;
      user-select: none;
    ">
      <div class="panel-header" id="drag-header" style="
        padding: 15px;
        background: rgba(0,0,0,0.1);
        cursor: move;
        display: flex;
        justify-content: space-between;
        align-items: center;
        user-select: none;
      ">
        <h3 style="margin: 0; font-size: 16px; user-select: none;">AI Assistant - ${currentMeetingPlatform}</h3>
        <button id="close-panel" style="
          background: none;
          border: none;
          color: white;
          font-size: 18px;
          cursor: pointer;
          padding: 5px;
        ">×</button>
      </div>
      <div style="flex: 1; padding: 15px; overflow-y: auto;">
        <div style="margin-bottom: 15px;">
          <h4 style="margin: 0 0 10px 0;">Transcript</h4>
          <div id="transcript-content" style="
            background: rgba(255,255,255,0.1);
            padding: 10px;
            border-radius: 5px;
            min-height: 100px;
            font-size: 14px;
          ">AI Assistant is ready. Start speaking to see transcription.</div>
        </div>
        <div>
          <h4 style="margin: 0 0 10px 0;">AI Suggestions</h4>
          <div id="suggestions-content" style="
            background: rgba(255,255,255,0.1);
            padding: 10px;
            border-radius: 5px;
            min-height: 150px;
            font-size: 14px;
          ">AI suggestions will appear here during the conversation.</div>
        </div>
      </div>
    </div>
  `;
  
  // Add close functionality
  const closeBtn = container.querySelector('#close-panel');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      container.style.display = 'none';
    });
  }
  
  panelVisible = true;
  
  // Setup drag functionality immediately
  setTimeout(() => {
    setupDragHandling();
  }, 100);
}

function setupDragHandling() {
  console.log('Setting up simple drag handling...');
  
  const panelContainer = document.getElementById('sales-ai-panel-container');
  if (!panelContainer) {
    console.error('Panel container not found');
    return;
  }
  
  // Make the entire panel draggable by its header
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let xOffset = 0;
  let yOffset = 0;
  
  // Find header - try multiple approaches
  const header = panelContainer.querySelector('.panel-header') || 
                 panelContainer.querySelector('#drag-header') || 
                 panelContainer.querySelector('div[style*="cursor: move"]') ||
                 panelContainer.firstElementChild?.firstElementChild;
  
  if (!header) {
    console.error('No header found for dragging');
    return;
  }
  
  console.log('Header found:', header);
  
  // Ensure header is draggable
  header.style.cursor = 'move';
  header.style.userSelect = 'none';
  header.setAttribute('draggable', 'false'); // Prevent default drag
  
  function dragStart(e) {
    if (e.type === "touchstart") {
      initialX = e.touches[0].clientX - xOffset;
      initialY = e.touches[0].clientY - yOffset;
    } else {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
    }
    
    if (e.target === header || header.contains(e.target)) {
      isDragging = true;
      header.style.cursor = 'grabbing';
      console.log('Drag started');
    }
  }
  
  function dragEnd(e) {
    initialX = currentX;
    initialY = currentY;
    isDragging = false;
    header.style.cursor = 'move';
    console.log('Drag ended');
  }
  
  function drag(e) {
    if (isDragging) {
      e.preventDefault();
      
      if (e.type === "touchmove") {
        currentX = e.touches[0].clientX - initialX;
        currentY = e.touches[0].clientY - initialY;
      } else {
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
      }
      
      xOffset = currentX;
      yOffset = currentY;
      
      // Keep within screen bounds
      const maxX = window.innerWidth - panelContainer.offsetWidth;
      const maxY = window.innerHeight - panelContainer.offsetHeight;
      
      currentX = Math.max(0, Math.min(maxX, currentX));
      currentY = Math.max(0, Math.min(maxY, currentY));
      
      panelContainer.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
      panelContainer.style.left = 'auto';
      panelContainer.style.top = 'auto';
      panelContainer.style.right = 'auto';
    }
  }
  
  // Mouse events
  header.addEventListener('mousedown', dragStart, false);
  document.addEventListener('mouseup', dragEnd, false);
  document.addEventListener('mousemove', drag, false);
  
  // Touch events for mobile
  header.addEventListener('touchstart', dragStart, false);
  document.addEventListener('touchend', dragEnd, false);
  document.addEventListener('touchmove', drag, false);
  
  console.log('Drag handling setup complete');
}

// Audio capture variables
let audioStream = null;
let mediaRecorder = null;
let isCapturing = false;
let recordingInterval = null;
let currentMeetingId = null;

// Start capturing audio from the meeting
async function startAudioCapture() {
  if (isCapturing) {
    console.log('Already capturing audio');
    return;
  }
  
  console.log('Starting audio capture...');
  updatePanelContent('transcript', 'Requesting microphone access...');
  
  try {
    // Request microphone access
    audioStream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } 
    });
    
    console.log('Microphone access granted');
    updatePanelContent('transcript', 'Microphone connected. Listening...');
    
    // Create media recorder
    const options = {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 128000
    };
    
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      console.warn('Preferred codec not supported, using default');
      delete options.mimeType;
    }
    
    mediaRecorder = new MediaRecorder(audioStream, options);
    
    // Handle data available event
    mediaRecorder.ondataavailable = async (event) => {
      if (event.data && event.data.size > 0) {
        console.log('Audio chunk captured:', event.data.size, 'bytes');
        await processAudioChunk(event.data);
      }
    };
    
    mediaRecorder.onerror = (event) => {
      console.error('MediaRecorder error:', event.error);
      updatePanelContent('transcript', 'Recording error: ' + (event.error?.message || 'Unknown error'));
    };
    
    // Start recording
    mediaRecorder.start(1000); // Collect 1-second chunks
    isCapturing = true;
    
    // Process audio chunks every 3 seconds
    recordingInterval = setInterval(() => {
      if (mediaRecorder && mediaRecorder.state === 'recording' && isCapturing) {
        console.log('Requesting audio data...');
        mediaRecorder.requestData();
      }
    }, 3000);
    
    // Notify background script
    chrome.runtime.sendMessage({
      type: 'AUDIO_CAPTURE_STARTED',
      meetingId: currentMeetingId || 'unknown',
      platform: currentMeetingPlatform || 'unknown'
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending message:', chrome.runtime.lastError);
      } else {
        console.log('Background script notified of audio capture start');
      }
    });
    
  } catch (error) {
    console.error('Error accessing microphone:', error);
    let errorMessage = 'Microphone access denied. ';
    
    if (error.name === 'NotAllowedError') {
      errorMessage += 'Please click the microphone icon in the address bar and allow access.';
    } else if (error.name === 'NotFoundError') {
      errorMessage += 'No microphone found.';
    } else {
      errorMessage += error.message;
    }
    
    updatePanelContent('transcript', errorMessage);
    updatePanelContent('suggestions', 'Audio capture failed. AI suggestions unavailable.');
  }
}

// Process audio chunk
function processAudioChunk(audioBlob) {
  console.group('=== processAudioChunk ===');
  console.log('Processing audio chunk of size:', audioBlob.size, 'bytes');
  console.log('Audio blob type:', audioBlob.type);
  
  if (!audioBlob || audioBlob.size === 0) {
    console.error('Invalid or empty audio blob');
    updatePanelContent('transcript', 'Error: Invalid audio data');
    console.groupEnd();
    return;
  }
  
  // Convert blob to base64 for transmission
  const reader = new FileReader();
  reader.onloadend = () => {
    try {
      const base64Audio = reader.result.split(',')[1];
      console.log('Base64 audio data length:', base64Audio.length);
      
      // Check if we have a valid base64 string
      if (!base64Audio || base64Audio.length < 100) {
        console.error('Base64 audio data too small or invalid');
        updatePanelContent('transcript', 'Error: Audio data conversion failed');
        console.groupEnd();
        return;
      }
      
      console.log('Sending audio to background script for transcription...');
      
      // Send to background script for transcription
      chrome.runtime.sendMessage({
        type: 'TRANSCRIBE_AUDIO',
        audioData: base64Audio,
        mimeType: audioBlob.type || 'audio/webm'
      }, (response) => {
        console.log('Transcription response received:', response);
        
        if (chrome.runtime.lastError) {
          console.error('Chrome runtime error:', chrome.runtime.lastError);
          updatePanelContent('transcript', `Error: ${chrome.runtime.lastError.message}`);
          console.groupEnd();
          return;
        }
        
        if (!response) {
          console.error('No response from background script');
          updatePanelContent('transcript', 'Error: No response from transcription service');
          console.groupEnd();
          return;
        }
        
        if (response.success && response.text) {
          console.log('Transcription successful:', response.text);
          updatePanelContent('transcript', response.text, true);
          
          // Request AI suggestions
          console.log('Requesting AI suggestions for transcript...');
          chrome.runtime.sendMessage({
            type: 'GET_AI_SUGGESTIONS',
            transcript: response.text
          }, (aiResponse) => {
            console.log('AI suggestions response:', aiResponse);
            
            if (chrome.runtime.lastError) {
              console.error('AI suggestions error:', chrome.runtime.lastError);
              return;
            }
            
            if (aiResponse && aiResponse.success && aiResponse.suggestions) {
              console.log('AI suggestions received:', aiResponse.suggestions);
              updatePanelContent('suggestions', aiResponse.suggestions);
            } else {
              console.warn('No AI suggestions received or request failed');
            }
          });
        } else {
          console.error('Transcription failed:', response.error || 'Unknown error');
          updatePanelContent('transcript', `Error: ${response.error || 'Transcription failed'}`);
        }
        
        console.groupEnd();
      });
      
    } catch (error) {
      console.error('Error processing audio chunk:', error);
      updatePanelContent('transcript', `Error: ${error.message}`);
      console.groupEnd();
    }
  };
  
  reader.onerror = (error) => {
    console.error('FileReader error:', error);
    updatePanelContent('transcript', 'Error: Failed to read audio data');
    console.groupEnd();
  };
  
  reader.readAsDataURL(audioBlob);
}

// Update panel content
function updatePanelContent(type, content, append = false) {
  console.log(`Updating panel content - Type: ${type}, Content: ${content}, Append: ${append}`);
  
  let container;
  if (type === 'transcript') {
    container = document.getElementById('sales-ai-transcript');
  } else if (type === 'suggestions') {
    container = document.getElementById('sales-ai-suggestions');
  }
  
  if (container) {
    if (append && type === 'transcript') {
      // For transcript, append with timestamp
      const timestamp = new Date().toLocaleTimeString();
      const transcriptEntry = document.createElement('div');
      transcriptEntry.style.cssText = 'margin-bottom: 8px; padding: 8px; background: #f8f9fa; border-radius: 4px; border-left: 3px solid #4a6cf7;';
      transcriptEntry.innerHTML = `
        <div style="font-size: 11px; color: #666; margin-bottom: 4px;">${timestamp}</div>
        <div style="color: #333;">${content}</div>
      `;
      container.appendChild(transcriptEntry);
      
      // Auto-scroll to bottom
      container.scrollTop = container.scrollHeight;
    } else if (type === 'suggestions') {
      // For suggestions, replace content with formatted suggestions
      if (Array.isArray(content)) {
        container.innerHTML = content.map((suggestion, index) => 
          `<div style="margin-bottom: 12px; padding: 10px; background: #e8f4fd; border-radius: 6px; border-left: 3px solid #2196f3;">
            <div style="font-weight: 600; color: #1976d2; margin-bottom: 4px;">Suggestion ${index + 1}</div>
            <div style="color: #333;">${suggestion}</div>
          </div>`
        ).join('');
      } else {
        container.innerHTML = `<div style="padding: 10px; background: #e8f4fd; border-radius: 6px; color: #333;">${content}</div>`;
      }
    } else {
      // Default behavior
      container.innerHTML = `<div style="padding: 10px; color: #333;">${content}</div>`;
    }
    
    console.log(`Panel content updated successfully for ${type}`);
  } else {
    console.error(`Container not found for type: ${type}`);
  }
}
// Legacy functions removed - using new implementation above

// Handle messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request.type, request);
  
  switch (request.type) {
    case 'MEETING_DETECTED':
      currentMeetingPlatform = request.meeting?.platform || currentMeetingPlatform;
      currentMeetingId = request.meeting?.id;
      meetingData = request.meeting;
      console.log('Meeting data received:', meetingData);
      break;
      
    case 'TOGGLE_TRANSCRIPTION':
      if (isCapturing) {
        stopAudioCapture();
      } else {
        startAudioCapture();
      }
      break;
      
    case 'UPDATE_TRANSCRIPT':
    case 'TRANSCRIPTION_UPDATE':
      if (request.text || request.transcript) {
        const transcriptText = request.text || request.transcript;
        console.log('Updating transcript with:', transcriptText);
        updatePanelContent('transcript', transcriptText, true);
      }
      break;
      
    case 'UPDATE_SUGGESTIONS':
    case 'AI_SUGGESTIONS_UPDATE':
      if (request.suggestions) {
        console.log('Updating suggestions with:', request.suggestions);
        updatePanelContent('suggestions', request.suggestions);
      }
      break;
      
    case 'TRANSCRIPTION_ERROR':
      console.error('Transcription error:', request.error);
      updatePanelContent('transcript', `Error: ${request.error}`);
      break;
      
    default:
      console.log('Unknown message type:', request.type);
  }
  
  sendResponse({ success: true });
});

// Stop audio capture
function stopAudioCapture() {
  console.log('Stopping audio capture...');
  
  isCapturing = false;
  
  if (recordingInterval) {
    clearInterval(recordingInterval);
    recordingInterval = null;
  }
  
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  
  if (audioStream) {
    audioStream.getTracks().forEach(track => track.stop());
    audioStream = null;
  }
  
  updatePanelContent('transcript', 'Audio capture stopped.');
  
  // Re-enable start button
  const startBtn = document.getElementById('start-transcription');
  if (startBtn) {
    startBtn.textContent = 'Start Transcription';
    startBtn.disabled = false;
  }
}

// Initialize when page loads
if (detectMeetingPlatform()) {
  chrome.runtime.sendMessage(
    { type: 'PAGE_LOADED', url: window.location.href },
    (response) => {
      if (response?.isMeeting) {
        meetingPlatform = response.platform;
        meetingData = response.meeting;
        injectPanel();
      }
    }
  );
}