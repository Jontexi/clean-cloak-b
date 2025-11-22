const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Tracking = require('../models/Tracking');
const Booking = require('../models/Booking');

// @route   POST /api/tracking
// @desc    Start tracking for a booking
// @access  Private (Cleaner)
router.post('/', protect, authorize('cleaner'), async (req, res) => {
  try {
    const { bookingId, latitude, longitude, address } = req.body;

    // Check if booking exists and belongs to cleaner
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.cleaner?.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to track this booking'
      });
    }

    // Create or update tracking
    let tracking = await Tracking.findOne({ booking: bookingId });
    
    if (tracking) {
      tracking.currentLocation = { latitude, longitude, address };
      tracking.locationHistory.push({ latitude, longitude });
      await tracking.save();
    } else {
      tracking = await Tracking.create({
        booking: bookingId,
        cleaner: req.user.id,
        currentLocation: { latitude, longitude, address },
        locationHistory: [{ latitude, longitude }]
      });
    }

    res.json({
      success: true,
      tracking
    });
  } catch (error) {
    console.error('Start tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting tracking'
    });
  }
});

// @route   GET /api/tracking/:bookingId
// @desc    Get tracking data for a booking
// @access  Private
router.get('/:bookingId', protect, async (req, res) => {
  try {
    const tracking = await Tracking.findOne({ booking: req.params.bookingId })
      .populate('cleaner', 'name phone profileImage');

    if (!tracking) {
      return res.status(404).json({
        success: false,
        message: 'Tracking not found'
      });
    }

    // Check authorization
    const booking = await Booking.findById(req.params.bookingId);
    if (booking.client.toString() !== req.user.id && 
        booking.cleaner?.toString() !== req.user.id &&
        req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this tracking'
      });
    }

    res.json({
      success: true,
      tracking
    });
  } catch (error) {
    console.error('Get tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tracking data'
    });
  }
});

// @route   PUT /api/tracking/:bookingId/location
// @desc    Update cleaner location
// @access  Private (Cleaner)
router.put('/:bookingId/location', protect, authorize('cleaner'), async (req, res) => {
  try {
    const { latitude, longitude, address } = req.body;

    const tracking = await Tracking.findOne({ booking: req.params.bookingId });

    if (!tracking) {
      return res.status(404).json({
        success: false,
        message: 'Tracking not found'
      });
    }

    if (tracking.cleaner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    tracking.currentLocation = { latitude, longitude, address };
    tracking.locationHistory.push({ latitude, longitude });
    await tracking.save();

    res.json({
      success: true,
      tracking
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating location'
    });
  }
});

// @route   PUT /api/tracking/:bookingId/status
// @desc    Update tracking status
// @access  Private (Cleaner)
router.put('/:bookingId/status', protect, authorize('cleaner'), async (req, res) => {
  try {
    const { status, estimatedArrival } = req.body;

    const tracking = await Tracking.findOne({ booking: req.params.bookingId });

    if (!tracking) {
      return res.status(404).json({
        success: false,
        message: 'Tracking not found'
      });
    }

    if (tracking.cleaner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    tracking.status = status;
    if (estimatedArrival) {
      tracking.estimatedArrival = estimatedArrival;
    }
    await tracking.save();

    res.json({
      success: true,
      tracking
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating status'
    });
  }
});

module.exports = router;
