// Background service worker for the extension
import CONFIG from "./config.js";

// Note: API keys are now handled by your server
// The extension authenticates with your server using JWT tokens
// Your server handles OpenAI, AssemblyAI, Zoom, and Google API calls

let currentMeeting = null;
let authToken = null;
let userData = null;
let isTranscribing = false;
let isSuggestionsEnabled = true;
let meetingStartTime = null;
let transcriptData = [];
let suggestionsData = {};
let refreshInterval = null;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    [CONFIG.SETTINGS.STORAGE_KEYS.TRANSCRIPTION]: false,
    [CONFIG.SETTINGS.STORAGE_KEYS.SUGGESTIONS]: true,
    [CONFIG.SETTINGS.STORAGE_KEYS.USER_DATA]: null,
    [CONFIG.SETTINGS.STORAGE_KEYS.MEETING_DATA]: null,
    userPreferences: {},
  });

  console.log("Sales AI Assistant extension installed");
});

// Initialize authentication on startup
chrome.storage.sync.get([CONFIG.SETTINGS.STORAGE_KEYS.AUTH_TOKEN], (data) => {
  if (data[CONFIG.SETTINGS.STORAGE_KEYS.AUTH_TOKEN]) {
    authToken = data[CONFIG.SETTINGS.STORAGE_KEYS.AUTH_TOKEN];
    fetchUserData();
  } else {
    console.log("No auth token found. User needs to log in through the popup.");
  }
});

// Function to handle login (called from popup)
function loginUser(credentials) {
  return fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.LOGIN}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        authToken = data.data.token;
        chrome.storage.sync.set({
          [CONFIG.SETTINGS.STORAGE_KEYS.AUTH_TOKEN]: authToken,
        });
        fetchUserData();
        return { success: true, user: data.data.user };
      } else {
        throw new Error(data.message || "Login failed");
      }
    });
}

// Function to handle logout
function logoutUser() {
  authToken = null;
  userData = null;
  chrome.storage.sync.remove([
    CONFIG.SETTINGS.STORAGE_KEYS.AUTH_TOKEN,
    CONFIG.SETTINGS.STORAGE_KEYS.USER_DATA,
  ]);

  broadcastMessage({
    type: "UPDATE_USER_DATA",
    userData: null,
  });
}

