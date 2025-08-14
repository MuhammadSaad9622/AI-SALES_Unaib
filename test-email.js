import emailService from './server/services/emailService.js';

console.log('🧪 Testing Email Service...\n');

// Check if email service is loaded
console.log('1. Checking email service...');
console.log('✅ Email service loaded successfully');

// Wait for transporter to initialize and check if it's available
console.log('\n2. Checking email transporter...');
setTimeout(async () => {
  if (emailService.transporter) {
    console.log('✅ Email transporter is available');
  } else {
    console.log('❌ Email transporter is not available');
    console.log('   This usually means EMAIL_USER and EMAIL_PASSWORD are not set in .env file');
  }
}, 1000);

// Check environment variables
console.log('\n3. Checking environment variables...');
const emailUser = process.env.EMAIL_USER;
const emailPassword = process.env.EMAIL_PASSWORD;

if (emailUser) {
  console.log('✅ EMAIL_USER is set:', emailUser.substring(0, 3) + '***@' + emailUser.split('@')[1]);
} else {
  console.log('❌ EMAIL_USER is not set');
}

if (emailPassword) {
  console.log('✅ EMAIL_PASSWORD is set:', emailPassword.substring(0, 3) + '***');
} else {
  console.log('❌ EMAIL_PASSWORD is not set');
}

console.log('\n📧 To fix email issues:');
console.log('1. Create a .env file in the server directory');
console.log('2. Add your email credentials:');
console.log('   EMAIL_USER=your_email@gmail.com');
console.log('   EMAIL_PASSWORD=your_app_password');
console.log('3. Restart the server');

// Test sending an email
console.log('\n4. Testing email sending...');
setTimeout(async () => {
  try {
    const result = await emailService.sendMeetingInvite({
      meetingId: '123456789',
      meetingTopic: 'Test Meeting',
      joinUrl: 'https://zoom.us/test',
      password: 'test123',
      startTime: new Date().toISOString()
    }, [emailUser]);
    
    console.log('✅ Test email sent successfully!');
    console.log('   Message ID:', result.messageId);
  } catch (error) {
    console.log('❌ Test email failed:', error.message);
  }
}, 2000); 