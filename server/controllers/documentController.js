import Document from '../models/Document.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import AIService from '../services/aiService.js';
import { parsePdf, parsePdfFromPath } from '../lib/pdfParser.js';
import { parseDoc } from '../lib/docParser.js';
import { parseText } from '../lib/textParser.js';

// Helper function to determine content type based on file extension
const getContentTypeFromExtension = (extension) => {
  const contentTypes = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif'
  };
  
  return contentTypes[extension.toLowerCase()] || null;
};

// Get current file path (ES modules equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get all documents for the current user
export const getDocuments = async (req, res) => {
  try {
    // Check if user is properly authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        message: 'Authentication required', 
        code: 'AUTH_REQUIRED',
        details: 'You must be logged in to access documents'
      });
    }
    
    const documents = await Document.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ 
      message: 'Failed to fetch documents', 
      code: 'DOCUMENT_FETCH_ERROR',
      details: 'An error occurred while retrieving your documents',
      error: error.message 
    });
  }
};

// Get a single document by ID
export const getDocument = async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, user: req.user.id });
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    res.status(200).json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ message: 'Failed to fetch document', error: error.message });
  }
};

// Upload a new document file
export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { originalname, mimetype, path: filePath, size } = req.file;
    const { name, tags } = req.body;
    
    // Determine document type from mimetype
    let type = 'text';
    if (mimetype.includes('pdf')) type = 'pdf';
    else if (mimetype.includes('image')) type = 'image';
    else if (mimetype.includes('word')) type = 'doc';
    
    // Create new document in database
    const document = await Document.create({
      name: name || originalname,
      type,
      filePath,
      user: req.user.id,
      fileSize: size,
      mimeType: mimetype,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      processed: false,
      processingStatus: 'processing'
    });

    // Extract text based on document type
    let extractedText = '';
    try {
      if (type === 'pdf') {
        // Use our custom PDF parser wrapper with built-in validation
        try {
          const data = await parsePdfFromPath(filePath);
          extractedText = data.text;
        } catch (pdfError) {
          console.error('PDF parsing error:', pdfError);
          throw new Error(`Failed to parse PDF: ${pdfError.message}`);
        }
      } else if (type === 'doc' || type === 'docx') {
        // Use our custom DOC parser wrapper with built-in validation
        try {
          const result = await parseDoc(filePath);
          extractedText = result.value;
        } catch (docError) {
          console.error('DOC parsing error:', docError);
          throw new Error(`Failed to parse document: ${docError.message}`);
        }
      } else if (type === 'text') {
        // Use our custom text parser wrapper with built-in validation
        try {
          extractedText = await parseText(filePath);
        } catch (textError) {
          console.error('Text parsing error:', textError);
          throw new Error(`Failed to parse text file: ${textError.message}`);
        }
      }

      // Process the extracted text with AI
      if (extractedText) {
        const aiContext = await AIService.processDocumentForContext(extractedText, type);
        
        // Update document with extracted text and AI context
        document.extractedText = extractedText;
        document.aiContext = aiContext;
        document.processed = true;
        document.processingStatus = 'completed';
      }
    } catch (processingError) {
      console.error('Error processing document:', processingError);
      document.processingStatus = 'failed';
      document.processingError = processingError.message;
    }

    await document.save();
    res.status(201).json(document);
  } catch (error) {
    console.error('Error uploading document:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Failed to upload document';
    let errorCode = 'UPLOAD_ERROR';
    let errorDetails = error.message;
    
    if (error.code === 'ENOENT') {
      errorMessage = 'File not found during processing';
      errorCode = 'FILE_NOT_FOUND';
      errorDetails = `The file could not be found at the specified path: ${error.path}`;
    } else if (error.message.includes('parse')) {
      errorMessage = 'Document parsing failed';
      errorCode = 'PARSING_ERROR';
    } else if (error.message.includes('AI')) {
      errorMessage = 'AI processing failed';
      errorCode = 'AI_PROCESSING_ERROR';
    }
    
    res.status(500).json({ 
      message: errorMessage, 
      code: errorCode,
      details: errorDetails,
      error: error.message 
    });
  }
};

// Create a new URL document
export const createUrlDocument = async (req, res) => {
  try {
    const { name, url, tags } = req.body;
    
    if (!name || !url) {
      return res.status(400).json({ message: 'Name and URL are required' });
    }
    
    // Create new document in database
    const document = await Document.create({
      name,
      type: 'url',
      url,
      user: req.user.id,
      tags: tags || [],
      processed: true // URL documents are considered processed immediately
    });
    
    res.status(201).json(document);
  } catch (error) {
    console.error('Error creating URL document:', error);
    res.status(500).json({ message: 'Failed to create URL document', error: error.message });
  }
};

// Update a document
export const updateDocument = async (req, res) => {
  try {
    const { name, tags } = req.body;
    const updates = {};
    
    if (name) updates.name = name;
    if (tags) updates.tags = tags;
    
    const document = await Document.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      updates,
      { new: true }
    );
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    res.status(200).json(document);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ message: 'Failed to update document', error: error.message });
  }
};

// Delete a document
export const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, user: req.user.id });
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // If it's a file document, delete the file from the filesystem
    if (document.filePath) {
      const fullPath = path.resolve(document.filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
    
    await Document.deleteOne({ _id: req.params.id });
    
    res.status(200).json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ message: 'Failed to delete document', error: error.message });
  }
};

