const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { protect, authorize } = require("../middleware/auth");
const Booking = require("../models/Booking");
const CleanerProfile = require("../models/CleanerProfile");
const User = require("../models/User");
const IntaSend = require("intasend-node"); // <-- NEW
const { v4: uuidv4 } = require("uuid");
// File system operations removed - using MongoDB only

const formatCurrency = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

// -------------------------------------------------
// 1.1 PUBLIC BOOKING (NO AUTH REQUIRED)
// -------------------------------------------------
router.post("/public", async (req, res) => {
  try {
    const {
      contact,
      serviceCategory,
      // Car Detailing Fields - NEW STRUCTURE
      vehicleType,
      carServicePackage,
      paintCorrectionStage,
      midSUVPricingTier,
      fleetCarCount,
      selectedCarExtras,
      // Home Cleaning Fields - NEW STRUCTURE
      cleaningCategory,
      houseCleaningType,
      fumigationType,
      roomSize,
      bathroomItems,
      windowCount,
      // Common Fields
      bookingType,
      scheduledDate,
      scheduledTime,
      paymentMethod,
      price,
      location,
      paymentStatus,
    } = req.body;

    if (!contact?.name || !contact?.phone || !contact?.email) {
      return res.status(400).json({
        success: false,
        message: "Contact name, phone, and email are required",
      });
    }

    if (
      !serviceCategory ||
      !bookingType ||
      !paymentMethod ||
      typeof price !== "number"
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required booking details",
      });
    }

    if (
      serviceCategory === "car-detailing" &&
      (!vehicleType || !carServicePackage)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Vehicle type and service package are required for car detailing bookings",
      });
    }

    if (serviceCategory === "home-cleaning" && !cleaningCategory) {
      return res.status(400).json({
        success: false,
        message: "Cleaning category is required for home cleaning bookings",
      });
    }

    if (bookingType === "scheduled" && (!scheduledDate || !scheduledTime)) {
      return res.status(400).json({
        success: false,
        message: "Scheduled bookings must include date and time",
      });
    }

    let user = await User.findOne({
      $or: [{ phone: contact.phone }, { email: contact.email }],
    });

    if (!user) {
      const generatedPassword = crypto.randomBytes(8).toString("hex");
      user = await User.create({
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        password: generatedPassword,
        role: "client",
      });
    }

    const bookingPayload = {
      serviceCategory,
      // Car Detailing Fields
      vehicleType,
      carServicePackage,
      paintCorrectionStage,
      midSUVPricingTier,
      fleetCarCount,
      selectedCarExtras,
      // Home Cleaning Fields
      cleaningCategory,
      houseCleaningType,
      fumigationType,
      roomSize,
      bathroomItems,
      windowCount,
      // Common Fields
      bookingType,
      scheduledDate,
      scheduledTime,
      paymentMethod,
      price,
      location,
      paymentStatus: paymentStatus || "pending",
      client: user._id,
    };

    const booking = await Booking.create(bookingPayload);

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      booking,
    });
  } catch (error) {
    console.error("Public booking creation error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating booking",
      error: error.message,
    });
  }
});

// -------------------------------------------------
// 1. CREATE BOOKING (AUTHENTICATED)
// -------------------------------------------------
router.post("/", protect, async (req, res) => {
  try {
    const bookingData = {
      ...req.body,
      client: req.user.id,
    };

    const booking = await Booking.create(bookingData);

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      booking,
    });
  } catch (error) {
    console.error("Booking creation error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating booking",
      error: error.message,
    });
  }
});

// -------------------------------------------------
// 2. GET ALL BOOKINGS FOR LOGGED-IN USER
// -------------------------------------------------
router.get("/", protect, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === "client") {
      query.client = req.user.id;
    } else if (req.user.role === "cleaner") {
      query.cleaner = req.user.id;
    }

    const bookings = await Booking.find(query)
      .populate("client", "name phone email")
      .populate("cleaner", "name phone email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("Fetch bookings error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching bookings",
    });
  }
});

