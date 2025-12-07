// routes/payments.js
const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const Transaction = require("../models/transaction");
const User = require("../models/User");
const CleanerProfile = require("../models/CleanerProfile");
const IntaSend = require("intasend-node");
const { protect } = require("../middleware/auth");

// ============================================================
// PAYMENT INITIATION - Trigger M-Pesa STK Push
// ============================================================
router.post("/initiate", protect, async (req, res) => {
  try {
    const { bookingId, phoneNumber } = req.body;

    // Validate input
    if (!bookingId || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Booking ID and phone number are required",
      });
    }

    // Get booking and verify ownership
    const booking = await Booking.findOne({
      _id: bookingId,
      client: req.user.id,
      paymentStatus: "pending",
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found or already paid",
      });
    }

    // Initialize IntaSend client
    const intasend = new IntaSend(
      process.env.INTASEND_PUBLIC_KEY,
      process.env.INTASEND_SECRET_KEY,
      process.env.NODE_ENV !== "production", // true for test, false for production
    );

    // Format phone number: 254XXXXXXXXX (remove leading 0 or +)
    const formattedPhone = phoneNumber.replace(/^0/, "254").replace(/^\+/, "");

    console.log(`💳 Initiating payment for booking ${bookingId}`);
    console.log(`   Amount: KSh ${booking.price}`);
    console.log(`   Phone: ${formattedPhone}`);

    // Create M-Pesa STK Push collection
    const collection = intasend.collection();
    const response = await collection.mpesaStkPush({
      amount: booking.price,
      phone_number: formattedPhone,
      api_ref: bookingId.toString(),
      callback_url: `${process.env.BACKEND_URL || "https://clean-cloak-b.onrender.com"}/api/payments/webhook`,
      metadata: {
        booking_id: bookingId.toString(),
        client_id: req.user.id.toString(),
        service: booking.serviceCategory,
      },
    });

    console.log("✅ STK Push initiated successfully:", response);

    res.json({
      success: true,
      message: "STK push sent. Check your phone.",
      paymentReference: response.invoice?.invoice_id || response.id,
      tracking_id: response.tracking_id,
    });
  } catch (error) {
    console.error("❌ Payment initiation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to initiate payment",
      error: error.message,
    });
  }
});

// ============================================================
// PAYMENT STATUS - Check booking payment status
// ============================================================
router.get("/status/:bookingId", protect, async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.bookingId,
      client: req.user.id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    res.json({
      success: true,
      paymentStatus: booking.paymentStatus,
      paid: booking.paid,
      paidAt: booking.paidAt,
      transactionId: booking.transactionId,
    });
  } catch (error) {
    console.error("Payment status check error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment status",
    });
  }
});

