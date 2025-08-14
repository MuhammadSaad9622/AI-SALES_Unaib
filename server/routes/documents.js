import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import authenticate from '../middleware/authenticate.js';
import {
  getDocuments,
  getDocument,
  uploadDocument,
  createUrlDocument,
  updateDocument,
  deleteDocument,
  getAISuggestion
} from '../controllers/documentController.js';

const router = express.Router();

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'server', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|mp3|wav|mp4/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('File type not supported'));
    }
  }
});

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all documents
router.get('/', getDocuments);

// Get a single document
router.get('/:id', getDocument);

// Upload a document file
router.post('/upload', upload.single('file'), uploadDocument);

// Create a URL document
router.post('/url', createUrlDocument);

// Update a document
router.patch('/:id', updateDocument);

// Delete a document
router.delete('/:id', deleteDocument);

// Get a document's AI suggestion
router.get('/:id/ai-suggestion', getAISuggestion);

export default router;