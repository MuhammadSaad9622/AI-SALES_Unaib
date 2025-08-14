import config from '../config/config.js';

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  async initializeTransporter() {
    try {
      // Try to import nodemailer dynamically
      const nodemailerModule = await import('nodemailer');
      const nodemailer = nodemailerModule.default;
      
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: config.EMAIL_USER,
          pass: config.EMAIL_PASSWORD
        }
      });
      
      console.log('✅ Email service initialized successfully');
    } catch (error) {
      console.warn('⚠️ Email service disabled - nodemailer not available or invalid credentials');
      console.warn('   Error:', error.message);
      this.transporter = null;
    }
  }

  // Send meeting invite email
  async sendMeetingInvite(meetingData, recipientEmails) {
    // Wait for transporter to be initialized
    if (!this.transporter) {
      await this.initializeTransporter();
    }
    
    if (!this.transporter) {
      throw new Error('Email service not available. Please check your email credentials in .env file');
    }

    try {
      const { meetingId, meetingTopic, joinUrl, password, startTime } = meetingData;
      
      const emailContent = this.generateMeetingInviteEmail({
        meetingId,
        meetingTopic,
        joinUrl,
        password,
        startTime
      });

      const mailOptions = {
        from: config.EMAIL_USER,
        to: recipientEmails.join(', '),
        subject: `Meeting Invitation: ${meetingTopic}`,
        html: emailContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Meeting invite email sent successfully:', result.messageId);
      
      return {
        success: true,
        messageId: result.messageId,
        recipients: recipientEmails
      };
    } catch (error) {
      console.error('❌ Failed to send meeting invite email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  // Generate HTML email content for meeting invite
  generateMeetingInviteEmail(meetingData) {
    const { meetingId, meetingTopic, joinUrl, password, startTime } = meetingData;
    
    const formattedTime = new Date(startTime).toLocaleString();
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Meeting Invitation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .meeting-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
          .join-button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
          .meeting-id { background: #f0f0f0; padding: 10px; border-radius: 5px; font-family: monospace; margin: 10px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📅 Meeting Invitation</h1>
            <p>You're invited to join a Zoom meeting</p>
          </div>
          
          <div class="content">
            <h2>${meetingTopic}</h2>
            
            <div class="meeting-details">
              <h3>Meeting Details:</h3>
              <p><strong>Date & Time:</strong> ${formattedTime}</p>
              <p><strong>Meeting ID:</strong></p>
              <div class="meeting-id">${meetingId}</div>
              <p><strong>Password:</strong></p>
              <div class="meeting-id">${password}</div>
            </div>
            
            <p>Click the button below to join the meeting:</p>
            <a href="${joinUrl}" class="join-button">🎥 Join Meeting</a>
            
            <div style="margin-top: 30px; padding: 20px; background: #e8f4fd; border-radius: 8px;">
              <h4>📋 Instructions:</h4>
              <ul>
                <li>Click "Join Meeting" to open Zoom</li>
                <li>Enter the Meeting ID: <strong>${meetingId}</strong></li>
                <li>Enter the Password: <strong>${password}</strong></li>
                <li>Allow camera and microphone when prompted</li>
                <li>Enjoy your AI-assisted meeting!</li>
              </ul>
            </div>
            
            <div class="footer">
              <p>This meeting is powered by AI Sales Assistant</p>
              <p>If you have any questions, please contact the meeting organizer</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Test email service
  async testEmail() {
    try {
      const testEmail = {
        to: config.EMAIL_USER,
        subject: 'Test Email from AI Sales Assistant',
        html: '<h1>Test Email</h1><p>This is a test email from the AI Sales Assistant.</p>'
      };

      const result = await this.transporter.sendMail(testEmail);
      console.log('✅ Test email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Test email failed:', error);
      throw error;
    }
  }
}

export default new EmailService(); 