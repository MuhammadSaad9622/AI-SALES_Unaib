import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getDashboardAnalytics, getPerformanceAnalytics } from '../controllers/analyticsController.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get dashboard analytics data
router.get('/', getDashboardAnalytics);

// Get performance analytics
router.get('/performance', getPerformanceAnalytics);

export default router;