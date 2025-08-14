import { parsePdfFromPath } from './server/lib/pdfParser.js';

import path from 'path';

// Test with a PDF file that exists in the uploads directory
const testPdfPath = path.join(process.cwd(), 'server', 'uploads', '1751397855971-CV.pdf');

async function testPdfParser() {
  try {
    console.log(`Testing PDF parser with file: ${testPdfPath}`);
    const result = await parsePdfFromPath(testPdfPath);
    console.log('PDF parsing successful!');
    console.log(`Extracted ${result.text.length} characters of text`);
    console.log(`First 100 characters: ${result.text.substring(0, 100)}...`);
  } catch (error) {
    console.error('PDF parsing test failed:', error);
  }
}

testPdfParser();