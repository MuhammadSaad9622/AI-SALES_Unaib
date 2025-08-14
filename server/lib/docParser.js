/**
 * Custom wrapper for mammoth to extract text from DOC/DOCX files
 * Provides robust DOC/DOCX parsing functionality with error handling
 */
import mammoth from 'mammoth';
import { validateFileExists, readFileAsync } from './fileUtils.js';
import { logError, logInfo } from './logger.js';

/**
 * Extract text from DOC/DOCX file
 * @param {string} filePath - Path to the DOC/DOCX file
 * @param {Object} options - Optional parsing options
 * @returns {Promise<Object>} - Extracted text data
 * @throws {Error} - If file doesn't exist or parsing fails
 */
export async function parseDoc(filePath, options = {}) {
  if (!filePath || typeof filePath !== 'string') {
    logError('Invalid file path provided to DOC parser');
    throw new Error('Invalid file path: String expected');
  }
  
  try {
    // Validate file exists and is readable
    validateFileExists(filePath, 'Document file');
    logInfo(`Processing document file: ${filePath}`);
    
    // Parse document
    return await mammoth.extractRawText({ path: filePath, ...options });
  } catch (error) {
    // Enhance error message with file path information
    const errorMessage = `Error processing document file at ${filePath}: ${error.message}`;
    logError(errorMessage, error);
    throw new Error(errorMessage);
  }
}

/**
 * Extract text from DOC/DOCX buffer
 * @param {Buffer} buffer - DOC/DOCX file buffer
 * @param {Object} options - Optional parsing options
 * @returns {Promise<Object>} - Extracted text data
 * @throws {Error} - If parsing fails
 */
export async function parseDocBuffer(buffer, options = {}) {
  if (!buffer || !(buffer instanceof Buffer)) {
    logError('Invalid document data provided to parser');
    throw new Error('Invalid document data: Buffer expected');
  }
  
  try {
    logInfo('Parsing document buffer');
    return await mammoth.extractRawText({ buffer, ...options });
  } catch (error) {
    logError('Error parsing document buffer', error);
    throw new Error(`Document parsing failed: ${error.message}`);
  }
}