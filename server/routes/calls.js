import express from 'express';
import { catchAsync } from '../middleware/errorHandler.js';
import { validateCallCreation, validateObjectId, validatePagination } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import Call from '../models/Call.js';
import Transcript from '../models/Transcript.js';
import AISuggestion from '../models/AISuggestion.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get user's calls with pagination and filtering
router.get('/', validatePagination, catchAsync(async (req, res) => {
  const { page, limit, skip } = req.pagination;
  const { status, platform, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  // Build filter
  const filter = { user: req.user._id };

  if (status) {
    filter.status = status;
  }

  if (platform) {
    filter.platform = platform;
  }

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { notes: { $regex: search, $options: 'i' } }
    ];
  }

  // Build sort
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Get calls with pagination
  const [calls, total] = await Promise.all([
    Call.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email')
      .lean(),
    Call.countDocuments(filter)
  ]);

  // Calculate pagination info
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  res.json({
    success: true,
    data: {
      calls,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage
      }
    }
  });
}));

// Create new call
router.post('/', validateCallCreation, catchAsync(async (req, res) => {
  const callData = {
    ...req.body,
    user: req.user._id
  };

  const call = await Call.create(callData);
  await call.populate('user', 'name email');

  res.status(201).json({
    success: true,
    message: 'Call created successfully',
    data: {
      call
    }
  });
}));

// Get specific call with transcripts and suggestions
router.get('/:id', validateObjectId('id'), catchAsync(async (req, res) => {
  const call = await Call.findOne({
    _id: req.params.id,
    user: req.user._id
  }).populate('user', 'name email');

  if (!call) {
    return res.status(404).json({
      success: false,
      message: 'Call not found'
    });
  }

  // Get transcripts and suggestions
  const [transcripts, suggestions] = await Promise.all([
    Transcript.find({ call: call._id }).sort({ timestamp: 1 }),
    AISuggestion.find({ call: call._id }).sort({ createdAt: -1 })
  ]);

  res.json({
    success: true,
    data: {
      call,
      transcripts,
      suggestions
    }
  });
}));

// Update call
router.patch('/:id', validateObjectId('id'), catchAsync(async (req, res) => {
  // Fields that can be updated
  const allowedFields = [
    'title', 'endTime', 'duration', 'status', 'participants',
    'performanceData', 'recording', 'notes', 'tags'
  ];

  const updates = {};
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  const call = await Call.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    updates,
    {
      new: true,
      runValidators: true
    }
  ).populate('user', 'name email');

  if (!call) {
    return res.status(404).json({
      success: false,
      message: 'Call not found'
    });
  }

  res.json({
    success: true,
    message: 'Call updated successfully',
    data: {
      call
    }
  });
}));

// Delete call
router.delete('/:id', validateObjectId('id'), catchAsync(async (req, res) => {
  const call = await Call.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id
  });

  if (!call) {
    return res.status(404).json({
      success: false,
      message: 'Call not found'
    });
  }

  // Delete associated transcripts and suggestions
  await Promise.all([
    Transcript.deleteMany({ call: call._id }),
    AISuggestion.deleteMany({ call: call._id })
  ]);

  res.json({
    success: true,
    message: 'Call deleted successfully'
  });
}));

// Get call statistics
router.get('/:id/stats', validateObjectId('id'), catchAsync(async (req, res) => {
  const call = await Call.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!call) {
    return res.status(404).json({
      success: false,
      message: 'Call not found'
    });
  }

  // Get transcript summary
  const transcriptSummary = await Transcript.getCallSummary(call._id);

  // Get suggestion stats
  const suggestionStats = await AISuggestion.aggregate([
    { $match: { call: call._id } },
    {
      $group: {
        _id: null,
        totalSuggestions: { $sum: 1 },
        usedSuggestions: { $sum: { $cond: ['$used', 1, 0] } },
        averageConfidence: { $avg: '$confidence' },
        suggestionsByType: { $push: '$type' }
      }
    }
  ]);

  const stats = suggestionStats[0] || {
    totalSuggestions: 0,
    usedSuggestions: 0,
    averageConfidence: 0,
    suggestionsByType: []
  };

  res.json({
    success: true,
    data: {
      call: {
        id: call._id,
        title: call.title,
        duration: call.duration,
        status: call.status
      },
      transcriptSummary,
      suggestionStats: stats
    }
  });
}));

// Start call (update status to active)
router.patch('/:id/start', validateObjectId('id'), catchAsync(async (req, res) => {
  const call = await Call.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    {
      status: 'active',
      startTime: new Date()
    },
    { new: true }
  );

  if (!call) {
    return res.status(404).json({
      success: false,
      message: 'Call not found'
    });
  }

  res.json({
    success: true,
    message: 'Call started successfully',
    data: {
      call
    }
  });
}));

// End call (update status to completed)
router.patch('/:id/end', validateObjectId('id'), catchAsync(async (req, res) => {
  const call = await Call.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    {
      status: 'completed',
      endTime: new Date()
    },
    { new: true }
  );

  if (!call) {
    return res.status(404).json({
      success: false,
      message: 'Call not found'
    });
  }

  res.json({
    success: true,
    message: 'Call ended successfully',
    data: {
      call
    }
  });
}));

export default router;