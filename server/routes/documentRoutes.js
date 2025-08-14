import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {
  getDocuments,
  getDocument,
  uploadDocument,
  createUrlDocument,
  updateDocument,
  deleteDocument,
  getAISuggestion,
  processTextForAISuggestion,
  downloadDocument
} from '../controllers/documentController.js';
import { authenticate } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = path.join(__dirname, '../uploads');
    // Ensure the uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.'));
    }
  }
});

// Routes
router.use(authenticate); // Protect all document routes

router.route('/')
  .get(getDocuments);

// Upload a document file
router.post('/upload', upload.single('file'), uploadDocument);

router.post('/url', createUrlDocument);

router.route('/:id')
  .get(getDocument)
  .patch(updateDocument)
  .delete(deleteDocument);

router.get('/:id/ai-suggestion', getAISuggestion);
router.get('/:id/download', downloadDocument);

// Process text directly for AI suggestions without storing as a document
router.post('/process-text', processTextForAISuggestion);

export default router;