// -------------------------------------------------
// 2b. CLEANER OPPORTUNITIES FEED (requires auth)
// -------------------------------------------------
router.get(
  "/opportunities",
  protect,
  authorize("cleaner"),
  async (req, res) => {
    try {
      const {
        serviceCategory = "car-detailing",
        statuses,
        limit = 25,
        page = 1,
      } = req.query;

      const statusList =
        typeof statuses === "string" && statuses.length
          ? statuses
              .split(",")
              .map((status) => status.trim())
              .filter(Boolean)
          : ["pending", "confirmed"];

      const pageSize = Math.min(Number(limit) || 25, 100);
      const pageNumber = Math.max(Number(page) || 1, 1);
      const skip = (pageNumber - 1) * pageSize;

      const query = {
        serviceCategory,
        cleaner: null,
      };

      if (statusList.length) {
        query.status = { $in: statusList };
      }

      const [bookings, total] = await Promise.all([
        Booking.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(pageSize)
          .select(
            "serviceCategory bookingType status price vehicleType carServiceOption location scheduledDate scheduledTime createdAt",
          ),
        Booking.countDocuments(query),
      ]);

      const currencyFormatter = new Intl.NumberFormat("en-KE", {
        style: "currency",
        currency: "KES",
        maximumFractionDigits: 0,
      });

      const carServiceLabels = {
        INTERIOR: "Interior Detail",
        EXTERIOR: "Exterior Detail",
        PAINT: "Paint Correction",
        FULL: "Full Detail",
      };

      const opportunities = bookings.map((booking) => {
        const title = [
          carServiceLabels[booking.carServiceOption] || "Car Detailing",
          booking.vehicleType,
        ]
          .filter(Boolean)
          .join(" · ");

        const timing =
          booking.bookingType === "scheduled" && booking.scheduledDate
            ? `${booking.scheduledDate}${booking.scheduledTime ? ` · ${booking.scheduledTime}` : ""}`
            : "Immediate dispatch";

        const requirements = [
          booking.vehicleType ? `Vehicle: ${booking.vehicleType}` : null,
          booking.carServiceOption
            ? `Package: ${booking.carServiceOption}`
            : null,
          `Status: ${booking.status}`,
        ].filter(Boolean);

        return {
          id: booking._id.toString(),
          bookingId: booking._id.toString(),
          title,
          location:
            booking.location?.manualAddress ||
            booking.location?.address ||
            "Client to confirm exact location",
          payout: currencyFormatter.format(booking.price || 0),
          timing,
          requirements,
          serviceCategory: booking.serviceCategory,
          priority: booking.price >= 15000 ? "featured" : "standard",
          saved: false,
          createdAt:
            booking.createdAt?.toISOString?.() || new Date().toISOString(),
        };
      });

      res.json({
        success: true,
        count: opportunities.length,
        total,
        page: pageNumber,
        pageSize,
        opportunities,
      });
    } catch (error) {
      console.error("Fetch opportunities error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching booking opportunities",
      });
    }
  },
);

// -------------------------------------------------
// 3. GET SINGLE BOOKING
// -------------------------------------------------
router.get("/:id", protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("client", "name phone email")
      .populate("cleaner", "name phone email");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (
      booking.client._id.toString() !== req.user.id &&
      booking.cleaner?._id.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this booking",
      });
    }

    res.json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error("Fetch booking error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching booking",
    });
  }
});

