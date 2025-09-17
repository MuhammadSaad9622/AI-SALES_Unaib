#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Checking environment configuration...\n');

// Check if .env file exists
const envPath = path.join(__dirname, 'server', '.env');
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.log('❌ No .env file found in server/ directory');
  console.log('📝 Please create server/.env file with the following variables:\n');
  console.log(`MONGODB_URI=mongodb://localhost:27017/ai-sales-assistant
JWT_SECRET=your-super-secret-jwt-key-here
PORT=3002
NODE_ENV=development
OPENAI_API_KEY=sk-your-openai-api-key-here
DEEPGRAM_API_KEY=your-deepgram-api-key-here
ZOOM_SDK_KEY=your-zoom-sdk-key-here
ZOOM_SDK_SECRET=your-zoom-sdk-secret-here
VITE_API_URL=https://ai-sales-unaib.onrender.com
VITE_ZOOM_SDK_KEY=your-zoom-sdk-key-here
TRANSCRIPTION_PROVIDER=deepgram
AI_SUGGESTION_INTERVAL=30000
CORS_ORIGIN=http://localhost:5173`);
  process.exit(1);
}

// Read and parse .env file
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

console.log('✅ .env file found\n');

// Check required variables
const requiredVars = [
  'MONGODB_URI',
  'JWT_SECRET'
];

const optionalVars = [
  'OPENAI_API_KEY',
  'DEEPGRAM_API_KEY',
  'ZOOM_SDK_KEY',
  'ZOOM_SDK_SECRET',
  'VITE_ZOOM_SDK_KEY'
];

console.log('📋 Required Variables:');
let allRequiredPresent = true;
requiredVars.forEach(varName => {
  const value = envVars[varName];
  if (value && value !== 'your-super-secret-jwt-key-here') {
    console.log(`  ✅ ${varName}: Configured`);
  } else {
    console.log(`  ❌ ${varName}: Missing or using default value`);
    allRequiredPresent = false;
  }
});

console.log('\n📋 Optional Variables (for full functionality):');
optionalVars.forEach(varName => {
  const value = envVars[varName];
  if (value && !value.includes('your-') && !value.includes('sk-')) {
    console.log(`  ✅ ${varName}: Configured`);
  } else {
    console.log(`  ⚠️  ${varName}: Missing or using placeholder`);
  }
});

console.log('\n🔧 Zoom SDK Configuration:');
const zoomSDKKey = envVars['VITE_ZOOM_SDK_KEY'];
if (zoomSDKKey && !zoomSDKKey.includes('your-')) {
  console.log('  ✅ VITE_ZOOM_SDK_KEY: Configured');
  console.log('  💡 This should fix the "Failed to load Zoom Web SDK" error');
} else {
  console.log('  ❌ VITE_ZOOM_SDK_KEY: Missing or using placeholder');
  console.log('  💡 This is likely causing the Zoom SDK loading error');
  console.log('  📖 See ZOOM_SETUP_GUIDE.md for detailed instructions');
}

console.log('\n🎯 Summary:');
if (allRequiredPresent) {
  console.log('  ✅ Basic configuration is complete');
  console.log('  💡 Add optional variables for full functionality');
} else {
  console.log('  ❌ Missing required environment variables');
  console.log('  📖 Please configure the missing variables and restart the application');
}

console.log('\n🚀 Next steps:');
console.log('  1. Configure any missing variables in server/.env');
console.log('  2. Restart the application: npm run dev');
console.log('  3. Check the browser console for detailed error messages');
