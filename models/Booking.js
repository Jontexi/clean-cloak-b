const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cleaner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  serviceCategory: {
    type: String,
    enum: ['car-detailing', 'home-cleaning'],
    required: true
  },
  // Car Detailing fields
  vehicleType: {
    type: String,
    enum: ['SUV', 'MID-SUV', 'SALOON'],
    required: function() { return this.serviceCategory === 'car-detailing'; }
  },
  carServiceOption: {
    type: String,
    enum: ['INTERIOR', 'EXTERIOR', 'PAINT', 'FULL'],
    required: function() { return this.serviceCategory === 'car-detailing'; }
  },
  // Home Cleaning fields
  propertySize: {
    type: String,
    enum: ['SMALL', 'MEDIUM', 'LARGE'],
    required: function() { return this.serviceCategory === 'home-cleaning'; }
  },
  cleaningServiceOption: {
    type: String,
    enum: ['STANDARD', 'DEEP', 'CARPET', 'WINDOW', 'POST_CONSTRUCTION', 'MOVE_IN_OUT'],
    required: function() { return this.serviceCategory === 'home-cleaning'; }
  },
  // Location
  location: {
    address: String,
    manualAddress: String,
    latitude: Number,
    longitude: Number
  },
  // Scheduling
  bookingType: {
    type: String,
    enum: ['immediate', 'scheduled'],
    required: true
  },
  scheduledDate: {
    type: String,
    required: function() { return this.bookingType === 'scheduled'; }
  },
  scheduledTime: {
    type: String,
    required: function() { return this.bookingType === 'scheduled'; }
  },
  // Payment
  paymentMethod: {
    type: String,
    enum: ['mpesa', 'card', 'cash'],
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  platformFee: {
    type: Number,
    required: true,
    min: 0
  },
  cleanerPayout: {
    type: Number,
    required: true,
    min: 0
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
    type: Date,
    default: null
  },
  transactionId: {
    type: String,
    default: ''
  },
  payoutStatus: {
    type: String,
    enum: ['pending', 'processed', 'failed'],
    default: 'pending'
  },
  payoutProcessedAt: {
    type: Date,
    default: null
  },
  // Status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  // Rating
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  review: {
    type: String,
    default: ''
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Transaction Schema
const transactionSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cleaner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['payment', 'payout', 'refund'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'KES'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['mpesa', 'card', 'cash', 'bank_transfer'],
    required: true
  },
  transactionId: {
    type: String,
    required: true
  },
  reference: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  processedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
transactionSchema.index({ booking: 1 });
transactionSchema.index({ client: 1, createdAt: -1 });
transactionSchema.index({ cleaner: 1, createdAt: -1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ type: 1 });

// Index for faster queries
bookingSchema.index({ client: 1, createdAt: -1 });
bookingSchema.index({ cleaner: 1, status: 1 });
bookingSchema.index({ status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
module.exports.Transaction = mongoose.model('Transaction', transactionSchema);
