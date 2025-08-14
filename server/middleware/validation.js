import validator from 'validator';

// Validation helper functions
export const validateEmail = (email) => {
  return validator.isEmail(email);
};

export const validatePassword = (password) => {
  return password && password.length >= 8;
};

export const validateName = (name) => {
  return name && name.trim().length >= 2 && name.trim().length <= 100;
};

export const validatePhone = (phone) => {
  return !phone || validator.isMobilePhone(phone);
};

// User registration validation middleware
export const validateUserRegistration = (req, res, next) => {
  const { name, email, password } = req.body;
  const errors = [];

  if (!validateName(name)) {
    errors.push('Name must be between 2 and 100 characters');
  }

  if (!validateEmail(email)) {
    errors.push('Please provide a valid email address');
  }

  if (!validatePassword(password)) {
    errors.push('Password must be at least 8 characters long');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

// User login validation middleware
export const validateUserLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email) {
    errors.push('Email is required');
  } else if (!validateEmail(email)) {
    errors.push('Please provide a valid email address');
  }

  if (!password) {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

// Call creation validation middleware
export const validateCallCreation = (req, res, next) => {
  const { title } = req.body;
  const errors = [];

  if (!title || title.trim().length === 0) {
    errors.push('Call title is required');
  } else if (title.trim().length > 200) {
    errors.push('Call title cannot exceed 200 characters');
  }

  if (req.body.platform && !['zoom', 'meet', 'teams', 'other', 'google_meet', 'unknown'].includes(req.body.platform)) {
    errors.push('Invalid platform. Must be one of: zoom, meet, teams, other, google_meet, unknown');
  }

  if (req.body.status && !['scheduled', 'active', 'completed', 'cancelled'].includes(req.body.status)) {
    errors.push('Invalid status. Must be one of: scheduled, active, completed, cancelled');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

// Document upload validation middleware
export const validateDocumentUpload = (req, res, next) => {
  const { name, type } = req.body;
  const errors = [];

  if (!name || name.trim().length === 0) {
    errors.push('Document name is required');
  } else if (name.trim().length > 200) {
    errors.push('Document name cannot exceed 200 characters');
  }

  if (!type) {
    errors.push('Document type is required');
  } else if (!['pdf', 'url', 'text', 'doc', 'docx', 'image'].includes(type)) {
    errors.push('Invalid document type. Must be one of: pdf, url, text, doc, docx, image');
  }

  if (type === 'url' && (!req.body.url || !validator.isURL(req.body.url))) {
    errors.push('Valid URL is required for URL type documents');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

// AI suggestion validation middleware
export const validateAISuggestion = (req, res, next) => {
  const { callId, type, text, confidence } = req.body;
  const errors = [];

  if (!callId) {
    errors.push('Call ID is required');
  }

  if (!type) {
    errors.push('Suggestion type is required');
  } else if (!['objection_handling', 'closing', 'question', 'pricing', 'feature_highlight', 'rapport_building', 'next_steps', 'follow_up'].includes(type)) {
    errors.push('Invalid suggestion type');
  }

  if (!text || text.trim().length === 0) {
    errors.push('Suggestion text is required');
  } else if (text.trim().length > 1000) {
    errors.push('Suggestion text cannot exceed 1000 characters');
  }

  if (confidence !== undefined) {
    if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
      errors.push('Confidence must be a number between 0 and 1');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

// Transcript validation middleware
export const validateTranscript = (req, res, next) => {
  const { callId, speaker, text, confidence } = req.body;
  const errors = [];

  if (!callId) {
    errors.push('Call ID is required');
  }

  if (!speaker || speaker.trim().length === 0) {
    errors.push('Speaker is required');
  } else if (speaker.trim().length > 100) {
    errors.push('Speaker name cannot exceed 100 characters');
  }

  if (!text || text.trim().length === 0) {
    errors.push('Transcript text is required');
  } else if (text.trim().length > 5000) {
    errors.push('Transcript text cannot exceed 5000 characters');
  }

  if (confidence !== undefined) {
    if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
      errors.push('Confidence must be a number between 0 and 1');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

// Generic ObjectId validation
export const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id || !validator.isMongoId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format`
      });
    }
    
    next();
  };
};

// Pagination validation middleware
export const validatePagination = (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  
  if (isNaN(pageNum) || pageNum < 1) {
    return res.status(400).json({
      success: false,
      message: 'Page must be a positive integer'
    });
  }
  
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    return res.status(400).json({
      success: false,
      message: 'Limit must be between 1 and 100'
    });
  }
  
  req.pagination = {
    page: pageNum,
    limit: limitNum,
    skip: (pageNum - 1) * limitNum
  };
  
  next();
};