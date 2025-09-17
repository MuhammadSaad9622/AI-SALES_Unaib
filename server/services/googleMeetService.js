import { google } from 'googleapis';
import config from '../config/config.js';

class GoogleMeetService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      config.GOOGLE_CLIENT_ID,
      config.GOOGLE_CLIENT_SECRET,
      'https://ai-sales-unaib.onrender.com/api/meetings/google/callback'
    );
    
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    this.meet = google.meet({ version: 'v2', auth: this.oauth2Client });
  }

  // Set OAuth2 credentials
  setCredentials(tokens) {
    this.oauth2Client.setCredentials(tokens);
  }

  // Generate OAuth2 URL for user authentication
  generateAuthUrl(state = null) {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/meetings.space.created',
      'https://www.googleapis.com/auth/meetings.space.readonly'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: state
    });
  }

  // Exchange authorization code for tokens
  async getTokens(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      return tokens;
    } catch (error) {
      console.error('Failed to exchange code for tokens:', error);
      throw new Error(`Failed to exchange code for tokens: ${error.message}`);
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
      throw new Error(`Failed to refresh token: ${error.message}`);
    }
  }

  // Create Google Meet meeting
  async createMeeting(userTokens, meetingData) {
    try {
      this.setCredentials(userTokens);

      // Create calendar event with Google Meet
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
        },
        guestsCanInviteOthers: meetingData.guestsCanInviteOthers || false,
        guestsCanModify: meetingData.guestsCanModify || false,
        guestsCanSeeOtherGuests: meetingData.guestsCanSeeOtherGuests || true
      };

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: 1,
        sendUpdates: meetingData.sendUpdates || 'all'
      });

      const eventData = response.data;
      const meetUrl = eventData.conferenceData?.entryPoints?.find(
        entry => entry.entryPointType === 'video'
      )?.uri;

      return {
        id: eventData.id,
        eventId: eventData.id,
        meetUrl,
        joinUrl: meetUrl,
        htmlLink: eventData.htmlLink,
        summary: eventData.summary,
        description: eventData.description,
        startTime: eventData.start.dateTime,
        endTime: eventData.end.dateTime,
        timezone: eventData.start.timeZone,
        conferenceId: eventData.conferenceData?.conferenceId,
        conferenceData: eventData.conferenceData,
        attendees: eventData.attendees || [],
        creator: eventData.creator,
        organizer: eventData.organizer,
        status: eventData.status
      };
    } catch (error) {
      console.error('Failed to create Google Meet:', error);
      throw new Error(`Failed to create Google Meet: ${error.message}`);
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

      const eventData = response.data;
      const meetUrl = eventData.conferenceData?.entryPoints?.find(
        entry => entry.entryPointType === 'video'
      )?.uri;

      return {
        id: eventData.id,
        summary: eventData.summary,
        description: eventData.description,
        startTime: eventData.start.dateTime,
        endTime: eventData.end.dateTime,
        timezone: eventData.start.timeZone,
        meetUrl,
        htmlLink: eventData.htmlLink,
        conferenceData: eventData.conferenceData,
        attendees: eventData.attendees || [],
        status: eventData.status,
        creator: eventData.creator,
        organizer: eventData.organizer
      };
    } catch (error) {
      console.error('Failed to get Google Meet details:', error);
      throw new Error(`Failed to get Google Meet details: ${error.message}`);
    }
  }

  // List upcoming meetings
  async listMeetings(userTokens, maxResults = 10, timeMin = null) {
    try {
      this.setCredentials(userTokens);

      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin || new Date().toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
        q: 'meet.google.com'
      });

      const events = response.data.items || [];
      
      return {
        meetings: events.map(event => {
          const meetUrl = event.conferenceData?.entryPoints?.find(
            entry => entry.entryPointType === 'video'
          )?.uri;

          return {
            id: event.id,
            summary: event.summary,
            description: event.description,
            startTime: event.start.dateTime,
            endTime: event.end.dateTime,
            timezone: event.start.timeZone,
            meetUrl,
            htmlLink: event.htmlLink,
            status: event.status,
            attendees: event.attendees || []
          };
        }),
        nextPageToken: response.data.nextPageToken,
        timeZone: response.data.timeZone
      };
    } catch (error) {
      console.error('Failed to list Google Meet meetings:', error);
      throw new Error(`Failed to list Google Meet meetings: ${error.message}`);
    }
  }

  // Update meeting
  async updateMeeting(userTokens, eventId, updateData) {
    try {
      this.setCredentials(userTokens);

      const response = await this.calendar.events.patch({
        calendarId: 'primary',
        eventId,
        resource: updateData,
        sendUpdates: 'all'
      });

      return response.data;
    } catch (error) {
      console.error('Failed to update Google Meet:', error);
      throw new Error(`Failed to update Google Meet: ${error.message}`);
    }
  }

  // Delete meeting
  async deleteMeeting(userTokens, eventId) {
    try {
      this.setCredentials(userTokens);

      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId,
        sendUpdates: 'all'
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to delete Google Meet:', error);
      throw new Error(`Failed to delete Google Meet: ${error.message}`);
    }
  }

  // Get user's calendar list
  async getCalendars(userTokens) {
    try {
      this.setCredentials(userTokens);

      const response = await this.calendar.calendarList.list();
      
      return {
        calendars: response.data.items || []
      };
    } catch (error) {
      console.error('Failed to get calendars:', error);
      throw new Error(`Failed to get calendars: ${error.message}`);
    }
  }

  // Get meeting recordings (Google Meet recordings are stored in Google Drive)
  async getMeetingRecordings(userTokens, meetingId) {
    try {
      this.setCredentials(userTokens);
      
      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      
      // Search for recordings related to the meeting
      const response = await drive.files.list({
        q: `name contains '${meetingId}' and mimeType contains 'video'`,
        fields: 'files(id, name, size, createdTime, webViewLink, webContentLink)'
      });

      return {
        recordings: response.data.files || []
      };
    } catch (error) {
      console.error('Failed to get meeting recordings:', error);
      throw new Error(`Failed to get meeting recordings: ${error.message}`);
    }
  }

  // Start AI monitoring for a Google Meet
  async startAIMonitoring(meetingId, callId, io) {
    // Google Meet doesn't have real-time webhooks like Zoom
    // We can implement polling or use Google Calendar push notifications
    
    // For now, we'll emit a meeting started event
    io.emit('meetingStarted', { 
      callId, 
      meetingId, 
      platform: 'google_meet' 
    });

    // You could implement Calendar API push notifications here
    // https://developers.google.com/calendar/api/guides/push
  }

  // Validate tokens
  async validateTokens(tokens) {
    try {
      this.setCredentials(tokens);
      
      // Try to make a simple API call to validate tokens
      await this.calendar.calendarList.list({ maxResults: 1 });
      
      return true;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }
}

export default new GoogleMeetService();