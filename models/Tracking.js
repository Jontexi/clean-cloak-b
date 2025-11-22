const mongoose = require('mongoose');

const trackingSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    unique: true
  },
  cleaner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  currentLocation: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    address: String
  },
  status: {
    type: String,
    enum: ['on-way', 'arrived', 'in-progress', 'completed'],
    default: 'on-way'
  },
  estimatedArrival: {
    type: Date
  },
  locationHistory: [{
    latitude: Number,
    longitude: Number,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
trackingSchema.index({ booking: 1 });
trackingSchema.index({ cleaner: 1, status: 1 });

// Update lastUpdated on save
trackingSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.model('Tracking', trackingSchema);
