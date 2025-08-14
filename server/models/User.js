import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import validator from 'validator';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  avatar_url: {
    type: String,
    default: function() {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.name)}&background=random`;
    }
  },
  department: {
    type: String,
    enum: ['sales', 'marketing', 'customer_success', 'management', 'other'],
    default: 'sales'
  },
  phone: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || validator.isMobilePhone(v);
      },
      message: 'Please provide a valid phone number'
    }
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  preferences: {
    aiSuggestionFrequency: {
      type: String,
      enum: ['high', 'medium', 'low', 'manual'],
      default: 'medium'
    },
    confidenceThreshold: {
      type: Number,
      min: 0.5,
      max: 0.95,
      default: 0.8
    },
    notifications: {
      callReminders: { type: Boolean, default: true },
      performanceReports: { type: Boolean, default: true },
      aiUpdates: { type: Boolean, default: false }
    },
    audio: {
      noiseCancellation: { type: Boolean, default: true },
      echoCancellation: { type: Boolean, default: true }
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ department: 1 });
userSchema.index({ isActive: 1 });

// Virtual for user's calls
userSchema.virtual('calls', {
  ref: 'Call',
  localField: '_id',
  foreignField: 'user'
});

// Virtual for user's documents
userSchema.virtual('documents', {
  ref: 'Document',
  localField: '_id',
  foreignField: 'user'
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method to check password
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Instance method to update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save({ validateBeforeSave: false });
};

// Static method to find active users
userSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

export default mongoose.model('User', userSchema);