async function fetchUserData() {
  try {
    // First, get user profile from your server using the JWT token
    const profileResponse = await fetch(
      `${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.PROFILE}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      userData = profileData.data.user;
      userData.dashboardId = userData._id; // Use user ID as dashboard ID
      userData.preferences = userData.preferences || {};

      console.log("User data fetched from server:", userData);

      chrome.storage.sync.set({
        [CONFIG.SETTINGS.STORAGE_KEYS.USER_DATA]: userData,
        [CONFIG.SETTINGS.STORAGE_KEYS.AUTH_TOKEN]: authToken,
      });

      // Broadcast user data update
      broadcastMessage({
        type: "UPDATE_USER_DATA",
        userData: userData,
      });
    } else {
      console.error(
        "Failed to fetch user profile:",
        profileResponse.statusText
      );
      // Clear invalid token
      authToken = null;
      chrome.storage.sync.remove([CONFIG.SETTINGS.STORAGE_KEYS.AUTH_TOKEN]);
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    // Clear invalid token on error
    authToken = null;
    chrome.storage.sync.remove([CONFIG.SETTINGS.STORAGE_KEYS.AUTH_TOKEN]);
  }
}

// Handle meeting detection and session tracking
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Debug logging
  console.log("Tab updated:", { tabId, changeInfo, url: tab.url });

  if (changeInfo.status !== "complete") return;

  const meetingPlatform = detectMeetingPlatform(tab.url);
  console.log(
    "Meeting platform detected:",
    meetingPlatform,
    "for URL:",
    tab.url
  );

  if (meetingPlatform) {
    // Check if we already have a meeting for this tab
    if (currentMeeting && currentMeeting.tabId === tabId) {
      console.log("Meeting already detected for this tab");
      return;
    }

    currentMeeting = {
      platform: meetingPlatform,
      tabId,
      url: tab.url,
      startTime: new Date().toISOString(),
      id: generateMeetingId(),
    };
    meetingStartTime = Date.now();
    transcriptData = [];
    suggestionsData = {};

    console.log("New meeting created:", currentMeeting);

    // Store meeting data
    chrome.storage.sync.set({
      [CONFIG.SETTINGS.STORAGE_KEYS.MEETING_DATA]: currentMeeting,
    });

    // Inject content script if not already injected
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content.js"],
      });

      console.log("Content script injected successfully");

      // Wait a bit for content script to initialize
      setTimeout(() => {
        // Send message to content script to initialize
        chrome.tabs.sendMessage(
          tabId,
          {
            type: "MEETING_DETECTED",
            meeting: currentMeeting,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error(
                "Error sending message to content script:",
                chrome.runtime.lastError
              );
            } else {
              console.log("Message sent to content script successfully");
            }
          }
        );
      }, 1000);

      // Broadcast meeting status update
      broadcastMessage({
        type: "UPDATE_MEETING_STATUS",
        meeting: currentMeeting,
      });

      console.log("Meeting detected and initialized:", meetingPlatform);
    } catch (error) {
      console.error("Error injecting content script:", error);
    }
  } else if (
    currentMeeting &&
    currentMeeting.tabId === tabId &&
    !meetingPlatform
  ) {
    // Meeting ended - user navigated away from meeting URL
    console.log("Meeting ended - user left meeting page");

    const meetingEndTime = new Date().toISOString();
    const duration = Math.floor((Date.now() - meetingStartTime) / 1000);

    const sessionData = {
      ...currentMeeting,
      endTime: meetingEndTime,
      duration,
      transcript: transcriptData,
      suggestions: suggestionsData,
    };

    logMeetingSession(sessionData);

    // Clear meeting data
    currentMeeting = null;
    meetingStartTime = null;
    transcriptData = [];
    suggestionsData = {};

    chrome.storage.sync.set({
      [CONFIG.SETTINGS.STORAGE_KEYS.MEETING_DATA]: null,
    });

    // Broadcast meeting ended
    broadcastMessage({
      type: "UPDATE_MEETING_STATUS",
      meeting: null,
    });
  }
});

// Also check active tab when extension starts
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]) {
    const meetingPlatform = detectMeetingPlatform(tabs[0].url);
    if (meetingPlatform && !currentMeeting) {
      console.log("Active meeting detected on startup:", meetingPlatform);
      // Trigger the meeting detection logic
      chrome.tabs.onUpdated.dispatch(
        tabs[0].id,
        { status: "complete" },
        tabs[0]
      );
    }
  }
});

function detectMeetingPlatform(url) {
  if (!url) return null;

  const urlLower = url.toLowerCase();
  if (urlLower.includes("meet.google.com")) return "Google Meet";
  if (urlLower.includes("zoom.us") || urlLower.includes("zoom.com"))
    return "Zoom";
  if (
    urlLower.includes("teams.microsoft.com") ||
    urlLower.includes("teams.live.com")
  )
    return "Microsoft Teams";
  return null;
}

async function logMeetingSession(sessionData) {
  if (!userData?.dashboardId || !authToken) return;

  try {
    // Create a call record in your existing server
    const response = await fetch(
      `${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.CALLS}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: `${sessionData.platform} Meeting`,
          platform: sessionData.platform.toLowerCase().replace(" ", "_"),
          startTime: sessionData.startTime,
          endTime: sessionData.endTime,
          duration: sessionData.duration,
          status: "completed",
          transcript: sessionData.transcript || [],
          aiSuggestions: sessionData.suggestions || {},
          meetingUrl: sessionData.url,
          participants: [
            {
              name: userData.name,
              email: userData.email,
              role: "host",
            },
          ],
          metadata: {
            extensionGenerated: true,
            meetingId: sessionData.id,
            tabId: sessionData.tabId,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to log session: ${errorData.message || response.statusText}`
      );
    }

    const result = await response.json();
    console.log("Session logged successfully:", result.data?.call?._id);

    // Store session ID for future reference
    if (result.data?.call?._id) {
      chrome.storage.local.set({
        [`session_${sessionData.id}`]: result.data.call._id,
      });
    }
  } catch (error) {
    console.error("Error logging session:", error);

    // Store session data locally for retry later
    chrome.storage.local.get(["failedSessions"], (data) => {
      const failedSessions = data.failedSessions || [];
      failedSessions.push({
        sessionData,
        timestamp: Date.now(),
        error: error.message,
      });
      chrome.storage.local.set({ failedSessions });
    });
  }
}

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case "START_TRANSCRIPTION":
      isTranscribing = true;
      chrome.storage.sync.set({
        [CONFIG.SETTINGS.STORAGE_KEYS.TRANSCRIPTION]: true,
      });

      // Start data refresh interval
      startDataRefresh();

      // Broadcast status update
      broadcastMessage({
        type: "UPDATE_TRANSCRIPTION_STATUS",
        isTranscribing: true,
      });

      sendResponse({ success: true });
      break;

    case "STOP_TRANSCRIPTION":
      isTranscribing = false;
      chrome.storage.sync.set({
        [CONFIG.SETTINGS.STORAGE_KEYS.TRANSCRIPTION]: false,
      });

      // Stop data refresh interval
      stopDataRefresh();

      // Broadcast status update
      broadcastMessage({
        type: "UPDATE_TRANSCRIPTION_STATUS",
        isTranscribing: false,
      });

      sendResponse({ success: true });
      break;

    case "TOGGLE_SUGGESTIONS":
      isSuggestionsEnabled = request.enabled;
      chrome.storage.sync.set({
        [CONFIG.SETTINGS.STORAGE_KEYS.SUGGESTIONS]: request.enabled,
      });

      // Broadcast status update
      broadcastMessage({
        type: "UPDATE_SUGGESTIONS_STATUS",
        isSuggestionsEnabled: request.enabled,
      });

      sendResponse({ success: true });
      break;

    case "LOGIN_USER":
      loginUser(request.credentials)
        .then((result) => sendResponse(result))
        .catch((error) =>
          sendResponse({ success: false, error: error.message })
        );
      return true; // Keep message channel open for async response

    case "LOGOUT_USER":
      logoutUser();
      sendResponse({ success: true });
      break;

    case "GET_USER_DATA":
      sendResponse({ userData, isAuthenticated: !!authToken });
      break;

    case "GET_MEETING_STATUS":
      sendResponse({
        isTranscribing,
        isSuggestionsEnabled,
        currentMeeting,
        isAuthenticated: !!authToken,
      });
      break;

    case "GET_TRANSCRIPT_DATA":
      sendResponse({ transcript: transcriptData });
      break;

    case "GET_SUGGESTIONS_DATA":
      sendResponse({ suggestions: suggestionsData });
      break;

    case "TRANSCRIPT_READY":
      // Store transcript data
      transcriptData.push({
        timestamp: Date.now(),
        text: request.transcript,
        speaker: request.speaker || "Unknown",
      });

      // Broadcast transcript update
      broadcastMessage({
        type: "UPDATE_TRANSCRIPT",
        transcript: transcriptData,
      });

      if (isSuggestionsEnabled) {
        processTranscriptWithAI(request.transcript)
          .then((suggestions) => {
            suggestionsData = { ...suggestionsData, ...suggestions };

            // Broadcast suggestions update
            broadcastMessage({
              type: "UPDATE_SUGGESTIONS",
              suggestions: suggestionsData,
            });

            sendResponse({ suggestions });
          })
          .catch((error) => sendResponse({ error: error.message }));
        return true; // Keep message channel open for async response
      }
      break;

    case "LOG_SESSION_DATA":
      logMeetingSession(request.sessionData)
        .then(() => sendResponse({ success: true }))
        .catch((error) =>
          sendResponse({ success: false, error: error.message })
        );
      return true;

    case "MEETING_DETECTED_FROM_CONTENT":
      // Handle meeting detection from content script
      console.log("Meeting detected from content script:", request.platform);

      if (!currentMeeting) {
        currentMeeting = {
          platform: request.platform,
          tabId: sender.tab?.id,
          url: request.url,
          startTime: new Date().toISOString(),
          id: generateMeetingId(),
        };
        meetingStartTime = Date.now();
        transcriptData = [];
        suggestionsData = {};

        // Store meeting data
        chrome.storage.sync.set({
          [CONFIG.SETTINGS.STORAGE_KEYS.MEETING_DATA]: currentMeeting,
        });

        // Broadcast meeting status update
        broadcastMessage({
          type: "UPDATE_MEETING_STATUS",
          meeting: currentMeeting,
        });

        console.log("Meeting initialized from content script:", currentMeeting);
      }

      sendResponse({ success: true, meeting: currentMeeting });
      break;

    default:
      sendResponse({ error: "Unknown message type" });
  }
});

async function processTranscriptWithAI(transcript) {
  if (!authToken) {
    console.warn("No auth token available for AI processing");
    return getFallbackSuggestions();
  }

  try {
    // Use your server's AI endpoint instead of calling OpenAI directly
    const response = await fetch(
      `${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.AI}/suggestions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript: transcript,
          type: "sales_suggestions",
          context: {
            platform: currentMeeting?.platform || "unknown",
            meetingId: currentMeeting?.id,
            userId: userData?._id,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Server AI API error: ${errorData.message || response.statusText}`
      );
    }

    const data = await response.json();
    const suggestions = data.data?.suggestions || data.suggestions;

    // Validate the response structure
    const validatedSuggestions = {
      keyPoints: Array.isArray(suggestions?.keyPoints)
        ? suggestions.keyPoints
        : [],
      questions: Array.isArray(suggestions?.questions)
        ? suggestions.questions
        : [],
      responses: Array.isArray(suggestions?.responses)
        ? suggestions.responses
        : [],
      insights: Array.isArray(suggestions?.insights)
        ? suggestions.insights
        : [],
    };

    return validatedSuggestions;
  } catch (error) {
    console.error("AI processing error:", error);
    return getFallbackSuggestions();
  }
}

function getFallbackSuggestions() {
  return {
    keyPoints: ["Unable to process transcript at this time"],
    questions: [
      "Could you elaborate on that point?",
      "What are your main concerns?",
    ],
    responses: ["That's an interesting perspective", "I understand your point"],
    insights: ["AI processing temporarily unavailable"],
  };
}

async function transcribeAudioWithWhisper(audioBlob) {
  console.group("=== transcribeAudioWithWhisper ===");
  try {
    // Get the auth token
    const authToken = await new Promise((resolve) => {
      chrome.storage.local.get(["authToken"], (result) => {
        resolve(result.authToken);
      });
    });

    if (!authToken) {
      const error = "No authentication token found. Please log in again.";
      console.error(error);
      throw new Error(error);
    }

    console.log("Auth token found, preparing audio data...");

    // Create form data
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");
    formData.append("language", "en");
    formData.append("model", "whisper-1");

    console.log("Audio data prepared, size:", audioBlob.size, "bytes");

    // Prepare the API URL
    const apiUrl = `${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.AI}/transcribe`;
    console.log("Sending request to:", apiUrl);

    // Add timeout to the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const startTime = Date.now();
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: formData,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    const responseTime = Date.now() - startTime;
    console.log(
      `Server responded in ${responseTime}ms with status:`,
      response.status
    );

    if (!response.ok) {
      let errorDetails = "";
      try {
        const errorData = await response.json();
        errorDetails = errorData.message || JSON.stringify(errorData);
      } catch (e) {
        errorDetails = await response.text().catch(() => "No error details");
      }

      const error = new Error(
        `Server error: ${response.status} ${response.statusText}`
      );
      error.details = errorDetails;
      console.error("Server error details:", errorDetails);
      throw error;
    }

    const data = await response.json();
    console.log("Transcription response:", data);

    const transcription = data.data?.text || data.text || "";
    console.log("Extracted transcription:", transcription);

    return transcription;
  } catch (error) {
    console.error("Transcription failed:", error);

    // Handle specific error cases
    if (error.name === "AbortError") {
      throw new Error(
        "Transcription request timed out. Please check your internet connection."
      );
    } else if (error.message.includes("Failed to fetch")) {
      throw new Error(
        "Could not connect to the server. Please check your internet connection."
      );
    } else if (error.details) {
      throw new Error(`Server error: ${error.details}`);
    }

    throw error;
  } finally {
    console.groupEnd();
  }
}

// Utility functions
function generateMeetingId() {
  return (
    "meeting_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
  );
}

function broadcastMessage(message) {
  // Send message to all extension contexts (popup, panel, etc.)
  chrome.runtime.sendMessage(message).catch(() => {
    // Ignore errors if no listeners
  });

  // Send message to content scripts in all tabs
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs.sendMessage(tab.id, message).catch(() => {
        // Ignore errors if content script not injected
      });
    });
  });
}

// Message handler for content script communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.group("=== Background Message Handler ===");
  console.log("Background received message:", request.type);
  console.log("Sender tab ID:", sender.tab?.id);
  console.log("Request data:", {
    ...request,
    audioData: request.audioData
      ? `[${request.audioData.length} chars]`
      : undefined,
  });

  switch (request.type) {
    case "TRANSCRIBE_AUDIO":
      console.log("Handling transcribe audio request...");
      handleTranscribeAudio(request, sender, sendResponse);
      console.groupEnd();
      return true; // Keep message channel open for async response

    case "GET_AI_SUGGESTIONS":
      console.log("Handling AI suggestions request...");
      handleGetAISuggestions(request, sendResponse);
      console.groupEnd();
      return true; // Keep message channel open for async response

    case "AUDIO_CAPTURE_STARTED":
      console.log("Audio capture started for meeting:", request.meetingId);
      currentMeeting = { id: request.meetingId, platform: request.platform };
      isTranscribing = true;
      sendResponse({ success: true });
      console.groupEnd();
      break;

    case "MEETING_DETECTED_FROM_CONTENT":
      console.log("Meeting detected from content script:", request.platform);
      handleMeetingDetection(request.url, request.platform);
      sendResponse({ success: true });
      console.groupEnd();
      break;

    default:
      console.log("Unknown message type:", request.type);
      sendResponse({ success: false, error: "Unknown message type" });
      console.groupEnd();
  }
});

// Handle transcription requests
async function handleTranscribeAudio(request, sender, sendResponse) {
  console.group("=== handleTranscribeAudio ===");
  try {
    console.log("Processing transcription request...");

    // Check if we have a valid session
    if (!currentMeeting || !currentMeeting.id) {
      const error = "No active meeting session found";
      console.error(error);
      sendResponse({ success: false, error });
      return;
    }

    // Convert base64 to blob
    const audioData = request.audioData;
    const mimeType = request.mimeType || "audio/webm";

    console.log("Audio data received, length:", audioData.length, "bytes");
    console.log("MIME type:", mimeType);

    // Validate audio data
    if (!audioData || audioData.length < 100) {
      // Minimum reasonable size for audio data
      const error = "Audio data too small or missing";
      console.error(error);
      sendResponse({ success: false, error });
      return;
    }

    const byteCharacters = atob(audioData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const audioBlob = new Blob([byteArray], { type: mimeType });

    console.log("Converted to Blob, size:", audioBlob.size, "bytes");

    // Transcribe the audio
    console.log("Sending audio to Whisper API...");
    const transcriptionText = await transcribeAudioWithWhisper(audioBlob);

    console.log("Transcription result:", transcriptionText);

    // Broadcast the transcription to all tabs
    if (transcriptionText) {
      broadcastMessage({
        type: "TRANSCRIPTION_UPDATE",
        transcript: transcriptionText,
        meetingId: currentMeeting.id,
      });
    }

    sendResponse({
      success: true,
      text: transcriptionText || "[No speech detected]",
    });
  } catch (error) {
    const errorMsg = `Transcription error: ${error.message || "Unknown error"}`;
    console.error(errorMsg, error);

    // Broadcast error to UI
    broadcastMessage({
      type: "TRANSCRIPTION_ERROR",
      error: errorMsg,
      meetingId: currentMeeting?.id,
    });

    sendResponse({
      success: false,
      error: errorMsg,
    });
  } finally {
    console.groupEnd();
  }
}

// Handle AI suggestions requests
async function handleGetAISuggestions(request, sendResponse) {
  try {
    console.log("Processing AI suggestions request...");

    const suggestions = await processWithAI(request.transcript);

    console.log("AI suggestions result:", suggestions);
    sendResponse({ success: true, suggestions: suggestions });
  } catch (error) {
    console.error("AI suggestions error:", error);
    sendResponse({ success: false, error: error.message });
  }
}

function startDataRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }

  refreshInterval = setInterval(() => {
    if (isTranscribing && currentMeeting) {
      // Fetch latest data from server if needed
      syncWithServer();
    }
  }, CONFIG.SETTINGS.REFRESH_INTERVAL);
}

function stopDataRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

async function syncWithServer() {
  if (!userData?.dashboardId || !currentMeeting || !authToken) return;

  try {
    // Sync transcript and suggestions with server
    const response = await fetch(
      `${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.ANALYTICS}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meetingId: currentMeeting.id,
          transcript: transcriptData,
          suggestions: suggestionsData,
          timestamp: Date.now(),
          platform: currentMeeting.platform,
          userId: userData._id,
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.data?.updatedSuggestions || data.updatedSuggestions) {
        const updatedSuggestions =
          data.data?.updatedSuggestions || data.updatedSuggestions;
        suggestionsData = { ...suggestionsData, ...updatedSuggestions };
        broadcastMessage({
          type: "UPDATE_SUGGESTIONS",
          suggestions: suggestionsData,
        });
      }
    }
  } catch (error) {
    console.error("Sync error:", error);
  }
}

// Retry failed sessions periodically
setInterval(() => {
  chrome.storage.local.get(["failedSessions"], async (data) => {
    const failedSessions = data.failedSessions || [];
    if (failedSessions.length === 0) return;

    const retrySession = failedSessions.shift();
    try {
      await logMeetingSession(retrySession.sessionData);
      console.log("Retried failed session successfully");

      // Update storage with remaining failed sessions
      chrome.storage.local.set({ failedSessions });
    } catch (error) {
      // Put it back if still failing
      failedSessions.push(retrySession);
      chrome.storage.local.set({ failedSessions });
    }
  });
}, 5 * 60 * 1000); // Retry every 5 minutes
