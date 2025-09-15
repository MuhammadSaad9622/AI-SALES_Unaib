import axios from "axios";

// Use environment variable or fallback to default
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3002/api";

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to requests
apiClient.interceptors.request.use(async (config) => {
  // Check localStorage for token
  const token = localStorage.getItem("authToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Track if we're already refreshing the token to prevent multiple refreshes
let isRefreshing = false;
// Store pending requests that should be retried after token refresh
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Handle response errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 and we haven't already tried to refresh the token
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If we're already refreshing, add this request to the queue
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            // Get token from localStorage
            const token = localStorage.getItem("authToken");

            if (!token) {
              throw new Error("No authentication token found");
            }

            originalRequest.headers["Authorization"] = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      // Check if we're on the login page or trying to refresh the token
      const isAuthEndpoint =
        originalRequest.url?.includes("/auth/login") ||
        originalRequest.url?.includes("/auth/register");

      if (isAuthEndpoint) {
        // Don't try to refresh for auth endpoints
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        // For now, just clear the token and reject
        // In a real app, you would implement token refresh here
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");

        isRefreshing = false;
        processQueue(error, null);

        // Redirect to login page
        if (window.location.pathname !== "/signin") {
          window.location.href = "/signin";
        }

        return Promise.reject(error);
      } catch (refreshError) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");

        isRefreshing = false;
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export class APIService {
  // Authentication
  static async login(email: string, password: string) {
    const response = await apiClient.post("/auth/login", { email, password });
    return response.data;
  }

  static async register(name: string, email: string, password: string) {
    const response = await apiClient.post("/auth/register", {
      name,
      email,
      password,
    });
    return response.data;
  }

  static async getProfile() {
    const response = await apiClient.get("/auth/me");
    return response.data;
  }

  static async updateProfile(updates: any) {
    const response = await apiClient.patch("/auth/me", updates);
    return response.data;
  }

  static async changePassword(currentPassword: string, newPassword: string) {
    const response = await apiClient.patch("/auth/change-password", {
      currentPassword,
      newPassword,
    });
    return response.data;
  }

  // Calls
  static async getCalls(params?: any) {
    const response = await apiClient.get("/calls", { params });
    return response.data;
  }

  static async createCall(callData: any) {
    const response = await apiClient.post("/calls", callData);
    return response.data;
  }

  static async getCall(id: string) {
    const response = await apiClient.get(`/calls/${id}`);
    return response.data;
  }

  static async getCallLog(id: string) {
    const response = await apiClient.get(`/calls/${id}/log`);
    return response.data;
  }

  static async generateCallSummary(id: string) {
    const response = await apiClient.post(`/calls/${id}/summary`);
    return response.data;
  }

  static async updateCall(id: string, updates: any) {
    const response = await apiClient.patch(`/calls/${id}`, updates);
    return response.data;
  }

  static async deleteCall(id: string) {
    const response = await apiClient.delete(`/calls/${id}`);
    return response.data;
  }

  static async startCall(id: string) {
    const response = await apiClient.patch(`/calls/${id}/start`);
    return response.data;
  }

  static async endCall(id: string) {
    const response = await apiClient.patch(`/calls/${id}/end`);
    return response.data;
  }

  // Zoom Meeting Services
  static async createZoomMeeting(meetingData: any) {
    const response = await apiClient.post("/meetings/zoom/create", {
      meetingData,
    });
    return response.data;
  }

  static async getZoomMeeting(meetingId: string) {
    const response = await apiClient.get(`/meetings/zoom/${meetingId}`);
    return response.data;
  }

  static async listZoomMeetings(type?: string) {
    const response = await apiClient.get("/meetings/zoom/user/list", {
      params: { type },
    });
    return response.data;
  }

  static async generateZoomSDKSignature(
    meetingNumber: string,
    role: number = 0
  ) {
    const response = await apiClient.post("/meetings/zoom/sdk-signature", {
      meetingNumber,
      role,
    });
    return response.data;
  }

  static async sendMeetingInvite(inviteData: any) {
    const response = await apiClient.post(
      "/meetings/zoom/send-invite",
      inviteData
    );
    return response.data;
  }

  static async disableMeetingNotifications(meetingId: string) {
    const response = await apiClient.patch(
      `/meetings/zoom/${meetingId}/disable-notifications`
    );
    return response.data;
  }

  // Generate Zoom ZAK token for joining meetings as authenticated user
  static async generateZoomZAK(meetingNumber: string) {
    const response = await apiClient.post("/meetings/zoom/generate-zak", {
      meetingNumber,
    });
    return response.data;
  }

  // Google Meet Services
  static async getGoogleAuthUrl() {
    const response = await apiClient.get("/meetings/google/auth-url");
    return response.data;
  }

  static async exchangeGoogleCode(code: string) {
    const response = await apiClient.post("/meetings/google/exchange-code", {
      code,
    });
    return response.data;
  }

  static async createGoogleMeet(userTokens: any, meetingData: any) {
    const response = await apiClient.post("/meetings/google/create", {
      userTokens,
      meetingData,
    });
    return response.data;
  }

  static async listGoogleMeets(userTokens: any, maxResults?: number) {
    const response = await apiClient.get("/meetings/google/user/list", {
      params: {
        userTokens: JSON.stringify(userTokens),
        maxResults,
      },
    });
    return response.data;
  }

  // Documents
  static async getDocuments(params?: any) {
    try {
      const response = await apiClient.get("/documents", { params });
      return response.data;
    } catch (error) {
      // Extract detailed error information if available
      const errorDetails = error.response?.data || {};
      const enhancedError = new Error(
        errorDetails.message || "Failed to fetch documents"
      );

      // Add additional properties to the error
      enhancedError.code = errorDetails.code || "UNKNOWN_ERROR";
      enhancedError.details =
        errorDetails.details || "An unexpected error occurred";
      enhancedError.status = error.response?.status;
      enhancedError.originalError = error;

      throw enhancedError;
    }
  }

  static async getDocument(id: string) {
    try {
      const response = await apiClient.get(`/documents/${id}`);
      return response.data;
    } catch (error) {
      // Extract detailed error information if available
      const errorDetails = error.response?.data || {};
      const enhancedError = new Error(
        errorDetails.message || "Failed to fetch document"
      );

      // Add additional properties to the error
      enhancedError.code = errorDetails.code || "UNKNOWN_ERROR";
      enhancedError.details =
        errorDetails.details || "An unexpected error occurred";
      enhancedError.status = error.response?.status;
      enhancedError.originalError = error;

      throw enhancedError;
    }
  }

  static async uploadDocument(formData: FormData) {
    try {
      const response = await apiClient.post("/documents/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      // Extract detailed error information if available
      const errorDetails = error.response?.data || {};
      const enhancedError = new Error(
        errorDetails.message || "Failed to upload document"
      );

      // Add additional properties to the error
      enhancedError.code = errorDetails.code || "UNKNOWN_ERROR";
      enhancedError.details =
        errorDetails.details || "An unexpected error occurred";
      enhancedError.status = error.response?.status;
      enhancedError.originalError = error;

      throw enhancedError;
    }
  }

  static async createUrlDocument(documentData: {
    name: string;
    url: string;
    tags?: string[];
  }) {
    try {
      const response = await apiClient.post("/documents/url", documentData);
      return response.data;
    } catch (error) {
      // Extract detailed error information if available
      const errorDetails = error.response?.data || {};
      const enhancedError = new Error(
        errorDetails.message || "Failed to create URL document"
      );

      // Add additional properties to the error
      enhancedError.code = errorDetails.code || "UNKNOWN_ERROR";
      enhancedError.details =
        errorDetails.details || "An unexpected error occurred";
      enhancedError.status = error.response?.status;
      enhancedError.originalError = error;

      throw enhancedError;
    }
  }

  static async updateDocument(id: string, updates: any) {
    try {
      const response = await apiClient.patch(`/documents/${id}`, updates);
      return response.data;
    } catch (error) {
      // Extract detailed error information if available
      const errorDetails = error.response?.data || {};
      const enhancedError = new Error(
        errorDetails.message || "Failed to update document"
      );

      // Add additional properties to the error
      enhancedError.code = errorDetails.code || "UNKNOWN_ERROR";
      enhancedError.details =
        errorDetails.details || "An unexpected error occurred";
      enhancedError.status = error.response?.status;
      enhancedError.originalError = error;

      throw enhancedError;
    }
  }

  static async deleteDocument(id: string) {
    try {
      const response = await apiClient.delete(`/documents/${id}`);
      return response.data;
    } catch (error) {
      // Extract detailed error information if available
      const errorDetails = error.response?.data || {};
      const enhancedError = new Error(
        errorDetails.message || "Failed to delete document"
      );

      // Add additional properties to the error
      enhancedError.code = errorDetails.code || "UNKNOWN_ERROR";
      enhancedError.details =
        errorDetails.details || "An unexpected error occurred";
      enhancedError.status = error.response?.status;
      enhancedError.originalError = error;

      throw enhancedError;
    }
  }

  static async getDocumentAISuggestion(id: string) {
    try {
      const response = await apiClient.get(`/documents/${id}/ai-suggestion`);
      return response.data;
    } catch (error) {
      const errorDetails = error.response?.data || {};
      const enhancedError = new Error(
        errorDetails.message || "Failed to get AI suggestion"
      );
      enhancedError.code = errorDetails.code || "UNKNOWN_ERROR";
      enhancedError.details =
        errorDetails.details || "An unexpected error occurred";
      enhancedError.status = error.response?.status;
      enhancedError.originalError = error;
      throw enhancedError;
    }
  }

  static getDocumentDownloadUrl(id: string) {
    return `${API_BASE_URL}/documents/${id}/download`;
  }

  static async processTextForAISuggestion(
    text: string,
    documentType: string = "text"
  ) {
    try {
      const response = await apiClient.post("/documents/process-text", {
        text,
        documentType,
      });
      return response.data;
    } catch (error) {
      const errorDetails = error.response?.data || {};
      const enhancedError = new Error(
        errorDetails.message || "Failed to process text for AI suggestion"
      );
      enhancedError.code = errorDetails.code || "UNKNOWN_ERROR";
      enhancedError.details =
        errorDetails.details || "An unexpected error occurred";
      enhancedError.status = error.response?.status;
      enhancedError.originalError = error;
      throw enhancedError;
    }
  }

  // Analytics
  static async getDashboardAnalytics(timeRange = "30d") {
    const response = await apiClient.get("/analytics", {
      params: { timeRange },
    });
    return response.data;
  }

  static async getPerformanceAnalytics(timeRange = "30d", groupBy = "day") {
    const response = await apiClient.get("/analytics/performance", {
      params: { timeRange, groupBy },
    });
    return response.data;
  }

  // Health Check
  static async getHealth() {
    const response = await apiClient.get("/health");
    return response.data;
  }
}

export default APIService;
