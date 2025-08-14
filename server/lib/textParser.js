/**
 * Custom wrapper for text file parsing
 * Provides robust text file parsing functionality with error handling
 */
import fs from 'fs';
import { validateFileExists, readFileAsync } from './fileUtils.js';
import { logError, logInfo } from './logger.js';

/**
 * Read and parse text file
 * @param {string} filePath - Path to the text file
 * @param {Object} options - Optional parsing options
 * @returns {Promise<string>} - Text content
 * @throws {Error} - If file doesn't exist or reading fails
 */
export async function parseText(filePath, options = {}) {
  if (!filePath || typeof filePath !== 'string') {
    logError('Invalid file path provided to text parser');
    throw new Error('Invalid file path: String expected');
  }
  
  try {
    // Validate file exists and is readable
    validateFileExists(filePath, 'Text file');
    logInfo(`Processing text file: ${filePath}`);
    
    // Read text file asynchronously
    const encoding = options.encoding || 'utf8';
    return await readFileAsync(filePath, encoding);
  } catch (error) {
    // Enhance error message with file path information
    const errorMessage = `Error processing text file at ${filePath}: ${error.message}`;
    logError(errorMessage, error);
    throw new Error(errorMessage);
  }
}

/**
 * Parse text from buffer
 * @param {Buffer} buffer - Text file buffer
 * @param {Object} options - Optional parsing options
 * @returns {string} - Text content
 * @throws {Error} - If parsing fails
 */
export function parseTextBuffer(buffer, options = {}) {
  if (!buffer || !(buffer instanceof Buffer)) {
    logError('Invalid text data provided to parser');
    throw new Error('Invalid text data: Buffer expected');
  }
  
  try {
    logInfo('Parsing text buffer');
    const encoding = options.encoding || 'utf8';
    return buffer.toString(encoding);
  } catch (error) {
    logError('Error parsing text buffer', error);
    throw new Error(`Text parsing failed: ${error.message}`);
  }
}