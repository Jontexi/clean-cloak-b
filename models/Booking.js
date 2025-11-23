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
    required: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  service: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending'
  },
  type: {
    type: String,
    enum: ['one_time', 'recurring'],
    default: 'one_time'
  },
  scheduledAt: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// ✅ Define schema-level indexes (no duplicates)
bookingSchema.index({ client: 1, createdAt: -1 });
bookingSchema.index({ cleaner: 1, status: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ type: 1 });

module.exports = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);

