const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cleaner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  serviceCategory: {
    type: String,
    enum: ['car-detailing', 'home-cleaning'],
    required: true
  },
  // Car Detailing Fields - NEW STRUCTURE
  vehicleType: {
    type: String,
    enum: ['SEDAN', 'MID-SUV', 'SUV-DOUBLE-CAB']
  },
  carServicePackage: {
    type: String,
    enum: ['NORMAL-DETAIL', 'INTERIOR-STEAMING', 'PAINT-CORRECTION', 'FULL-DETAIL', 'FLEET-PACKAGE']
  },
  paintCorrectionStage: {
    type: String,
    enum: ['STAGE-1', 'STAGE-2', 'STAGE-3']
  },
  midSUVPricingTier: {
    type: String,
    enum: ['STANDARD', 'PREMIUM']
  },
  fleetCarCount: {
    type: Number,
    min: 5  // Minimum 5 cars for fleet package
  },
  selectedCarExtras: [{
    type: String,
    enum: ['plastic-restoration', 'rust-removal', 'de-greasing', 'brown-stain-removal']
  }],
  // Home Cleaning Fields - NEW STRUCTURE
  cleaningCategory: {
    type: String,
    enum: ['HOUSE_CLEANING', 'FUMIGATION', 'MOVE_IN_OUT', 'POST_CONSTRUCTION']
  },
  houseCleaningType: {
    type: String,
    enum: ['BATHROOM', 'WINDOW', 'ROOM']
  },
  fumigationType: {
    type: String,
    enum: ['GENERAL', 'BED_BUG']
  },
  roomSize: {
    type: String,
    enum: ['STUDIO', '1BED', '2BED', '3BED', '4BED', '5BED']
  },
  bathroomItems: {
    general: { type: Boolean, default: false },
    sink: { type: Boolean, default: false },
    toilet: { type: Boolean, default: false }
  },
  windowCount: {
    small: { type: Number, default: 0 },
    large: { type: Number, default: 0 },
    wholeHouse: { type: Boolean, default: false }
  },
  bookingType: {
    type: String,
    enum: ['immediate', 'scheduled'],
    default: 'immediate'
  },
  scheduledDate: {
    type: String
  },
  scheduledTime: {
    type: String
  },
  paymentMethod: {
    type: String,
    enum: ['mpesa', 'card', 'cash'],
    default: 'mpesa'
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  totalPrice: {
    type: Number,
    default: 0
  },
  platformFee: {
    type: Number,
    default: 0
  },
  cleanerPayout: {
    type: Number,
    default: 0
  },
  location: {
    address: String,
    coordinates: [Number], // [longitude, latitude]
    manualAddress: String
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paid: {
    type: Boolean,
    default: false
  },
  paidAt: {
    type: Date
  },
  payoutStatus: {
    type: String,
    enum: ['pending', 'processed', 'failed'],
    default: 'pending'
  },
  transactionId: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  review: {
    type: String,
    maxlength: 500
  },
  completedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Calculate pricing split (60% cleaner, 40% platform)
bookingSchema.methods.calculatePricing = function () {
  const totalPrice = this.price || 0;
  const platformFee = Math.round(totalPrice * 0.4); // 40% platform
  const cleanerPayout = Math.round(totalPrice * 0.6); // 60% cleaner

  return {
    totalPrice,
    platformFee,
    cleanerPayout
  };
};

// Define indexes
bookingSchema.index({ client: 1, createdAt: -1 });
bookingSchema.index({ cleaner: 1, status: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ serviceCategory: 1 });
bookingSchema.index({ paymentStatus: 1 });

module.exports = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);;

