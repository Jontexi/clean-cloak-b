const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const CleanerProfile = require('../models/CleanerProfile');

// GET verification status
router.get('/status', (req, res) => {
  res.json({ message: 'Verification status OK' });
});

// POST verification request
router.post('/verify', (req, res) => {
  res.json({ message: 'Verification request received' });
});

// POST resend verification
router.post('/resend', (req, res) => {
  res.json({ message: 'Verification code resent' });
});

// @route   GET /api/verification/pending-profiles
// @desc    Get all pending cleaner profiles for verification
// @access  Private (Admin)
router.get('/pending-profiles', protect, authorize('admin'), async (req, res) => {
  try {
    const { city, service, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let query = { approvalStatus: 'pending' };
    if (city) query.city = new RegExp(city, 'i');
    if (service) query.services = service;

    const [cleaners, total] = await Promise.all([
      CleanerProfile.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      CleanerProfile.countDocuments(query)
    ]);

    res.json({
      success: true,
      count: cleaners.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      cleaners
    });
  } catch (error) {
    console.error('Fetch pending profiles error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending profiles',
      error: error.message
    });
  }
});

module.exports = router;
});

module.exports = router;


