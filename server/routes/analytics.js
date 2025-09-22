import express from "express";
import { authenticate } from "../middleware/auth.js";
import {
  getDashboardAnalytics,
  getPerformanceAnalytics,
} from "../controllers/analyticsController.js";

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get dashboard analytics data
router.get("/", getDashboardAnalytics);

// Get performance analytics
router.get("/performance", getPerformanceAnalytics);

// Get AI suggestion statistics for the authenticated user
router.get("/ai-suggestions", authenticate, async (req, res) => {
  try {
    const { timeRange = 30, detailed = false } = req.query;
    const userId = req.user._id.toString();

    console.log(
      `📊 Getting AI suggestion stats for user: ${userId}, timeRange: ${timeRange}days`
    );

    const AISuggestion = (await import("../models/AISuggestion.js")).default;

    let stats;
    if (detailed === "true") {
      stats = await AISuggestion.getDetailedUserStats(
        userId,
        parseInt(timeRange)
      );
    } else {
      stats = await AISuggestion.getUserSuggestionCount(userId);
    }

    console.log(`✅ AI suggestion stats retrieved:`, {
      userId,
      totalSuggestions: stats.total || stats.totalSuggestions,
      usedSuggestions: stats.used || stats.usedSuggestions,
      timeRange,
    });

    res.json({
      success: true,
      data: {
        userId,
        timeRange: parseInt(timeRange),
        ...stats,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching AI suggestion statistics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch AI suggestion statistics",
      error: error.message,
    });
  }
});

// Get AI suggestion statistics by type for the authenticated user
router.get("/ai-suggestions/by-type", authenticate, async (req, res) => {
  try {
    const { timeRange = 30 } = req.query;
    const userId = req.user._id.toString();

    console.log(`📊 Getting AI suggestion stats by type for user: ${userId}`);

    const AISuggestion = (await import("../models/AISuggestion.js")).default;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeRange));

    const typeStats = await AISuggestion.aggregate([
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
          highConfidence: {
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
        },
      },
      { $sort: { total: -1 } },
    ]);

    console.log(`✅ AI suggestion type stats retrieved for user: ${userId}`);

    res.json({
      success: true,
      data: {
        userId,
        timeRange: parseInt(timeRange),
        byType: typeStats,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching AI suggestion type statistics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch AI suggestion type statistics",
      error: error.message,
    });
  }
});

export default router;