export const getAISuggestion = async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, user: req.user.id });
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (!document.processed || document.processingStatus !== 'completed') {
      return res.status(400).json({ 
        message: 'Document processing incomplete',
        status: document.processingStatus,
        error: document.processingError
      });
    }

    // Return the AI-processed context
    res.status(200).json({
      suggestion: document.aiContext,
      extractedText: document.extractedText
    });
  } catch (error) {
    console.error('Error getting AI suggestion:', error);
    res.status(500).json({ message: 'Failed to get AI suggestion', error: error.message });
  }
};

// Download a document
export const downloadDocument = async (req, res) => {
  try {
    console.log(`Download request for document ID: ${req.params.id}`);
    const document = await Document.findOne({ _id: req.params.id, user: req.user.id });
    
    if (!document) {
      console.log(`Document not found: ${req.params.id}`);
      return res.status(404).json({ message: 'Document not found' });
    }
    
    console.log(`Downloading document: ${document.name}, type: ${document.type}`);
    
    // If it's a URL-based document, redirect to the URL
    if (document.type === 'url') {
      // Validate URL before redirecting
      try {
        const url = new URL(document.url);
        console.log(`Redirecting to URL: ${document.url}`);
        
        // Set headers to indicate this is a download
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.name || 'document.pdf')}"`); 
        
        return res.redirect(document.url);
      } catch (urlError) {
        console.error(`Invalid URL for document: ${urlError.message}`);
        return res.status(400).json({ 
          message: 'Invalid document URL', 
          error: urlError.message,
          code: 'INVALID_URL_ERROR'
        });
      }
    }
    
    // If it's a file document, send the file
    if (document.filePath) {
      const fullPath = path.resolve(document.filePath);
      console.log(`File path: ${fullPath}`);
      
      if (fs.existsSync(fullPath)) {
        // Get the original file extension and mime type
        const fileExtension = path.extname(document.filePath);
        // Create a filename that includes the document name and preserves the original extension
        const downloadFilename = document.name + (document.name.endsWith(fileExtension) ? '' : fileExtension);
        console.log(`Sending file for download as: ${downloadFilename}`);
        
        // Set appropriate content type based on file extension
        const contentType = getContentTypeFromExtension(fileExtension);
        if (contentType) {
          res.setHeader('Content-Type', contentType);
          console.log(`Set Content-Type header to: ${contentType}`);
        }
        
        // Set Content-Disposition header to force download with the correct filename
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadFilename)}"`); 
        
        // Check file size before sending
        try {
          const stats = fs.statSync(fullPath);
          const fileSizeInBytes = stats.size;
          const fileSizeInMB = fileSizeInBytes / (1024 * 1024);
          console.log(`File size: ${fileSizeInMB.toFixed(2)} MB`);
          
          // If file is too large (over 100MB), warn in logs but still try to download
          if (fileSizeInMB > 100) {
            console.warn(`Warning: Large file download attempted (${fileSizeInMB.toFixed(2)} MB)`);
          }
          
          return res.download(fullPath, downloadFilename, (err) => {
            if (err) {
              console.error(`Error during file download: ${err.message}`);
              // If headers are already sent, we can't send another response
              if (!res.headersSent) {
                res.status(500).json({ 
                  message: 'Download failed', 
                  error: err.message,
                  code: 'DOWNLOAD_ERROR'
                });
              }
            } else {
              console.log(`File download completed successfully: ${downloadFilename}`);
            }
          });
        } catch (statError) {
          console.error(`Error checking file stats: ${statError.message}`);
          return res.status(500).json({ 
            message: 'Failed to access file', 
            error: statError.message,
            code: 'FILE_ACCESS_ERROR'
          });
        }
      } else {
        console.error(`File not found on server: ${fullPath}`);
        return res.status(404).json({ message: 'File not found on server' });
      }
    }
    
    console.log(`Document has no downloadable content: ${document._id}`);
    res.status(400).json({ message: 'Document has no downloadable content' });
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ 
      message: 'Failed to download document', 
      error: error.message,
      code: 'DOWNLOAD_ERROR',
      details: 'An error occurred while attempting to download the document'
    });
  }
};

// Process text directly for AI suggestions without storing as a document
export const processTextForAISuggestion = async (req, res) => {
  try {
    const { text, documentType = 'text' } = req.body;
    
    if (!text || text.trim() === '') {
      return res.status(400).json({ 
        message: 'Text is required', 
        code: 'MISSING_TEXT',
        details: 'Please provide text content to process'
      });
    }

    // Process the text with AI
    const aiContext = await AIService.processDocumentForContext(text, documentType);
    
    // Return the AI-processed context
    res.status(200).json({
      suggestion: aiContext,
      extractedText: text
    });
  } catch (error) {
    console.error('Error processing text for AI suggestion:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Failed to process text';
    let errorCode = 'PROCESSING_ERROR';
    let errorDetails = error.message;
    
    if (error.message.includes('AI')) {
      errorMessage = 'AI processing failed';
      errorCode = 'AI_PROCESSING_ERROR';
    }
    
    res.status(500).json({ 
      message: errorMessage, 
      code: errorCode,
      details: errorDetails,
      error: error.message 
    });
  }
};