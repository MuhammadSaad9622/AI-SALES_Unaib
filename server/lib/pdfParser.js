/**
 * Custom wrapper for pdf-parse to avoid test file issues
 * Provides robust PDF parsing functionality with error handling
 */
// Import the internal library directly to avoid the auto-test in index.js
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import fs from 'fs';
import { validateFileExists, readFileAsync } from './fileUtils.js';
import { logError, logInfo } from './logger.js';

/**
 * Parse PDF buffer and extract text
 * @param {Buffer} dataBuffer - PDF file buffer
 * @param {Object} options - Optional parsing options
 * @returns {Promise<Object>} - Parsed PDF data with text
 * @throws {Error} - If parsing fails
 */
export async function parsePdf(dataBuffer, options = {}) {
  if (!dataBuffer || !(dataBuffer instanceof Buffer)) {
    logError('Invalid PDF data provided to parser');
    throw new Error('Invalid PDF data: Buffer expected');
  }
  
  try {
    logInfo('Parsing PDF buffer');
    return await pdfParse(dataBuffer, options);
  } catch (error) {
    logError('Error parsing PDF buffer', error);
    throw new Error(`PDF parsing failed: ${error.message}`);
  }
}

/**
 * Parse PDF file from path and extract text
 * @param {string} filePath - Path to PDF file
 * @param {Object} options - Optional parsing options
 * @returns {Promise<Object>} - Parsed PDF data with text
 * @throws {Error} - If file doesn't exist or parsing fails
 */
export async function parsePdfFromPath(filePath, options = {}) {
  if (!filePath || typeof filePath !== 'string') {
    logError('Invalid file path provided to PDF parser');
    throw new Error('Invalid file path: String expected');
  }
  
  try {
    // Validate file exists and is readable
    validateFileExists(filePath, 'PDF file');
    logInfo(`Processing PDF file: ${filePath}`);
    
    // Read file and parse
    const dataBuffer = await readFileAsync(filePath);
    return await parsePdf(dataBuffer, options);
  } catch (error) {
    // Enhance error message with file path information
    const errorMessage = error.message.includes('PDF parsing failed') 
      ? error.message 
      : `Error processing PDF file at ${filePath}: ${error.message}`;
    
    logError(errorMessage, error);
    throw new Error(errorMessage);
  }
}