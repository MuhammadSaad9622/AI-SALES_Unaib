import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, 'server', '.env') });

import zoomService from './server/services/zoomService.js';

async function testMeetingCreation() {
  console.log('🧪 Testing Zoom Meeting Creation...\n');

  try {
    // Test 1: Check if service is properly configured
    console.log('1. Checking service configuration...');
    if (!process.env.ZOOM_CLIENT_ID || !process.env.ZOOM_CLIENT_SECRET) {
      console.error('❌ Zoom credentials not found in environment variables');
      return;
    }
    console.log('✅ Zoom credentials found\n');

    // Test 2: Create a test meeting
    console.log('2. Creating test meeting...');
    const testMeetingData = {
      topic: 'Test AI Sales Meeting',
      startTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes from now
      duration: 30,
      timezone: 'UTC'
    };

    const meeting = await zoomService.createMeeting('me', testMeetingData);
    
    console.log('✅ Meeting created successfully:');
    console.log('   Meeting ID:', meeting.meetingId);
    console.log('   Topic:', meeting.topic);
    console.log('   Join URL:', meeting.joinUrl);
    console.log('   Start URL:', meeting.startUrl);
    console.log('   Password:', meeting.password);
    console.log('');

    // Test 3: Disable email notifications
    console.log('3. Disabling email notifications...');
    await zoomService.disableEmailNotifications(meeting.meetingId);
    console.log('✅ Email notifications disabled\n');

    // Test 4: Clean up - delete the test meeting
    console.log('4. Cleaning up test meeting...');
    await zoomService.deleteMeeting(meeting.meetingId);
    console.log('✅ Test meeting deleted\n');

    console.log('🎉 All meeting creation tests passed!');
    console.log('📧 You should NOT receive any email notifications for this test meeting.');

  } catch (error) {
    console.error('❌ Meeting creation test failed:', error);
  }
}

// Run the test
testMeetingCreation(); 