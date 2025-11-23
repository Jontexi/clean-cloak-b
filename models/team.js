const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  teamLeader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  crewMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  teamName: {
    type: String,
    required: true,
    trim: true
  },
  autoAssignment: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
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

module.exports = mongoose.model('Team', teamSchema);