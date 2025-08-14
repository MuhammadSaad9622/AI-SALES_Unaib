/**
 * Centralized logging utility for the application
 * Provides consistent logging format and levels
 */

// Log levels
const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

// Current log level (can be set via environment variable)
const currentLogLevel = process.env.LOG_LEVEL || LOG_LEVELS.INFO;

// Include timestamp and log level in all log messages
const formatLogMessage = (level, message) => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}`;
};

/**
 * Log an error message
 * @param {string} message - The error message
 * @param {Error|null} error - Optional error object
 */
export const logError = (message, error = null) => {
  const formattedMessage = formatLogMessage(LOG_LEVELS.ERROR, message);
  console.error(formattedMessage);
  
  if (error) {
    console.error(error.stack || error);
  }
};

/**
 * Log a warning message
 * @param {string} message - The warning message
 */
export const logWarning = (message) => {
  if (shouldLog(LOG_LEVELS.WARN)) {
    const formattedMessage = formatLogMessage(LOG_LEVELS.WARN, message);
    console.warn(formattedMessage);
  }
};

/**
 * Log an info message
 * @param {string} message - The info message
 */
export const logInfo = (message) => {
  if (shouldLog(LOG_LEVELS.INFO)) {
    const formattedMessage = formatLogMessage(LOG_LEVELS.INFO, message);
    console.info(formattedMessage);
  }
};

/**
 * Log a debug message
 * @param {string} message - The debug message
 */
export const logDebug = (message) => {
  if (shouldLog(LOG_LEVELS.DEBUG)) {
    const formattedMessage = formatLogMessage(LOG_LEVELS.DEBUG, message);
    console.debug(formattedMessage);
  }
};

/**
 * Check if the given log level should be logged based on current log level
 * @param {string} level - The log level to check
 * @returns {boolean} - True if the log level should be logged
 */
const shouldLog = (level) => {
  const levels = Object.values(LOG_LEVELS);
  const currentIndex = levels.indexOf(currentLogLevel);
  const levelIndex = levels.indexOf(level);
  
  return levelIndex <= currentIndex;
};

/**
 * Log an API request
 * @param {Object} req - Express request object
 * @param {string} message - Additional message
 */
export const logApiRequest = (req, message = '') => {
  if (shouldLog(LOG_LEVELS.INFO)) {
    const { method, originalUrl, ip } = req;
    const logMessage = `${method} ${originalUrl} from ${ip} ${message}`;
    logInfo(logMessage);
  }
};

/**
 * Log document processing
 * @param {string} documentId - Document ID
 * @param {string} status - Processing status
 * @param {string} message - Additional message
 */
export const logDocumentProcessing = (documentId, status, message = '') => {
  const logMessage = `Document ${documentId}: ${status} ${message}`;
  
  if (status === 'error') {
    logError(logMessage);
  } else if (status === 'warning') {
    logWarning(logMessage);
  } else {
    logInfo(logMessage);
  }
};

export default {
  logError,
  logWarning,
  logInfo,
  logDebug,
  logApiRequest,
  logDocumentProcessing,
  LOG_LEVELS
};