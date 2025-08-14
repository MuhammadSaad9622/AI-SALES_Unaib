import axios from 'axios';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import config from '../config/config.js';

class ZoomService {
  constructor() {
    this.baseURL = 'https://api.zoom.us/v2';
    this.webhookEvents = new Map();
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // Get OAuth access token for server-to-server app
  async getAccessToken() {
    try {
      // Check if we have a valid token
      if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.accessToken;
      }

      console.log('Getting OAuth access token for server-to-server app...');
      
      // For server-to-server OAuth apps with account-level authorization
      const authString = Buffer.from(`${config.ZOOM_CLIENT_ID}:${config.ZOOM_CLIENT_SECRET}`).toString('base64');
      
      const response = await axios.post('https://zoom.us/oauth/token', 
        'grant_type=account_credentials&account_id=ieiRZ0WkSgGgyG3DH60jbQ',
        {
          headers: {
            'Authorization': `Basic ${authString}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
      
      console.log('✅ OAuth access token obtained successfully');
      return this.accessToken;
    } catch (error) {
      console.error('Failed to get OAuth token:', error.response?.data || error.message);
      throw new Error(`Failed to authenticate with Zoom: ${error.response?.data?.message || error.message}`);
    }
  }

  // Generate Zoom JWT token for API calls (fallback method)
  generateJWT() {
    try {
      const payload = {
        iss: config.ZOOM_CLIENT_ID || config.ZOOM_SDK_KEY,
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour expiration
      };
      
      const secret = config.ZOOM_CLIENT_SECRET || config.ZOOM_SDK_SECRET;
      
      if (!secret) {
        throw new Error('Zoom secret not configured');
      }
      
      return jwt.sign(payload, secret, { algorithm: 'HS256' });
    } catch (error) {
      console.error('Failed to generate Zoom JWT:', error);
      throw new Error('Failed to generate Zoom authentication token');
    }
  }

  // Generate Zoom SDK signature for client-side SDK
  generateSDKSignature(meetingNumber, role) {
    try {
      // For client-side SDK, we need to use the same credentials as the API
      const sdkKey = config.ZOOM_CLIENT_ID || config.ZOOM_SDK_KEY;
      const sdkSecret = config.ZOOM_CLIENT_SECRET || config.ZOOM_SDK_SECRET;
      
      if (!sdkKey || !sdkSecret) {
        throw new Error('Zoom SDK credentials not configured');
      }
      
      const timestamp = new Date().getTime() - 30000;
      const msg = Buffer.from(sdkKey + meetingNumber + timestamp + role).toString('base64');
      const hash = crypto.createHmac('sha256', sdkSecret).update(msg).digest('base64');
      
      const signature = Buffer.from(`${sdkKey}.${meetingNumber}.${timestamp}.${role}.${hash}`).toString('base64');
      
      console.log('Generated SDK signature for meeting:', meetingNumber);
      return signature;
    } catch (error) {
      console.error('Failed to generate SDK signature:', error);
      throw new Error('Failed to generate SDK signature');
    }
  }

  // Create Zoom meeting
  async createMeeting(userId, meetingData) {
    try {
      console.log('Creating Zoom meeting with userId:', userId);
      console.log('Meeting data:', meetingData);
      
      const token = await this.getAccessToken();
      console.log('Obtained authentication token successfully');
      
      const meetingPayload = {
        topic: meetingData.topic || 'AI-Assisted Sales Call',
        type: 2, // Scheduled meeting
        start_time: meetingData.startTime,
        duration: meetingData.duration || 60,
        timezone: meetingData.timezone || 'UTC',
        password: meetingData.password || this.generateMeetingPassword(),
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: true,
          mute_upon_entry: true,
          waiting_room: false,
          audio: 'both',
          auto_recording: 'cloud',
          recording_authentication: false,
          meeting_authentication: false,
          approval_type: 0,
          registration_type: 1,
          enforce_login: false,
          alternative_hosts: meetingData.alternativeHosts || '',
          close_registration: false,
          show_share_button: true,
          allow_multiple_devices: true,
          encryption_type: 'enhanced_encryption'
        },
        recurrence: meetingData.recurrence || null
      };
      
      console.log('Making request to Zoom API...');
      const response = await axios.post(
        `${this.baseURL}/users/${userId}/meetings`,
        meetingPayload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        id: response.data.id,
        meetingId: response.data.id,
        joinUrl: response.data.join_url,
        startUrl: response.data.start_url,
        password: response.data.password,
        topic: response.data.topic,
        startTime: response.data.start_time,
        duration: response.data.duration,
        timezone: response.data.timezone,
        uuid: response.data.uuid,
        hostId: response.data.host_id,
        hostEmail: response.data.host_email
      };
    } catch (error) {
      console.error('Failed to create Zoom meeting:', error.response?.data || error.message);
      throw new Error(`Failed to create Zoom meeting: ${error.response?.data?.message || error.message}`);
    }
  }

  // Get meeting details
  async getMeeting(meetingId) {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.get(
        `${this.baseURL}/meetings/${meetingId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      return {
        id: response.data.id,
        topic: response.data.topic,
        type: response.data.type,
        status: response.data.status,
        startTime: response.data.start_time,
        duration: response.data.duration,
        timezone: response.data.timezone,
        joinUrl: response.data.join_url,
        password: response.data.password,
        hostId: response.data.host_id,
        hostEmail: response.data.host_email,
        participants: response.data.participants || []
      };
    } catch (error) {
      console.error('Failed to get meeting details:', error.response?.data || error.message);
      throw new Error(`Failed to get meeting details: ${error.response?.data?.message || error.message}`);
    }
  }

  // List user meetings
  async listMeetings(userId, type = 'scheduled', pageSize = 30) {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.get(
        `${this.baseURL}/users/${userId}/meetings`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          params: {
            type,
            page_size: pageSize
          }
        }
      );

      return {
        meetings: response.data.meetings || [],
        pageCount: response.data.page_count,
        pageNumber: response.data.page_number,
        pageSize: response.data.page_size,
        totalRecords: response.data.total_records
      };
    } catch (error) {
      console.error('Failed to list meetings:', error.response?.data || error.message);
      throw new Error(`Failed to list meetings: ${error.response?.data?.message || error.message}`);
    }
  }

  // Update meeting
  async updateMeeting(meetingId, updateData) {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.patch(
        `${this.baseURL}/meetings/${meetingId}`,
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to update meeting:', error.response?.data || error.message);
      throw new Error(`Failed to update meeting: ${error.response?.data?.message || error.message}`);
    }
  }

  // Disable email notifications for a meeting
  async disableEmailNotifications(meetingId) {
    try {
      const token = await this.getAccessToken();
      
      // Only use valid Zoom API settings
      const updateData = {
        settings: {
          host_email_notification: false,
          host_email_reminder: false,
          host_email_reminder_time: 0
        }
      };

      const response = await axios.patch(
        `${this.baseURL}/meetings/${meetingId}`,
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ Email notifications disabled for meeting ${meetingId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to disable email notifications:', error.response?.data || error.message);
      throw new Error(`Failed to disable email notifications: ${error.response?.data?.message || error.message}`);
    }
  }

  // Delete meeting
  async deleteMeeting(meetingId) {
    try {
      const token = await this.getAccessToken();
      
      await axios.delete(
        `${this.baseURL}/meetings/${meetingId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      return { success: true };
    } catch (error) {
      console.error('Failed to delete meeting:', error.response?.data || error.message);
      throw new Error(`Failed to delete meeting: ${error.response?.data?.message || error.message}`);
    }
  }

  // Get meeting recordings
  async getMeetingRecordings(meetingId) {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.get(
        `${this.baseURL}/meetings/${meetingId}/recordings`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      return {
        uuid: response.data.uuid,
        id: response.data.id,
        accountId: response.data.account_id,
        hostId: response.data.host_id,
        topic: response.data.topic,
        startTime: response.data.start_time,
        duration: response.data.duration,
        totalSize: response.data.total_size,
        recordingCount: response.data.recording_count,
        recordingFiles: response.data.recording_files || []
      };
    } catch (error) {
      console.error('Failed to get meeting recordings:', error.response?.data || error.message);
      throw new Error(`Failed to get meeting recordings: ${error.response?.data?.message || error.message}`);
    }
  }

  // Get meeting participants
  async getMeetingParticipants(meetingId) {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.get(
        `${this.baseURL}/meetings/${meetingId}/participants`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      return {
        participants: response.data.participants || [],
        pageCount: response.data.page_count,
        pageSize: response.data.page_size,
        totalRecords: response.data.total_records
      };
    } catch (error) {
      console.error('Failed to get meeting participants:', error.response?.data || error.message);
      throw new Error(`Failed to get meeting participants: ${error.response?.data?.message || error.message}`);
    }
  }

  // Generate meeting password
  generateMeetingPassword() {
    return Math.random().toString(36).substring(2, 8);
  }

  // Verify webhook signature
  verifyWebhookSignature(payload, signature, timestamp) {
    try {
      const message = `v0:${timestamp}:${payload}`;
      const expectedSignature = `v0=${crypto
        .createHmac('sha256', config.ZOOM_WEBHOOK_SECRET)
        .update(message)
        .digest('hex')}`;
      
      return signature === expectedSignature;
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  // Handle webhook events
  handleWebhook(event, payload) {
    const eventHandlers = this.webhookEvents.get(event) || [];
    eventHandlers.forEach(handler => {
      try {
        handler(payload);
      } catch (error) {
        console.error(`Error handling webhook event ${event}:`, error);
      }
    });
  }

  // Register webhook event handler
  onWebhookEvent(event, handler) {
    const handlers = this.webhookEvents.get(event) || [];
    handlers.push(handler);
    this.webhookEvents.set(event, handlers);
  }

  // Start AI monitoring for a meeting
  async startAIMonitoring(meetingId, callId, io) {
    // Register webhook handlers for this meeting
    this.onWebhookEvent('meeting.started', (payload) => {
      if (payload.object.id === meetingId) {
        io.emit('meetingStarted', { callId, meetingId, platform: 'zoom' });
      }
    });

    this.onWebhookEvent('meeting.ended', (payload) => {
      if (payload.object.id === meetingId) {
        io.emit('meetingEnded', { callId, meetingId, platform: 'zoom' });
      }
    });

    this.onWebhookEvent('meeting.participant_joined', (payload) => {
      if (payload.object.id === meetingId) {
        io.emit('participantJoined', { 
          callId, 
          meetingId, 
          platform: 'zoom',
          participant: payload.object.participant 
        });
      }
    });

    this.onWebhookEvent('meeting.participant_left', (payload) => {
      if (payload.object.id === meetingId) {
        io.emit('participantLeft', { 
          callId, 
          meetingId, 
          platform: 'zoom',
          participant: payload.object.participant 
        });
      }
    });

    this.onWebhookEvent('recording.completed', (payload) => {
      if (payload.object.id === meetingId) {
        io.emit('recordingCompleted', { 
          callId, 
          meetingId, 
          platform: 'zoom',
          recording: payload.object 
        });
      }
    });
  }
}

export default new ZoomService();