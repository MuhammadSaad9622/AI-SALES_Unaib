import mongoose from "mongoose";

const transcriptSchema = new mongoose.Schema(
  {
    call: {
      type: String,
      required: [true, "Transcript must belong to a call"],
    },
    speaker: {
      type: String,
      required: [true, "Speaker is required"],
      trim: true,
      maxlength: [100, "Speaker name cannot exceed 100 characters"],
    },
    text: {
      type: String,
      required: [true, "Transcript text is required"],
      maxlength: [5000, "Transcript text cannot exceed 5000 characters"],
    },
    confidence: {
      type: Number,
      required: [true, "Confidence score is required"],
      min: [0, "Confidence cannot be less than 0"],
      max: [1, "Confidence cannot be greater than 1"],
    },
    timestamp: {
      type: Date,
      required: [true, "Timestamp is required"],
      default: Date.now,
    },
    startTime: {
      type: Number, // Seconds from call start
      min: [0, "Start time cannot be negative"],
    },
    endTime: {
      type: Number, // Seconds from call start
      min: [0, "End time cannot be negative"],
    },
    words: [
      {
        text: String,
        start: Number,
        end: Number,
        confidence: Number,
      },
    ],
    sentiment: {
      type: String,
      enum: ["positive", "neutral", "negative"],
    },
    sentimentScore: {
      type: Number,
      min: [-1, "Sentiment score cannot be less than -1"],
      max: [1, "Sentiment score cannot be greater than 1"],
    },
    entities: [
      {
        text: String,
        label: String,
        confidence: Number,
      },
    ],
    language: {
      type: String,
      default: "en",
    },
    processed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
transcriptSchema.index({ call: 1, timestamp: 1 });
transcriptSchema.index({ speaker: 1 });
transcriptSchema.index({ sentiment: 1 });
transcriptSchema.index({ createdAt: -1 });
transcriptSchema.index({ text: "text" }); // Text search index

// Virtual for duration
transcriptSchema.virtual("duration").get(function () {
  if (this.endTime && this.startTime) {
    return this.endTime - this.startTime;
  }
  return 0;
});

// Static method to get call transcript summary
transcriptSchema.statics.getCallSummary = async function (callId) {
  const summary = await this.aggregate([
    { $match: { call: new mongoose.Types.ObjectId(callId) } },
    { $sort: { timestamp: 1 } },
    {
      $group: {
        _id: "$speaker",
        totalWords: { $sum: { $size: { $split: ["$text", " "] } } },
        totalTime: { $sum: { $subtract: ["$endTime", "$startTime"] } },
        averageConfidence: { $avg: "$confidence" },
        sentimentCounts: {
          $push: "$sentiment",
        },
        transcriptCount: { $sum: 1 },
      },
    },
  ]);

  return summary;
};

// Static method to search transcripts
transcriptSchema.statics.searchTranscripts = async function (
  userId,
  query,
  options = {}
) {
  const { limit = 20, skip = 0, callId } = options;

  const matchStage = {
    $text: { $search: query },
  };

  // If callId is provided, filter by specific call
  if (callId) {
    matchStage.call = new mongoose.Types.ObjectId(callId);
  }

  const pipeline = [
    { $match: matchStage },
    {
      $lookup: {
        from: "calls",
        localField: "call",
        foreignField: "_id",
        as: "callInfo",
      },
    },
    { $unwind: "$callInfo" },
    { $match: { "callInfo.user": new mongoose.Types.ObjectId(userId) } },
    { $sort: { score: { $meta: "textScore" }, timestamp: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $project: {
        text: 1,
        speaker: 1,
        timestamp: 1,
        confidence: 1,
        call: 1,
        "callInfo.title": 1,
        "callInfo.startTime": 1,
        score: { $meta: "textScore" },
      },
    },
  ];

  return await this.aggregate(pipeline);
};

export default mongoose.model("Transcript", transcriptSchema);
