const mongoose = require('mongoose');

const trackingSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
    // ❌ removed index: true to avoid duplicate with schema.index()
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
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// ✅ Keep schema-level indexes only (no duplicates)
trackingSchema.index({ booking: 1 });
trackingSchema.index({ cleaner: 1, status: 1 });

module.exports = mongoose.models.Tracking || mongoose.model('Tracking', trackingSchema);

