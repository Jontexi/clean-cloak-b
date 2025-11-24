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
  vehicleType: {
    type: String,
    enum: ['sedan', 'suv', 'van', 'truck', 'motorcycle', 'other']
  },
  carServiceOption: {
    type: String,
    enum: ['INTERIOR', 'EXTERIOR', 'PAINT', 'FULL']
  },
  propertySize: {
    type: String,
    enum: ['studio', '1br', '2br', '3br', '4br+', 'office', 'commercial']
  },
  cleaningServiceOption: {
    type: String,
    enum: ['basic', 'deep', 'move-in', 'post-construction', 'regular']
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
bookingSchema.methods.calculatePricing = function() {
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

