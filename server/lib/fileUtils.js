/**
 * Utility functions for file operations
 * Provides centralized file handling functionality for the application
 */
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

/**
 * Check if a file exists and is accessible
 * @param {string} filePath - Path to the file
 * @param {string} fileType - Type of file (for error message)
 * @returns {void} - Throws error if file doesn't exist
 * @throws {Error} - If file doesn't exist or isn't readable
 */
export function validateFileExists(filePath, fileType = 'file') {
  if (!filePath) {
    throw new Error(`Invalid ${fileType} path: Path cannot be empty`);
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`${fileType} not found at path: ${filePath}`);
  }
  
  try {
    // Check if file is readable
    fs.accessSync(filePath, fs.constants.R_OK);
  } catch (error) {
    throw new Error(`${fileType} exists but is not readable: ${filePath}`);
  }

  // Check if it's actually a file and not a directory
  const stats = fs.statSync(filePath);
  if (!stats.isFile()) {
    throw new Error(`Path exists but is not a ${fileType}: ${filePath}`);
  }
}

/**
 * Get absolute path from relative path
 * @param {string} relativePath - Relative file path
 * @returns {string} - Absolute file path
 */
export function getAbsolutePath(relativePath) {
  if (!relativePath) {
    throw new Error('Invalid path: Path cannot be empty');
  }
  return path.resolve(relativePath);
}

/**
 * Get file extension from path
 * @param {string} filePath - File path
 * @returns {string} - File extension (lowercase, without dot)
 */
export function getFileExtension(filePath) {
  if (!filePath) {
    return '';
  }
  return path.extname(filePath).toLowerCase().substring(1);
}

/**
 * Check if file is of a specific type based on extension
 * @param {string} filePath - File path
 * @param {string[]} validExtensions - Array of valid extensions (without dots)
 * @returns {boolean} - True if file has a valid extension
 */
export function isFileType(filePath, validExtensions) {
  if (!filePath || !validExtensions || !Array.isArray(validExtensions)) {
    return false;
  }
  
  const extension = getFileExtension(filePath);
  return validExtensions.includes(extension);
}

/**
 * Create directory if it doesn't exist
 * @param {string} dirPath - Directory path
 * @returns {void}
 */
export function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Promisified versions of fs functions for async usage
export const readFileAsync = promisify(fs.readFile);
export const writeFileAsync = promisify(fs.writeFile);
export const unlinkAsync = promisify(fs.unlink);