// ============================================================
// WEBHOOK - Receive payment confirmation from IntaSend
// ============================================================
router.post(
  "/webhook",
  express.raw({ type: "application/json" }), // Important: raw body
  async (req, res) => {
    try {
      const data = JSON.parse(req.body);

      // Only process successful payments
      if (data.status === "COMPLETE") {
        const bookingId = data.metadata?.booking_id;

        // Safety check: make sure booking_id exists
        if (!bookingId) {
          console.log("Webhook: No booking_id in metadata");
          return res.json({ success: true });
        }

        const booking = await Booking.findById(bookingId).populate("cleaner");

        if (booking && !booking.paid) {
          // Calculate pricing split
          const pricing = booking.calculatePricing();

          // Update booking payment status
          booking.paid = true;
          booking.paidAt = new Date();
          booking.paymentStatus = "paid";
          booking.transactionId = data.id || data.transaction_id || "";
          await booking.save();

          // Create payment transaction record
          const paymentTransaction = new Transaction({
            booking: booking._id,
            client: booking.client,
            cleaner: booking.cleaner,
            type: "payment",
            amount: pricing.totalPrice,
            paymentMethod: booking.paymentMethod,
            transactionId: data.id || data.transaction_id || "",
            reference: `JOB_${booking._id}`,
            description: `Payment for cleaning service - ${booking.serviceCategory}`,
            status: "completed",
            processedAt: new Date(),
            metadata: {
              intasendData: data,
              split: {
                platformFee: pricing.platformFee,
                cleanerPayout: pricing.cleanerPayout,
              },
            },
          });
          await paymentTransaction.save();

          // Initiate cleaner M-Pesa payout
          await processCleanerPayout(booking, pricing.cleanerPayout);

          console.log(
            `Payment SUCCESS: KSh ${pricing.totalPrice} for JOB_${bookingId}`,
          );
          console.log(`Platform fee (40%): KSh ${pricing.platformFee}`);
          console.log(`Cleaner payout (60%): KSh ${pricing.cleanerPayout}`);
        } else if (booking?.paid) {
          console.log(`Payment already processed for JOB_${bookingId}`);
        }
      }

      // Always respond 200 to IntaSend
      res.json({ success: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(400).json({ success: false });
    }
  },
);

// Helper function to process cleaner M-Pesa payouts
async function processCleanerPayout(booking, payoutAmount) {
  try {
    // Get cleaner profile
    const cleanerProfile = await CleanerProfile.findOne({
      user: booking.cleaner,
    });

    if (!cleanerProfile) {
      throw new Error("Cleaner profile not found");
    }

    // Validate M-Pesa phone number
    if (!cleanerProfile.mpesaPhoneNumber) {
      throw new Error("Cleaner M-Pesa phone number not configured");
    }

    // Create payout transaction record
    const payoutTransaction = new Transaction({
      booking: booking._id,
      client: booking.client,
      cleaner: booking.cleaner,
      type: "payout",
      amount: payoutAmount,
      paymentMethod: "mpesa",
      transactionId: `PAYOUT_${Date.now()}_${booking._id}`,
      reference: `CLEANER_PAYOUT_JOB_${booking._id}`,
      description: `Cleaner payout for cleaning service - ${booking.serviceCategory}`,
      status: "pending",
      metadata: {
        mpesaPhone: cleanerProfile.mpesaPhoneNumber,
      },
    });

    await payoutTransaction.save();

    // Update booking payout status
    booking.payoutStatus = "pending";
    await booking.save();

    // Process M-Pesa payout
    await processMpesaPayout(
      payoutTransaction,
      cleanerProfile.mpesaPhoneNumber,
      payoutAmount,
    );
  } catch (error) {
    console.error("Error processing cleaner payout:", error);

    // Create failed transaction record
    const failedTransaction = new Transaction({
      booking: booking._id,
      client: booking.client,
      cleaner: booking.cleaner,
      type: "payout",
      amount: payoutAmount,
      paymentMethod: "mpesa",
      transactionId: `FAILED_PAYOUT_${Date.now()}_${booking._id}`,
      reference: `FAILED_CLEANER_PAYOUT_JOB_${booking._id}`,
      description: `Failed cleaner payout for cleaning service - ${booking.serviceCategory}`,
      status: "failed",
      metadata: {
        error: error.message,
        originalAmount: payoutAmount,
      },
    });

    await failedTransaction.save();

    booking.payoutStatus = "failed";
    await booking.save();
  }
}

// Process M-Pesa payout using IntaSend
async function processMpesaPayout(transaction, phoneNumber, amount) {
  try {
    // Initialise IntaSend client for payouts
    const client = new IntaSend(
      process.env.INTASEND_PUBLIC_KEY,
      process.env.INTASEND_SECRET_KEY,
      process.env.NODE_ENV !== "production", // true = sandbox
    );

    const response = await client.transfer().mpesa({
      amount: amount,
      account: phoneNumber,
      narrative: `Cleaner payout for ${transaction.reference}`,
    });

    if (response.success) {
      // Update transaction as completed
      transaction.status = "completed";
      transaction.processedAt = new Date();
      transaction.transactionId = response.id;
      transaction.metadata.intasendResponse = response;
      await transaction.save();

      // Update booking payout status
      const booking = await Booking.findById(transaction.booking);
      booking.payoutStatus = "processed";
      booking.payoutProcessedAt = new Date();
      await booking.save();

      console.log(`M-Pesa payout SUCCESS: KSh ${amount} to ${phoneNumber}`);
    } else {
      throw new Error(response.message || "M-Pesa payout failed");
    }
  } catch (error) {
    console.error("M-Pesa payout error:", error);

    // Update transaction as failed
    transaction.status = "failed";
    transaction.metadata.error = error.message;
    await transaction.save();

    // Update booking payout status
    const booking = await Booking.findById(transaction.booking);
    booking.payoutStatus = "failed";
    await booking.save();

    throw error;
  }
}

module.exports = router;