// -------------------------------------------------
// 4. PAY FOR A BOOKING – STK PUSH + 60/40 SPLIT
// -------------------------------------------------
router.post("/:id/pay", protect, authorize("client"), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("client", "phone")
      .populate("cleaner", "phone");

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    // Only the client who created it can pay
    if (booking.client._id.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    if (booking.status !== "confirmed") {
      return res
        .status(400)
        .json({ success: false, message: "Booking must be confirmed first" });
    }

    if (booking.paid) {
      return res.status(400).json({ success: false, message: "Already paid" });
    }

    // Initialise IntaSend client
    const client = new IntaSend(
      process.env.INTASEND_PUBLISHABLE_KEY,
      process.env.INTASEND_SECRET_KEY,
      process.env.NODE_ENV !== "production", // true = sandbox
    );

    // Calculate pricing split
    const pricing = booking.calculatePricing();

    // Update booking with calculated pricing
    booking.totalPrice = pricing.totalPrice;
    booking.platformFee = pricing.platformFee;
    booking.cleanerPayout = pricing.cleanerPayout;
    await booking.save();

    const response = await client.collection().stkPush({
      amount: pricing.totalPrice,
      phone: booking.client.phone,
      reference: `JOB_${booking._id}`,
      description: `Cleaning Job #${booking._id}`,
      callback_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
      metadata: {
        booking_id: booking._id.toString(),
        split: {
          cleaner_phone: booking.cleaner.phone,
          percentage: 60, // 60% TO CLEANER
          platform_fee: pricing.platformFee,
          cleaner_payout: pricing.cleanerPayout,
        },
      },
    });

    res.json({
      success: true,
      message: "STK Push sent – check your phone",
      checkout_id: response.id,
    });
  } catch (error) {
    console.error("Payment initiation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start payment",
      error: error.message,
    });
  }
});

// -------------------------------------------------
// 5. UPDATE BOOKING STATUS (cleaner / admin)
// -------------------------------------------------
router.put(
  "/:id/status",
  protect,
  authorize("cleaner", "admin"),
  async (req, res) => {
    try {
      const { status } = req.body;
      const booking = await Booking.findById(req.params.id);
      if (!booking)
        return res.status(404).json({ success: false, message: "Not found" });

      if (
        req.user.role === "cleaner" &&
        booking.cleaner?.toString() !== req.user.id
      ) {
        return res
          .status(403)
          .json({ success: false, message: "Not authorized" });
      }

      booking.status = status;
      if (status === "completed") booking.completedAt = new Date();
      await booking.save();

      res.json({ success: true, message: "Status updated", booking });
    } catch (error) {
      res.status(500).json({ success: false, message: "Update failed" });
    }
  },
);

// -------------------------------------------------
// 6. RATE A COMPLETED BOOKING (client)
// -------------------------------------------------
// Support both PUT and POST for frontend compatibility
const rateBookingHandler = async (req, res) => {
  try {
    const { rating, review } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking)
      return res.status(404).json({ success: false, message: "Not found" });

    if (booking.client.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    if (booking.status !== "completed") {
      return res
        .status(400)
        .json({ success: false, message: "Must be completed" });
    }

    booking.rating = rating;
    booking.review = review || "";
    await booking.save();

    if (booking.cleaner) {
      const profile = await CleanerProfile.findOne({ user: booking.cleaner });
      if (profile) await profile.updateRating(rating);
    }

    res.json({ success: true, message: "Rating saved", booking });
  } catch (error) {
    res.status(500).json({ success: false, message: "Rating failed" });
  }
};

// Support both PUT and POST methods
router.put("/:id/rating", protect, authorize("client"), rateBookingHandler);
router.post("/:id/rating", protect, authorize("client"), rateBookingHandler);

