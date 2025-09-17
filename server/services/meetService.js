import { google } from 'googleapis';
import config from '../config/config.js';

class GoogleMeetService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      config.GOOGLE_CLIENT_ID,
      config.GOOGLE_CLIENT_SECRET,
      'https://ai-sales-unaib.onrender.com//auth/google/callback'
    );
    
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  // Set OAuth2 credentials
  setCredentials(tokens) {
    this.oauth2Client.setCredentials(tokens);
  }

  // Create Google Meet meeting
  async createMeeting(userTokens, meetingData) {
    try {
      this.setCredentials(userTokens);

      const event = {
        summary: meetingData.topic || 'AI-Assisted Sales Call',
        description: meetingData.description || 'Sales call with AI assistance',
        start: {
          dateTime: meetingData.startTime,
          timeZone: meetingData.timezone || 'UTC',
        },
        end: {
          dateTime: new Date(new Date(meetingData.startTime).getTime() + (meetingData.duration || 60) * 60000).toISOString(),
          timeZone: meetingData.timezone || 'UTC',
        },
        attendees: meetingData.attendees || [],
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 10 }
          ]
        }
      };

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: 1,
        sendUpdates: 'all'
      });

      const meetingData = response.data;
      const meetUrl = meetingData.conferenceData?.entryPoints?.find(
        entry => entry.entryPointType === 'video'
      )?.uri;

      return {
        eventId: meetingData.id,
        meetUrl,
        htmlLink: meetingData.htmlLink,
        summary: meetingData.summary,
        startTime: meetingData.start.dateTime,
        endTime: meetingData.end.dateTime,
        conferenceId: meetingData.conferenceData?.conferenceId
      };
    } catch (error) {
      console.error('Failed to create Google Meet:', error);
      throw error;
    }
  }

  // Get meeting details
  async getMeeting(userTokens, eventId) {
    try {
      this.setCredentials(userTokens);

      const response = await this.calendar.events.get({
        calendarId: 'primary',
        eventId
      });

      return response.data;
    } catch (error) {
      console.error('Failed to get Google Meet details:', error);
      throw error;
    }
  }

  // List upcoming meetings
  async listMeetings(userTokens, maxResults = 10) {
    try {
      this.setCredentials(userTokens);

      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
        q: 'meet.google.com'
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Failed to list Google Meet meetings:', error);
      throw error;
    }
  }

  // Generate OAuth2 URL for user authentication
  generateAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  // Exchange authorization code for tokens
  async getTokens(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      return tokens;
    } catch (error) {
      console.error('Failed to exchange code for tokens:', error);
      throw error;
    }
  }

  // Refresh access token
  async refreshToken(refreshToken) {
    try {
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      return credentials;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      throw error;
    }
  }
}

const meetService = new GoogleMeetService();
export default meetService;