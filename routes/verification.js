const express = require('express');
const router = express.Router();
const User = require('../models/User');
const CleanerProfile = require('../models/CleanerProfile');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// @route   POST /api/verification/submit-profile
// @desc    Submit cleaner profile for verification
// @access  Private (Cleaner only)
router.post('/submit-profile', auth, upload.array('documents', 5), async (req, res) => {
  try {
    const {
      fullName,
      idNumber,
      phone,
      address,
      experience,
      services,
      emergencyContact,
      references
    } = req.body;

    // Check if user already has a profile
    let profile = await CleanerProfile.findOne({ user: req.user.id });
    
    if (profile) {
      // Update existing profile
      profile.fullName = fullName;
      profile.idNumber = idNumber;
      profile.phone = phone;
      profile.address = address;
      profile.experience = experience;
      profile.services = JSON.parse(services);
      profile.emergencyContact = JSON.parse(emergencyContact);
      profile.references = JSON.parse(references);
      profile.verificationStatus = 'pending';
      
      if (req.files && req.files.length > 0) {
        profile.documents = req.files.map(file => ({
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          uploadDate: new Date()
        }));
      }
    } else {
      // Create new profile
      profile = new CleanerProfile({
        user: req.user.id,
        fullName,
        idNumber,
        phone,
        address,
        experience,
        services: JSON.parse(services),
        emergencyContact: JSON.parse(emergencyContact),
        references: JSON.parse(references),
        documents: req.files ? req.files.map(file => ({
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          uploadDate: new Date()
        })) : [],
        verificationStatus: 'pending'
      });
    }

    await profile.save();

    // Update user verification status
    await User.findByIdAndUpdate(req.user.id, {
      verificationStatus: 'pending'
    });

    res.json({
      success: true,
      message: 'Profile submitted for verification',
      data: profile
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/verification/pending-profiles
// @desc    Get all pending verification profiles
// @access  Private (Admin only)
router.get('/pending-profiles', auth, async (req, res) => {
  try {
    const profiles = await CleanerProfile.find({ verificationStatus: 'pending' })
      .populate('user', 'name email phone')
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      data: profiles
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/verification/approve-profile/:profileId
// @desc    Approve a verification profile
// @access  Private (Admin only)
router.put('/approve-profile/:profileId', auth, async (req, res) => {
  try {
    const { profileId } = req.params;
    const { adminNotes } = req.body;

    const profile = await CleanerProfile.findById(profileId)
      .populate('user');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    // Update profile status
    profile.verificationStatus = 'approved';
    profile.verifiedAt = new Date();
    profile.verifiedBy = req.user.id;
    profile.adminNotes = adminNotes;
    await profile.save();

    // Update user status
    await User.findByIdAndUpdate(profile.user._id, {
      verificationStatus: 'verified',
      isActive: true
    });

    res.json({
      success: true,
      message: 'Profile approved successfully',
      data: profile
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/verification/reject-profile/:profileId
// @desc    Reject a verification profile
// @access  Private (Admin only)
router.put('/reject-profile/:profileId', auth, async (req, res) => {
  try {
    const { profileId } = req.params;
    const { rejectionReason, adminNotes } = req.body;

    const profile = await CleanerProfile.findById(profileId)
      .populate('user');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    // Update profile status
    profile.verificationStatus = 'rejected';
    profile.rejectionReason = rejectionReason;
    profile.adminNotes = adminNotes;
    profile.verifiedAt = new Date();
    profile.verifiedBy = req.user.id;
    await profile.save();

    // Update user status
    await User.findByIdAndUpdate(profile.user._id, {
      verificationStatus: 'rejected',
      isActive: false
    });

    res.json({
      success: true,
      message: 'Profile rejected',
      data: profile
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/verification/my-profile
// @desc    Get current user's verification profile
// @access  Private
router.get('/my-profile', auth, async (req, res) => {
  try {
    const profile = await CleanerProfile.findOne({ user: req.user.id })
      .populate('user', 'name email phone verificationStatus');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/verification/verified-cleaners
// @desc    Get all verified cleaners
// @access  Public
router.get('/verified-cleaners', async (req, res) => {
  try {
    const cleaners = await CleanerProfile.find({ verificationStatus: 'approved' })
      .populate('user', 'name phone email')
      .select('-documents -idNumber');

    res.json({
      success: true,
      data: cleaners
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;