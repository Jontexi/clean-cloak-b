const mongoose = require('mongoose');

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
  paymentMethod: {
    type: String,
    enum: ['mpesa', 'card', 'cash'],
    default: 'mpesa'
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
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  processedAt: {
    type: Date
  },
  metadata: {
    intasendData: Object,
    split: {
      platformFee: Number,
      cleanerPayout: Number
    },
    mpesaPhone: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

// ✅ Fix: prevent OverwriteModelError by reusing existing model if already compiled
module.exports = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);


