
const mongoose = require('mongoose');

const locationPointSchema = new mongoose.Schema({
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  address: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const trackingSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  cleaner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['assigned', 'in_progress', 'completed', 'cancelled'],
    default: 'assigned'
  },
  currentLocation: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  locationHistory: [locationPointSchema],
  estimatedArrival: String,
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
trackingSchema.index({ booking: 1 });
trackingSchema.index({ cleaner: 1, status: 1 });

module.exports = mongoose.models.Tracking || mongoose.model('Tracking', trackingSchema);
