import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Document must belong to a user']
  },
  name: {
    type: String,
    required: [true, 'Document name is required'],
    trim: true,
    maxlength: [200, 'Name cannot exceed 200 characters']
  },
  type: {
    type: String,
    required: [true, 'Document type is required'],
    enum: ['pdf', 'url', 'text', 'doc', 'docx', 'image']
  },
  url: {
    type: String,
    validate: {
      validator: function(v) {
        if (this.type === 'url') {
          return v && v.length > 0;
        }
        return true;
      },
      message: 'URL is required for URL type documents'
    }
  },
  filePath: {
    type: String,
    validate: {
      validator: function(v) {
        if (['pdf', 'doc', 'docx', 'image'].includes(this.type)) {
          return v && v.length > 0;
        }
        return true;
      },
      message: 'File path is required for file type documents'
    }
  },
  content: {
    type: String,
    maxlength: [50000, 'Content cannot exceed 50000 characters']
  },
  extractedText: {
    type: String,
    maxlength: [100000, 'Extracted text cannot exceed 100000 characters']
  },
  processed: {
    type: Boolean,
    default: false
  },
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  processingError: {
    type: String
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  fileSize: {
    type: Number,
    min: [0, 'File size cannot be negative']
  },
  mimeType: {
    type: String
  },
  metadata: {
    pageCount: Number,
    wordCount: Number,
    language: String,
    author: String,
    createdDate: Date
  },
  embeddings: {
    type: [Number],
    select: false // Don't include in regular queries
  },
  aiContext: {
    keyFeatures: [String],
    benefits: [String],
    pricingInfo: [String],
    useCases: [String],
    competitiveAdvantages: [String],
    objectionResponses: [{
      objection: String,
      response: String
    }],
    detailedSummary: String,
    targetAudience: [String],
    successStories: [String]
  },
  accessCount: {
    type: Number,
    default: 0
  },
  lastAccessed: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
documentSchema.index({ user: 1, createdAt: -1 });
documentSchema.index({ type: 1 });
documentSchema.index({ processed: 1 });
documentSchema.index({ tags: 1 });
documentSchema.index({ name: 'text', extractedText: 'text' });

// Virtual for file URL
documentSchema.virtual('fileUrl').get(function() {
  if (this.filePath) {
    return `/uploads/${this.filePath}`;
  }
  return this.url;
});

// Pre-save middleware
documentSchema.pre('save', function(next) {
  if (this.isModified('extractedText') && this.extractedText) {
    this.metadata.wordCount = this.extractedText.split(/\s+/).length;
  }
  next();
});

// Instance method to increment access count
documentSchema.methods.incrementAccess = function() {
  this.accessCount += 1;
  this.lastAccessed = new Date();
  return this.save({ validateBeforeSave: false });
};

// Static method to get user's document statistics
documentSchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalDocuments: { $sum: 1 },
        processedDocuments: {
          $sum: { $cond: [{ $eq: ['$processed', true] }, 1, 0] }
        },
        totalSize: { $sum: '$fileSize' },
        documentsByType: {
          $push: '$type'
        }
      }
    }
  ]);

  const result = stats[0] || {
    totalDocuments: 0,
    processedDocuments: 0,
    totalSize: 0,
    documentsByType: []
  };

  // Count documents by type
  const typeCount = {};
  result.documentsByType.forEach(type => {
    typeCount[type] = (typeCount[type] || 0) + 1;
  });
  result.documentsByType = typeCount;

  return result;
};

export default mongoose.model('Document', documentSchema);