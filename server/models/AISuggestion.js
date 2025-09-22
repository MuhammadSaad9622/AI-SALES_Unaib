import mongoose from "mongoose";

const aiSuggestionSchema = new mongoose.Schema(
  {
    call: {
      type: String,

      required: [true, "AI suggestion must belong to a call"],
    },
    user: {
      type: String,
      required: [true, "AI suggestion must belong to a user"],
    },
    type: {
      type: String,
      required: [true, "Suggestion type is required"],
      enum: [
        "objection_handling",
        "closing",
        "question",
        "pricing",
        "feature_highlight",
        "rapport_building",
        "next_steps",
        "follow_up",
      ],
    },
    text: {
      type: String,
      required: [true, "Suggestion text is required"],
      maxlength: [10000, "Suggestion text cannot exceed 10000 characters"],
    },
    confidence: {
      type: Number,
      required: [true, "Confidence score is required"],
      min: [0, "Confidence cannot be less than 0"],
      max: [1, "Confidence cannot be greater than 1"],
    },
    context: {
      type: String,
      maxlength: [2000, "Context cannot exceed 2000 characters"],
    },
    reasoning: {
      type: String,
      maxlength: [1000, "Reasoning cannot exceed 1000 characters"],
    },
    used: {
      type: Boolean,
      default: false,
    },
    usedAt: {
      type: Date,
    },
    feedback: {
      rating: {
        type: Number,
        min: [1, "Rating cannot be less than 1"],
        max: [5, "Rating cannot be greater than 5"],
      },
      comment: {
        type: String,
        maxlength: [500, "Feedback comment cannot exceed 500 characters"],
      },
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    triggerContext: {
      lastTranscripts: [String],
      detectedIntent: String,
      emotionalState: String,
      conversationPhase: {
        type: String,
        enum: [
          "opening",
          "discovery",
          "presentation",
          "objection",
          "closing",
          "follow_up",
        ],
      },
    },
    metadata: {
      modelVersion: String,
      processingTime: Number,
      documentSources: [String],
      relatedSuggestions: [mongoose.Schema.Types.ObjectId],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
aiSuggestionSchema.index({ call: 1, createdAt: -1 });
aiSuggestionSchema.index({ user: 1, createdAt: -1 });
aiSuggestionSchema.index({ type: 1 });
aiSuggestionSchema.index({ used: 1 });
aiSuggestionSchema.index({ confidence: -1 });
aiSuggestionSchema.index({ priority: 1 });

// Virtual for suggestion age
aiSuggestionSchema.virtual("age").get(function () {
  return Date.now() - this.createdAt.getTime();
});

// Pre-save middleware to set usedAt when used is set to true
aiSuggestionSchema.pre("save", function (next) {
  if (this.isModified("used") && this.used && !this.usedAt) {
    this.usedAt = new Date();
  }
  next();
});

// Instance method to mark as used
aiSuggestionSchema.methods.markAsUsed = function (feedback = null) {
  this.used = true;
  this.usedAt = new Date();
  if (feedback) {
    this.feedback = feedback;
  }
  return this.save();
};

// Static method to get suggestion statistics
aiSuggestionSchema.statics.getUserStats = async function (
  userId,
  timeRange = 30
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);

  const stats = await this.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: null,
        totalSuggestions: { $sum: 1 },
        usedSuggestions: {
          $sum: { $cond: [{ $eq: ["$used", true] }, 1, 0] },
        },
        averageConfidence: { $avg: "$confidence" },
        suggestionsByType: {
          $push: {
            type: "$type",
            used: "$used",
          },
        },
        averageRating: {
          $avg: {
            $cond: [
              { $ne: ["$feedback.rating", null] },
              "$feedback.rating",
              null,
            ],
          },
        },
      },
    },
  ]);

  const result = stats[0] || {
    totalSuggestions: 0,
    usedSuggestions: 0,
    averageConfidence: 0,
    suggestionsByType: [],
    averageRating: 0,
  };

  // Process suggestions by type
  const typeStats = {};
  result.suggestionsByType.forEach((item) => {
    if (!typeStats[item.type]) {
      typeStats[item.type] = { total: 0, used: 0 };
    }
    typeStats[item.type].total += 1;
    if (item.used) {
      typeStats[item.type].used += 1;
    }
  });
  result.suggestionsByType = typeStats;

  return result;
};

