import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, 'server', '.env') });

import deepgramService from './server/services/deepgramService.js';

async function testTranscription() {
  console.log('🧪 Testing Deepgram Transcription Service...\n');

  try {
    // Test 1: Check if service is properly configured
    console.log('1. Checking service configuration...');
    if (!process.env.DEEPGRAM_API_KEY) {
      console.error('❌ DEEPGRAM_API_KEY not found in environment variables');
      return;
    }
    console.log('✅ Deepgram API key found\n');

    // Test 2: Test real-time transcription connection
    console.log('2. Testing real-time transcription connection...');
    const testCallId = 'test-call-' + Date.now();
    
    const onTranscript = (transcriptData) => {
      console.log('📝 Transcript received:', transcriptData);
    };

    const onError = (error) => {
      console.error('❌ Transcription error:', error);
    };

    const connection = await deepgramService.startRealTimeTranscription(
      testCallId, 
      onTranscript, 
      onError
    );

    console.log('✅ Real-time transcription connection established\n');

    // Test 3: Test audio data sending (simulate with silence)
    console.log('3. Testing audio data sending...');
    const silenceBuffer = Buffer.alloc(32000); // 1 second of silence at 16kHz
    
    await deepgramService.sendAudioData(testCallId, silenceBuffer);
    console.log('✅ Audio data sent successfully\n');

    // Test 4: Stop transcription
    console.log('4. Stopping transcription...');
    await deepgramService.stopRealTimeTranscription(testCallId);
    console.log('✅ Transcription stopped successfully\n');

    console.log('🎉 All transcription tests passed!');

  } catch (error) {
    console.error('❌ Transcription test failed:', error);
  }
}

// Run the test
testTranscription(); 