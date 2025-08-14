# Server Utility Libraries

This directory contains utility modules that provide common functionality used throughout the application.

## Modules

### fileUtils.js

Provides file system operations with robust error handling and validation.

```javascript
import { validateFileExists, getFileExtension, isFileType } from './lib/fileUtils.js';

// Check if a file exists and is readable
try {
  validateFileExists('/path/to/file.pdf', 'PDF file');
  console.log('File exists and is readable');
} catch (error) {
  console.error(error.message);
}

// Get file extension
const extension = getFileExtension('/path/to/document.docx'); // Returns 'docx'

// Check if file is of a specific type
const isPdf = isFileType('/path/to/file.pdf', ['pdf']); // Returns true
```

### pdfParser.js

Provides PDF parsing functionality with robust error handling.

```javascript
import { parsePdfFromPath } from './lib/pdfParser.js';

async function extractTextFromPdf() {
  try {
    const result = await parsePdfFromPath('/path/to/document.pdf');
    console.log('Extracted text:', result.text);
  } catch (error) {
    console.error('PDF parsing failed:', error.message);
  }
}
```

### docParser.js

Provides DOC/DOCX parsing functionality with robust error handling.

```javascript
import { parseDoc } from './lib/docParser.js';

async function extractTextFromDoc() {
  try {
    const result = await parseDoc('/path/to/document.docx');
    console.log('Extracted text:', result.value);
  } catch (error) {
    console.error('DOC parsing failed:', error.message);
  }
}
```

### textParser.js

Provides text file parsing functionality with robust error handling.

```javascript
import { parseText } from './lib/textParser.js';

async function extractTextFromFile() {
  try {
    const text = await parseText('/path/to/document.txt');
    console.log('Extracted text:', text);
  } catch (error) {
    console.error('Text parsing failed:', error.message);
  }
}
```

### logger.js

Provides centralized logging functionality with different log levels.

```javascript
import { logInfo, logError, logWarning, logDebug } from './lib/logger.js';

// Log different types of messages
logInfo('Application started');
logWarning('Resource usage is high');
logError('Failed to connect to database', new Error('Connection timeout'));
logDebug('Processing item #1234');

// Log document processing
import { logDocumentProcessing } from './lib/logger.js';
logDocumentProcessing('doc123', 'processing', 'Started text extraction');
logDocumentProcessing('doc123', 'completed', 'Successfully extracted 1024 characters');
logDocumentProcessing('doc123', 'error', 'Failed to parse document');
```

## Best Practices

1. Always use the appropriate utility module for the task at hand
2. Handle errors properly using try/catch blocks
3. Use the logger for consistent logging throughout the application
4. Validate inputs before processing
5. Use async/await for asynchronous operations