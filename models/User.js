const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a name"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name must be less than 50 characters"],
    },

    phone: {
      type: String,
      required: [true, "Please provide a phone number"],
      unique: true,
      match: [
        /^0[17]\d{8}$/,
        "Please provide a valid Kenyan phone number (07XXXXXXXX or 01XXXXXXXX)",
      ],
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: ["client", "cleaner", "admin", "team_leader"],
      default: "client",
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    profileImage: {
      type: String,
      default: "",
    },
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

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON response
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// Helper method to convert phone to international format for M-Pesa
userSchema.methods.getInternationalPhone = function () {
  if (!this.phone) return null;

  // Remove any spaces, dashes, or plus signs
  let cleaned = this.phone.replace(/[\s\-+]/g, "");

  // If starts with 0, replace with 254
  if (cleaned.startsWith("0")) {
    return "254" + cleaned.substring(1);
  }

  // If starts with 254, return as is
  if (cleaned.startsWith("254")) {
    return cleaned;
  }

  // If starts with +254, remove the plus
  if (cleaned.startsWith("254")) {
    return cleaned;
  }

  // Default: assume it's local format and prepend 254
  return "254" + cleaned;
};

// Helper method to format phone for display
userSchema.methods.getFormattedPhone = function () {
  const intlPhone = this.getInternationalPhone();
  if (!intlPhone) return this.phone;

  // Format as +254 712 345 678
  const match = intlPhone.match(/^254(\d{3})(\d{3})(\d{3})$/);
  if (match) {
    return `+254 ${match[1]} ${match[2]} ${match[3]}`;
  }

  return "+" + intlPhone;
};

module.exports = mongoose.model("User", userSchema);
