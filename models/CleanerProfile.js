const mongoose = require("mongoose");

const referenceSchema = new mongoose.Schema(
  {
    name: String,
    phone: String,
    relationship: String,
    verified: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

const approvalHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      required: true,
    },
    notes: String,
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const beforeAfterPhotoSchema = new mongoose.Schema(
  {
    bookingId: String,
    beforeImage: String,
    afterImage: String,
    description: String,
    uploadedBy: String,
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    servicesUsed: [String],
  },
  { _id: false },
);

const cleanerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    firstName: {
      type: String,
      trim: true,
      default: "",
    },
    lastName: {
      type: String,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    profileImage: {
      type: String,
      default: "",
    },
    passportPhoto: {
      type: String,
      default: "",
    },
    fullBodyPhoto: {
      type: String,
      default: "",
    },
    services: [
      {
        type: String,
        enum: ["car-detailing", "home-cleaning"],
        required: true,
      },
    ],
    bio: {
      type: String,
      maxlength: [500, "Bio must be less than 500 characters"],
      default: "",
    },
    address: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    portfolioImages: [
      {
        type: String,
      },
    ],
    beforeAfterPhotos: [beforeAfterPhotoSchema],
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvalNotes: {
      type: String,
      maxlength: 500,
      default: "",
    },
    approvalHistory: [approvalHistorySchema],
    approvedAt: Date,
    rejectedAt: Date,
    // Statistics
    totalJobs: {
      type: Number,
      default: 0,
    },
    completedJobs: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
    // Verification
    verified: {
      type: Boolean,
      default: false,
    },
    verification: {
      idVerified: {
        type: Boolean,
        default: false,
      },
      idNumber: String,
      idDocumentFront: String,
      idDocumentBack: String,
      policeCheck: {
        type: Boolean,
        default: false,
      },
      policeCertificate: String,
      references: [referenceSchema],
      insuranceCoverage: {
        type: Boolean,
        default: false,
      },
      insuranceDocument: String,
      verifiedAt: Date,
    },
    // Payment Details
    mpesaPhoneNumber: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          if (!v) return false;
          // Accept multiple formats: 2547XXXXXXXX, 07XXXXXXXX, +2547XXXXXXXX
          const cleaned = v.replace(/[\s\-+]/g, "");
          return /^(254|0)[17]\d{8}$/.test(cleaned);
        },
        message:
          "M-Pesa phone number must be a valid Kenyan number (254XXXXXXXXX, 07XXXXXXXX, or +254XXXXXXXXX)",
      },
    },
    // Availability
    isAvailable: {
      type: Boolean,
      default: true,
    },
    workingHours: {
      start: {
        type: String,
        default: "08:00",
      },
      end: {
        type: String,
        default: "18:00",
      },
    },
    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Method to update rating
cleanerProfileSchema.methods.updateRating = function (newRating) {
  this.totalRatings += 1;
  this.rating =
    (this.rating * (this.totalRatings - 1) + newRating) / this.totalRatings;
  return this.save();
};

// Helper method to get M-Pesa phone in correct format (2547XXXXXXXX)
cleanerProfileSchema.methods.getInternationalMpesaPhone = function () {
  if (!this.mpesaPhoneNumber) return null;

  // Remove any spaces, dashes, or plus signs
  let cleaned = this.mpesaPhoneNumber.replace(/[\s\-+]/g, "");

  // If starts with 0, replace with 254
  if (cleaned.startsWith("0")) {
    return "254" + cleaned.substring(1);
  }

  // If already starts with 254, return as is
  if (cleaned.startsWith("254")) {
    return cleaned;
  }

  // Default: assume local format and prepend 254
  return "254" + cleaned;
};

// Index for faster queries
// Note: user index is already created by unique: true constraint
cleanerProfileSchema.index({ services: 1, isAvailable: 1 });
cleanerProfileSchema.index({ city: 1, services: 1 });
cleanerProfileSchema.index({ approvalStatus: 1, createdAt: -1 });

module.exports = mongoose.model("CleanerProfile", cleanerProfileSchema);