// Enhanced static method to get comprehensive suggestion statistics by user
aiSuggestionSchema.statics.getDetailedUserStats = async function (
  userId,
  timeRange = 30
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);

  // Main statistics aggregation
  const mainStats = await this.aggregate([
    {
      $match: {
        user: userId,
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: null,
        totalSuggestions: { $sum: 1 },
        usedSuggestions: {
          $sum: { $cond: [{ $eq: ["$used", true] }, 1, 0] },
        },
        averageConfidence: { $avg: "$confidence" },
        highConfidenceSuggestions: {
          $sum: { $cond: [{ $gte: ["$confidence", 0.8] }, 1, 0] },
        },
        averageRating: {
          $avg: {
            $cond: [
              { $ne: ["$feedback.rating", null] },
              "$feedback.rating",
              null,
            ],
          },
        },
        totalWithFeedback: {
          $sum: {
            $cond: [{ $ne: ["$feedback.rating", null] }, 1, 0],
          },
        },
      },
    },
  ]);

  // Statistics by type
  const typeStats = await this.aggregate([
    {
      $match: {
        user: userId,
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: "$type",
        total: { $sum: 1 },
        used: { $sum: { $cond: [{ $eq: ["$used", true] }, 1, 0] } },
        averageConfidence: { $avg: "$confidence" },
        averageRating: {
          $avg: {
            $cond: [
              { $ne: ["$feedback.rating", null] },
              "$feedback.rating",
              null,
            ],
          },
        },
      },
    },
    { $sort: { total: -1 } },
  ]);

  // Statistics by priority
  const priorityStats = await this.aggregate([
    {
      $match: {
        user: userId,
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: "$priority",
        total: { $sum: 1 },
        used: { $sum: { $cond: [{ $eq: ["$used", true] }, 1, 0] } },
      },
    },
    { $sort: { total: -1 } },
  ]);

  // Daily usage trends
  const dailyTrends = await this.aggregate([
    {
      $match: {
        user: userId,
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        totalSuggestions: { $sum: 1 },
        usedSuggestions: {
          $sum: { $cond: [{ $eq: ["$used", true] }, 1, 0] },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const result = mainStats[0] || {
    totalSuggestions: 0,
    usedSuggestions: 0,
    averageConfidence: 0,
    highConfidenceSuggestions: 0,
    averageRating: 0,
    totalWithFeedback: 0,
  };

  return {
    ...result,
    usageRate:
      result.totalSuggestions > 0
        ? result.usedSuggestions / result.totalSuggestions
        : 0,
    highConfidenceRate:
      result.totalSuggestions > 0
        ? result.highConfidenceSuggestions / result.totalSuggestions
        : 0,
    feedbackRate:
      result.totalSuggestions > 0
        ? result.totalWithFeedback / result.totalSuggestions
        : 0,
    byType: typeStats,
    byPriority: priorityStats,
    dailyTrends: dailyTrends,
    timeRange: timeRange,
  };
};

// Static method to get simple suggestion count by user
aiSuggestionSchema.statics.getUserSuggestionCount = async function (
  userId,
  filters = {}
) {
  const query = { user: userId, ...filters };

  const counts = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        used: { $sum: { $cond: [{ $eq: ["$used", true] }, 1, 0] } },
        unused: { $sum: { $cond: [{ $eq: ["$used", false] }, 1, 0] } },
      },
    },
  ]);

  return counts[0] || { total: 0, used: 0, unused: 0 };
};

export default mongoose.model("AISuggestion", aiSuggestionSchema);
