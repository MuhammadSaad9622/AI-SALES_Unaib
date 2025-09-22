// Configuration object (inline to avoid import issues)
const CONFIG = {
  API: {
    BASE_URL: "http://localhost:3002",
    ENDPOINTS: {
      AUTH: "/api/auth",
      LOGIN: "/api/auth/login",
      REGISTER: "/api/auth/register",
      PROFILE: "/api/auth/profile",
      MEETINGS: "/api/meetings",
      CALLS: "/api/calls",
      ANALYTICS: "/api/analytics",
      AI: "/api/ai",
      DOCUMENTS: "/api/documents",
      USER: "/api/auth/profile",
    },
  },
  DASHBOARD: {
    BASE_URL: "http://localhost:3002",
    ROUTES: {
      HOME: "/",
      SESSIONS: "/sessions",
      ANALYTICS: "/analytics",
      SETTINGS: "/settings",
      CALLS: "/calls",
      MEETINGS: "/meetings",
    },
  },
  SETTINGS: {
    STORAGE_KEYS: {
      TRANSCRIPTION: "isTranscribing",
      SUGGESTIONS: "isSuggestionsEnabled",
      USER_DATA: "userData",
      MEETING_DATA: "meetingData",
      AUTH_TOKEN: "authToken",
    },
    DEFAULT_THEME: "light",
    REFRESH_INTERVAL: 5000,
  },
  PLATFORMS: {
    ZOOM: "Zoom",
    GOOGLE_MEET: "Google Meet",
    MICROSOFT_TEAMS: "Microsoft Teams",
  },
};