// -------------------------------------------------
// MARK BOOKING AS COMPLETE (Cleaner)
// -------------------------------------------------
router.post(
  "/:id/complete",
  protect,
  authorize("cleaner", "admin"),
  async (req, res) => {
    try {
      const { beforePhotos, afterPhotos, notes } = req.body;
      const booking = await Booking.findById(req.params.id);

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found",
        });
      }

      // Verify cleaner owns this booking
      if (
        req.user.role === "cleaner" &&
        booking.cleaner?.toString() !== req.user.id
      ) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to complete this booking",
        });
      }

      // Check if already completed
      if (booking.status === "completed") {
        return res.status(400).json({
          success: false,
          message: "Booking already marked as completed",
        });
      }

      // Update booking status
      booking.status = "completed";
      booking.completedAt = new Date();

      // Set payment deadline: 2 hours from now
      const paymentDeadline = new Date();
      paymentDeadline.setHours(paymentDeadline.getHours() + 2);
      booking.paymentDeadline = paymentDeadline;

      // Add photos if provided (optional)
      if (beforePhotos) booking.beforePhotos = beforePhotos;
      if (afterPhotos) booking.afterPhotos = afterPhotos;
      if (notes) booking.completionNotes = notes;

      await booking.save();

      console.log(`✅ Booking ${booking._id} marked as completed by cleaner`);
      console.log(
        `⏰ Payment deadline set to: ${paymentDeadline.toISOString()}`,
      );

      // TODO: Send notification to client to review and pay
      // This would integrate with your notification system

      res.json({
        success: true,
        message: "Job marked as completed. Client will be notified to pay.",
        booking,
        paymentDeadline,
      });
    } catch (error) {
      console.error("Complete booking error:", error);
      res.status(500).json({
        success: false,
        message: "Error completing booking",
        error: error.message,
      });
    }
  },
);

// -------------------------------------------------
// REQUEST PAYMENT (After Rating)
// -------------------------------------------------
router.post(
  "/:id/request-payment",
  protect,
  authorize("client"),
  async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.id);

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found",
        });
      }

      // Verify client owns this booking
      if (booking.client.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Not authorized",
        });
      }

      // Check if already paid
      if (booking.paid) {
        return res.status(400).json({
          success: false,
          message: "Booking already paid",
        });
      }

      // Check if completed
      if (booking.status !== "completed") {
        return res.status(400).json({
          success: false,
          message: "Booking must be completed before payment",
        });
      }

      // Check if rated (rating is required before payment)
      if (!booking.rating) {
        return res.status(400).json({
          success: false,
          message: "Please rate the service before making payment",
        });
      }

      // Check payment deadline
      if (booking.paymentDeadline && new Date() > booking.paymentDeadline) {
        console.warn(`⚠️ Payment deadline exceeded for booking ${booking._id}`);
        // Still allow payment but flag it
        booking.paymentLate = true;
      }

      res.json({
        success: true,
        message: "Ready to process payment",
        booking: {
          _id: booking._id,
          price: booking.price,
          status: booking.status,
          completedAt: booking.completedAt,
          paymentDeadline: booking.paymentDeadline,
          rating: booking.rating,
          review: booking.review,
        },
      });
    } catch (error) {
      console.error("Request payment error:", error);
      res.status(500).json({
        success: false,
        message: "Error processing payment request",
        error: error.message,
      });
    }
  },
);

// -------------------------------------------------
// GET UNPAID COMPLETED BOOKINGS (Client)
// -------------------------------------------------
router.get("/unpaid", protect, authorize("client"), async (req, res) => {
  try {
    const bookings = await Booking.find({
      client: req.user.id,
      status: "completed",
      paid: false,
    })
      .populate("cleaner", "name phone")
      .sort({ completedAt: -1 });

    // Add time remaining for each booking
    const bookingsWithDeadline = bookings.map((booking) => {
      const timeRemaining = booking.paymentDeadline
        ? Math.max(0, booking.paymentDeadline - new Date())
        : null;

      return {
        ...booking.toObject(),
        timeRemainingMs: timeRemaining,
        isOverdue: timeRemaining !== null && timeRemaining <= 0,
      };
    });

    res.json({
      success: true,
      count: bookingsWithDeadline.length,
      bookings: bookingsWithDeadline,
    });
  } catch (error) {
    console.error("Fetch unpaid bookings error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching unpaid bookings",
    });
  }
});

// -------------------------------------------------
// 7. CANCEL BOOKING (client / admin)
// -------------------------------------------------
router.delete("/:id", protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking)
      return res.status(404).json({ success: false, message: "Not found" });

    if (
      booking.client.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    booking.status = "cancelled";
    await booking.save();

    res.json({ success: true, message: "Booking cancelled" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Cancel failed" });
  }
});

module.exports = router;
