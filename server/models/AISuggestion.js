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

// Static method to get trending suggestions
aiSuggestionSchema.statics.getTrendingSuggestions = async function (
  timeRange = 7
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);

  return await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        used: true,
      },
    },
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
        averageRating: { $avg: "$feedback.rating" },
        averageConfidence: { $avg: "$confidence" },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);
};

export default mongoose.model("AISuggestion", aiSuggestionSchema);