document.addEventListener("DOMContentLoaded", () => {
  const panel = document.getElementById("sales-ai-panel");
  const toggleTranscriptionBtn = document.getElementById(
    "toggle-transcription"
  );
  const toggleSuggestionsBtn = document.getElementById("toggle-suggestions");
  const closePanelBtn = document.getElementById("close-panel");
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");
  const copySuggestionsBtn = document.getElementById("copy-suggestions");
  const openDashboardBtn = document.getElementById("open-dashboard");
  const transcriptContainer = document.getElementById("sales-ai-transcript");
  const suggestionsContainer = document.getElementById("sales-ai-suggestions");

  let isTranscribing = false;
  let isSuggestionsEnabled = true;
  let userData = null;
  let currentMeeting = null;
  let refreshInterval = null;

  // Initialize the panel
  initializePanel();

  function initializePanel() {
    // Load settings from storage
    chrome.storage.sync.get(
      [
        CONFIG.SETTINGS.STORAGE_KEYS.TRANSCRIPTION,
        CONFIG.SETTINGS.STORAGE_KEYS.SUGGESTIONS,
        CONFIG.SETTINGS.STORAGE_KEYS.USER_DATA,
        CONFIG.SETTINGS.STORAGE_KEYS.MEETING_DATA,
      ],
      (data) => {
        isTranscribing =
          data[CONFIG.SETTINGS.STORAGE_KEYS.TRANSCRIPTION] || false;
        isSuggestionsEnabled =
          data[CONFIG.SETTINGS.STORAGE_KEYS.SUGGESTIONS] !== false;
        userData = data[CONFIG.SETTINGS.STORAGE_KEYS.USER_DATA] || null;
        currentMeeting =
          data[CONFIG.SETTINGS.STORAGE_KEYS.MEETING_DATA] || null;

        updateButtonStates();
        setupEventListeners();

        if (isTranscribing) {
          startDataRefresh();
        }
      }
    );
  }

  function setupEventListeners() {
    // Toggle transcription
    toggleTranscriptionBtn.addEventListener("click", () => {
      isTranscribing = !isTranscribing;
      chrome.runtime.sendMessage({
        type: isTranscribing ? "START_TRANSCRIPTION" : "STOP_TRANSCRIPTION",
      });

      chrome.storage.sync.set({
        [CONFIG.SETTINGS.STORAGE_KEYS.TRANSCRIPTION]: isTranscribing,
      });

      updateButtonStates();

      if (isTranscribing) {
        startDataRefresh();
      } else {
        stopDataRefresh();
      }
    });

    // Toggle suggestions
    toggleSuggestionsBtn.addEventListener("click", () => {
      isSuggestionsEnabled = !isSuggestionsEnabled;
      chrome.runtime.sendMessage({
        type: "TOGGLE_SUGGESTIONS",
        enabled: isSuggestionsEnabled,
      });

      chrome.storage.sync.set({
        [CONFIG.SETTINGS.STORAGE_KEYS.SUGGESTIONS]: isSuggestionsEnabled,
      });

      updateButtonStates();
    });

    // Close panel
    closePanelBtn.addEventListener("click", () => {
      panel.style.display = "none";
      stopDataRefresh();
    });

    // Tab switching
    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const tabId = button.getAttribute("data-tab");

        // Update button states
        tabButtons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");

        // Update content visibility
        tabContents.forEach((content) => content.classList.remove("active"));
        document.getElementById(`${tabId}-tab`).classList.add("active");

        // Save the active tab preference
        chrome.storage.sync.set({ activeTab: tabId });
      });
    });

    // Copy suggestions
    copySuggestionsBtn.addEventListener("click", () => {
      const suggestions = document.getElementById(
        "sales-ai-suggestions"
      ).innerText;
      navigator.clipboard
        .writeText(suggestions)
        .then(() => {
          showToast("Suggestions copied to clipboard!");
          copySuggestionsBtn.textContent = "Copied!";
          setTimeout(() => {
            copySuggestionsBtn.textContent = "Copy Suggestions";
          }, 2000);
        })
        .catch((err) => {
          console.error("Failed to copy:", err);
          showToast("Failed to copy suggestions", "error");
        });
    });

    // Open dashboard
    openDashboardBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "GET_USER_DATA" }, (response) => {
        if (response.userData?.dashboardId) {
          chrome.tabs.create({
            url: `${CONFIG.DASHBOARD.BASE_URL}${CONFIG.DASHBOARD.ROUTES.HOME}/${response.userData.dashboardId}`,
          });
        } else {
          showToast("Please sign in to access your dashboard", "warning");
        }
      });
    });

    // Handle messages from content script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === "UPDATE_TRANSCRIPTION_STATUS") {
        isTranscribing = request.isTranscribing;
        updateButtonStates();

        if (isTranscribing) {
          startDataRefresh();
        } else {
          stopDataRefresh();
        }
      } else if (request.type === "UPDATE_SUGGESTIONS_STATUS") {
        isSuggestionsEnabled = request.isSuggestionsEnabled;
        updateButtonStates();
      } else if (request.type === "UPDATE_TRANSCRIPT") {
        updateTranscript(request.transcript);
      } else if (request.type === "UPDATE_SUGGESTIONS") {
        updateSuggestions(request.suggestions);
      }
    });
  }

  function updateButtonStates() {
    toggleTranscriptionBtn.classList.toggle("active", isTranscribing);
    toggleSuggestionsBtn.classList.toggle("active", isSuggestionsEnabled);

    toggleTranscriptionBtn.title = isTranscribing
      ? "Stop Transcription"
      : "Start Transcription";
    toggleSuggestionsBtn.title = isSuggestionsEnabled
      ? "Disable Suggestions"
      : "Enable Suggestions";

    toggleTranscriptionBtn.querySelector(".icon").textContent = isTranscribing
      ? "🔴"
      : "🎙️";
  }

  function startDataRefresh() {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }

    // Immediately fetch data
    fetchTranscriptData();
    if (isSuggestionsEnabled) {
      fetchSuggestionsData();
    }

    // Set up interval for regular updates
    refreshInterval = setInterval(() => {
      fetchTranscriptData();
      if (isSuggestionsEnabled) {
        fetchSuggestionsData();
      }
    }, CONFIG.SETTINGS.REFRESH_INTERVAL);
  }

  function stopDataRefresh() {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }

  function fetchTranscriptData() {
    chrome.runtime.sendMessage({ type: "GET_TRANSCRIPT_DATA" }, (response) => {
      if (response && response.transcript) {
        updateTranscript(response.transcript);
      }
    });
  }

  function fetchSuggestionsData() {
    chrome.runtime.sendMessage({ type: "GET_SUGGESTIONS_DATA" }, (response) => {
      if (response && response.suggestions) {
        updateSuggestions(response.suggestions);
      }
    });
  }

  function updateTranscript(transcript) {
    if (!transcript || !transcript.length) {
      transcriptContainer.innerHTML =
        '<div class="empty-state">No transcript data available yet.</div>';
      return;
    }

    let html = "";
    transcript.forEach((entry) => {
      html += `
          <div class="transcript-line ${
            entry.speaker ? "speaker-" + entry.speaker.toLowerCase() : ""
          }">
            <div class="transcript-time">${formatTime(entry.timestamp)}</div>
            <div class="transcript-speaker">${entry.speaker || "Unknown"}:</div>
            <div class="transcript-text">${entry.text}</div>
          </div>
        `;
    });

    transcriptContainer.innerHTML = html;
    transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
  }

  function updateSuggestions(suggestions) {
    if (!suggestions || Object.keys(suggestions).length === 0) {
      suggestionsContainer.innerHTML =
        '<div class="empty-state">No suggestions available yet.</div>';
      return;
    }

    let html = "";

    if (suggestions.keyPoints && suggestions.keyPoints.length) {
      html += `
          <div class="suggestion-section">
            <h4>Key Points</h4>
            <ul>
              ${suggestions.keyPoints
                .map((point) => `<li>${point}</li>`)
                .join("")}
            </ul>
          </div>
        `;
    }

    if (suggestions.questions && suggestions.questions.length) {
      html += `
          <div class="suggestion-section">
            <h4>Suggested Questions</h4>
            <ul>
              ${suggestions.questions
                .map(
                  (question) => `
                <li>
                  ${question}
                  <button class="copy-item" data-text="${question}">Copy</button>
                </li>
              `
                )
                .join("")}
            </ul>
          </div>
        `;
    }

    if (suggestions.responses && suggestions.responses.length) {
      html += `
          <div class="suggestion-section">
            <h4>Suggested Responses</h4>
            <ul>
              ${suggestions.responses
                .map(
                  (response) => `
                <li>
                  ${response}
                  <button class="copy-item" data-text="${response}">Copy</button>
                </li>
              `
                )
                .join("")}
            </ul>
          </div>
        `;
    }

    suggestionsContainer.innerHTML = html;

    // Add event listeners to copy buttons
    document.querySelectorAll(".copy-item").forEach((button) => {
      button.addEventListener("click", () => {
        const text = button.getAttribute("data-text");
        navigator.clipboard
          .writeText(text)
          .then(() => {
            showToast("Copied to clipboard!");
            button.textContent = "Copied";
            setTimeout(() => {
              button.textContent = "Copy";
            }, 2000);
          })
          .catch((err) => {
            console.error("Failed to copy:", err);
            showToast("Failed to copy text", "error");
          });
      });
    });
  }

  function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("show");
    }, 10);

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }

  // Make panel draggable
  makeDraggable(panel, panel.querySelector(".panel-header"));
});

function makeDraggable(element, handle) {
  let pos1 = 0,
    pos2 = 0,
    pos3 = 0,
    pos4 = 0;

  if (handle) {
    handle.style.cursor = "move";
    handle.onmousedown = dragMouseDown;
  } else {
    element.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // Get the mouse cursor position at startup
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // Call a function whenever the cursor moves
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // Calculate the new cursor position
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // Set the element's new position
    element.style.top = element.offsetTop - pos2 + "px";
    element.style.left = element.offsetLeft - pos1 + "px";
  }

  function closeDragElement() {
    // Stop moving when mouse button is released
    document.onmouseup = null;
    document.onmousemove = null;
  }
}
