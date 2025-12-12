const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const CleanerProfile = require('../models/CleanerProfile');
const User = require('../models/User');

// @route   POST /api/cleaners/profile
// @desc    Create cleaner profile
// @access  Private (Cleaner or Client for initial submission)
router.post('/profile', protect, authorize('cleaner', 'client'), async (req, res) => {
  try {
    // Check if profile already exists
    const existingProfile = await CleanerProfile.findOne({ user: req.user.id });
    if (existingProfile) {
      return res.status(400).json({
        success: false,
        message: 'Profile already exists. Use PUT to update.'
      });
    }

    const profile = await CleanerProfile.create({
      user: req.user.id,
      ...req.body
    });

    res.status(201).json({
      success: true,
      message: 'Profile created successfully',
      profile
    });
  } catch (error) {
    console.error('Create profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating profile',
      error: error.message
    });
  }
});

// @route   GET /api/cleaners/profile
// @desc    Get logged in cleaner's profile
// @access  Private (Cleaner)
router.get('/profile', protect, authorize('cleaner'), async (req, res) => {
  try {
    const profile = await CleanerProfile.findOne({ user: req.user.id }).populate('user', 'name email phone');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    res.json({
      success: true,
      profile
    });
  } catch (error) {
    console.error('Fetch profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
});

// @route   PUT /api/cleaners/profile
// @desc    Update cleaner profile
// @access  Private (Cleaner)
router.put('/profile', protect, authorize('cleaner'), async (req, res) => {
  try {
    let profile = await CleanerProfile.findOne({ user: req.user.id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    profile = await CleanerProfile.findOneAndUpdate(
      { user: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
});

// @route   GET /api/cleaners
// @desc    Get all available cleaners (with filters)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { service, city, minRating } = req.query;

    let query = { isAvailable: true };

    if (service) {
      query.services = service;
    }

    if (city) {
      query.city = new RegExp(city, 'i');
    }

    if (minRating) {
      query.rating = { $gte: parseFloat(minRating) };
    }

    const cleaners = await CleanerProfile.find(query)
      .populate('user', 'name phone profileImage')
      .sort({ rating: -1, completedJobs: -1 });

    res.json({
      success: true,
      count: cleaners.length,
      cleaners
    });
  } catch (error) {
    console.error('Fetch cleaners error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cleaners'
    });
  }
});

// @route   GET /api/cleaners/:id
// @desc    Get single cleaner profile
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const profile = await CleanerProfile.findById(req.params.id)
      .populate('user', 'name phone email profileImage');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Cleaner profile not found'
      });
    }

    res.json({
      success: true,
      profile
    });
  } catch (error) {
    console.error('Fetch cleaner error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cleaner profile'
    });
  }
});

module.exports = router;
