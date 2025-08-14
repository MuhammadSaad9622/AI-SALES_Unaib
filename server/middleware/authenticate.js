import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import config from '../config/config.js';

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        message: 'No token provided', 
        code: 'AUTH_NO_TOKEN',
        details: 'Authentication token is missing in the request headers'
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    try {
      // Verify token with JWT
      const decoded = jwt.verify(token, config.JWT_SECRET);
      
      // Check for userId (from auth.js) or id field
      const userId = decoded.userId || decoded.id;
      
      if (!userId) {
        return res.status(401).json({ 
          message: 'Invalid token', 
          code: 'AUTH_INVALID_TOKEN',
          details: 'Token payload is missing required fields'
        });
      }
      
      // Find user in database
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(401).json({ 
          message: 'User not found', 
          code: 'AUTH_USER_NOT_FOUND',
          details: 'The user associated with this token no longer exists'
        });
      }
      
      // Add user to request object
      req.user = user;
      next();
    } catch (jwtError) {
      // Handle specific JWT errors
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Token expired', 
          code: 'AUTH_TOKEN_EXPIRED',
          details: 'Your session has expired. Please sign in again.'
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          message: 'Invalid token format', 
          code: 'AUTH_MALFORMED_TOKEN',
          details: 'The authentication token is malformed or invalid'
        });
      } else {
        throw jwtError; // Re-throw for the outer catch block
      }
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ 
      message: 'Authentication failed', 
      code: 'AUTH_GENERAL_ERROR',
      details: 'An unexpected error occurred during authentication'
    });
  }
};

export default authenticate;