import express from "express";
import { authenticate } from "../middleware/auth.js"; // Import the named export
import { catchAsync } from "../middleware/errorHandler.js";

const router = express.Router();

// GET /api/calls - Get all calls for user
router.get(
  "/",
  authenticate, // Use the authenticate middleware
  catchAsync(async (req, res) => {
    const {
      page = 1,
      limit = 10,
      status,
      platform,
      sort = "createdAt:desc",
    } = req.query;

    const Call = (await import("../models/Call.js")).default;

    const filter = { user: req.user._id };
    if (status) filter.status = status;
    if (platform) filter.platform = platform;

    const [sortField, sortOrder] = sort.split(":");
    const sortOptions = { [sortField]: sortOrder === "desc" ? -1 : 1 };

    const calls = await Call.find(filter)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Call.countDocuments(filter);

    res.json({
      success: true,
      data: {
        calls,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      },
    });
  })
);

// GET /api/calls/:id - Get specific call
router.get(
  "/:id",
  authenticate,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const Call = (await import("../models/Call.js")).default;

    let call = null;
    try {
      call = await Call.findById(id);
    } catch (error) {
      // Try by meetingId if not found by _id
      call = await Call.findOne({ meetingId: id });
    }

    if (!call) {
      return res.status(404).json({
        success: false,
        message: "Call not found",
      });
    }

    if (call.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this call",
      });
    }

    res.json({
      success: true,
      data: call,
    });
  })
);

// POST /api/calls - Create new call with duplicate prevention
router.post(
  "/",
  authenticate,
  catchAsync(async (req, res) => {
    const Call = (await import("../models/Call.js")).default;

    // Check for existing call with same meetingId to prevent duplicates
    if (req.body.meetingId) {
      const existingCall = await Call.findOne({
        meetingId: req.body.meetingId,
        user: req.user._id,
        status: { $in: ["scheduled", "active", "in_progress"] },
      });

      if (existingCall) {
        console.log(
          `📝 Found existing call for meetingId ${req.body.meetingId}: ${existingCall._id}`
        );
        return res.status(200).json({
          success: true,
          message: "Using existing call",
          data: existingCall,
        });
      }
    }

    const callData = {
      ...req.body,
      user: req.user._id,
    };

    const call = await Call.create(callData);

    console.log(`✅ New call created: ${call._id} for user: ${req.user._id}`);

    res.status(201).json({
      success: true,
      message: "Call created successfully",
      data: call,
    });
  })
);

// PATCH /api/calls/:id - Update call
router.patch(
  "/:id",
  authenticate,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    console.log(`📝 PATCH /calls/${id} - Updates:`, updates);

    try {
      const Call = (await import("../models/Call.js")).default;

      // Find call by ID or meetingId
      let call = null;

      try {
        call = await Call.findById(id);
        if (call) {
          console.log(
            `📝 Found call by ID: ${call._id}, current status: ${call.status}, duration: ${call.duration}`
          );
        }
      } catch (error) {
        console.log(`📝 Could not find call by ID: ${id}`);
      }

      if (!call) {
        call = await Call.findOne({ meetingId: id });
        if (call) {
          console.log(
            `📝 Found call by meetingId: ${call._id}, current status: ${call.status}, duration: ${call.duration}`
          );
        }
      }

      if (!call) {
        console.log(`❌ No call found for ID: ${id}`);
        return res.status(404).json({
          success: false,
          message: "Call not found",
        });
      }

      // Check if user owns the call
      if (call.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to update this call",
        });
      }

      // Store old values for logging
      const oldStatus = call.status;
      const oldDuration = call.duration;

      // Update the call with provided data
      Object.keys(updates).forEach((key) => {
        if (key !== "_id" && key !== "user" && key !== "createdAt") {
          call[key] = updates[key];
        }
      });

      // Save the updated call
      const updatedCall = await call.save();

      console.log(`✅ Call updated successfully:`, {
        callId: updatedCall._id,
        oldStatus,
        newStatus: updatedCall.status,
        oldDuration,
        newDuration: updatedCall.duration,
        updatedFields: Object.keys(updates),
      });

      res.json({
        success: true,
        message: "Call updated successfully",
        data: updatedCall,
      });
    } catch (error) {
      console.error(`❌ Failed to update call ${id}:`, error);
      res.status(500).json({
        success: false,
        message: "Failed to update call",
        error: error.message,
      });
    }
  })
);

// DELETE /api/calls/:id - Delete call
router.delete(
  "/:id",
  authenticate,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const Call = (await import("../models/Call.js")).default;

    let call = null;
    try {
      call = await Call.findById(id);
    } catch (error) {
      call = await Call.findOne({ meetingId: id });
    }

    if (!call) {
      return res.status(404).json({
        success: false,
        message: "Call not found",
      });
    }

    if (call.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this call",
      });
    }

    await Call.findByIdAndDelete(call._id);

    res.json({
      success: true,
      message: "Call deleted successfully",
    });
  })
);

// Start call (update status to active)
router.patch(
  "/:id/start",
  authenticate,
  catchAsync(async (req, res) => {
    const Call = (await import("../models/Call.js")).default;

    const call = await Call.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      {
        status: "active",
        startTime: new Date(),
      },
      { new: true }
    );

    if (!call) {
      return res.status(404).json({
        success: false,
        message: "Call not found",
      });
    }

    res.json({
      success: true,
      message: "Call started successfully",
      data: {
        call,
      },
    });
  })
);

// End call (update status to completed)
router.patch(
  "/:id/end",
  authenticate,
  catchAsync(async (req, res) => {
    const Call = (await import("../models/Call.js")).default;

    const call = await Call.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      {
        status: "completed",
        endTime: new Date(),
      },
      { new: true }
    );

    if (!call) {
      return res.status(404).json({
        success: false,
        message: "Call not found",
      });
    }

    res.json({
      success: true,
      message: "Call ended successfully",
      data: {
        call,
      },
    });
  })
);

export default router;
