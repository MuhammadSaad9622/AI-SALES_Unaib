import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, 'server', '.env') });

import aiService from './server/services/aiService.js';

async function testAI() {
  console.log('🧪 Testing AI Service...\n');

  try {
    // Test 1: Check if service is properly configured
    console.log('1. Checking service configuration...');
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not found in environment variables');
      return;
    }
    console.log('✅ OpenAI API key found\n');

    // Test 2: Test AI suggestion generation
    console.log('2. Testing AI suggestion generation...');
    const testCallId = 'test-call-' + Date.now();
    
    const mockTranscriptHistory = [
      {
        speaker: 'Customer',
        text: 'I\'m interested in your product but I\'m concerned about the price.'
      },
      {
        speaker: 'Sales Rep',
        text: 'I understand your concern about pricing. Let me show you the value proposition.'
      },
      {
        speaker: 'Customer',
        text: 'What makes your solution better than the competition?'
      }
    ];

    const suggestion = await aiService.generateSuggestion(
      testCallId,
      mockTranscriptHistory,
      'Our product offers advanced features and 24/7 support',
      { industry: 'technology', suggestionStyle: 'consultative' }
    );

    console.log('✅ AI suggestion generated:');
    console.log('   Type:', suggestion.type);
    console.log('   Text:', suggestion.text);
    console.log('   Confidence:', suggestion.confidence);
    console.log('   Priority:', suggestion.priority);
    console.log('');

    // Test 3: Test conversation analysis
    console.log('3. Testing conversation analysis...');
    const analysis = await aiService.analyzeConversation(mockTranscriptHistory);
    
    console.log('✅ Conversation analysis completed:');
    console.log('   Sentiment:', analysis.sentiment);
    console.log('   Engagement Level:', analysis.engagement_level);
    console.log('   Key Topics:', analysis.key_topics);
    console.log('   Objections Raised:', analysis.objections_raised);
    console.log('');

    console.log('🎉 All AI tests passed!');

  } catch (error) {
    console.error('❌ AI test failed:', error);
  }
}

// Run the test
testAI(); 