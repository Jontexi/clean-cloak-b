const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const CleanerProfile = require('../models/CleanerProfile');
const Booking = require('../models/Booking');
const User = require('../models/User');

// ============================================================
// CLEANER APPROVAL ENDPOINTS
// ============================================================

// @route   GET /api/admin/cleaners/pending
// @desc    Get all pending cleaner profiles for review
// @access  Private (Admin)
router.get('/cleaners/pending', protect, authorize('admin'), async (req, res) => {
  try {
    const { city, service, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let query = { approvalStatus: 'pending' };
    if (city) query.city = new RegExp(city, 'i');
    if (service) query.services = service;

    const [cleaners, total] = await Promise.all([
      CleanerProfile.find(query)
        .populate('user', 'name email phone')
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
    console.error('Fetch pending cleaners error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending cleaners',
      error: error.message
    });
  }
});

// @route   GET /api/admin/cleaners/approved
// @desc    Get all approved cleaner profiles
// @access  Private (Admin)
router.get('/cleaners/approved', protect, authorize('admin'), async (req, res) => {
  try {
    const { city, service, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let query = { approvalStatus: 'approved' };
    if (city) query.city = new RegExp(city, 'i');
    if (service) query.services = service;

    const [cleaners, total] = await Promise.all([
      CleanerProfile.find(query)
        .populate('user', 'name email phone')
        .sort({ approvedAt: -1 })
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
    console.error('Fetch approved cleaners error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching approved cleaners',
      error: error.message
    });
  }
});

// @route   GET /api/admin/cleaners/:id
// @desc    Get single cleaner profile for review
// @access  Private (Admin)
router.get('/cleaners/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const profile = await CleanerProfile.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('approvalHistory.admin', 'name email');

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
      message: 'Error fetching cleaner profile',
      error: error.message
    });
  }
});

// @route   PUT /api/admin/cleaners/:id/approve
// @desc    Approve a pending cleaner profile
// @access  Private (Admin)
router.put('/cleaners/:id/approve', protect, authorize('admin'), async (req, res) => {
  try {
    const { notes } = req.body;
    const profile = await CleanerProfile.findById(req.params.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Cleaner profile not found'
      });
    }

    if (profile.approvalStatus === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Cleaner is already approved'
      });
    }

    // Update approval status
    profile.approvalStatus = 'approved';
    profile.approvedAt = new Date();
    profile.approvalNotes = notes || '';

    // Add to approval history
    profile.approvalHistory.push({
      status: 'approved',
      notes: notes || 'Approved by admin',
      admin: req.user.id,
      changedAt: new Date()
    });

    await profile.save();

    res.json({
      success: true,
      message: `${profile.firstName} ${profile.lastName} approved successfully`,
      profile
    });
  } catch (error) {
    console.error('Approve cleaner error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving cleaner',
      error: error.message
    });
  }
});

// @route   PUT /api/admin/cleaners/:id/reject
// @desc    Reject a pending cleaner profile
// @access  Private (Admin)
router.put('/cleaners/:id/reject', protect, authorize('admin'), async (req, res) => {
  try {
    const { notes } = req.body;
    const profile = await CleanerProfile.findById(req.params.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Cleaner profile not found'
      });
    }

    if (profile.approvalStatus === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Cleaner is already rejected'
      });
    }

    // Update approval status
    profile.approvalStatus = 'rejected';
    profile.rejectedAt = new Date();
    profile.approvalNotes = notes || '';

    // Add to approval history
    profile.approvalHistory.push({
      status: 'rejected',
      notes: notes || 'Rejected by admin',
      admin: req.user.id,
      changedAt: new Date()
    });

    await profile.save();

    res.json({
      success: true,
      message: `${profile.firstName} ${profile.lastName} rejected`,
      profile
    });
  } catch (error) {
    console.error('Reject cleaner error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting cleaner',
      error: error.message
    });
  }
});

// ============================================================
// CLIENT OPERATIONS ENDPOINTS
// ============================================================

// @route   GET /api/admin/clients
// @desc    Get all clients with booking history
// @access  Private (Admin)
router.get('/clients', protect, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const bookings = await Booking.find()
      .populate('client', 'name email phone')
      .populate('cleaner', 'firstName lastName')
      .sort({ createdAt: -1 });

    // Aggregate client data
    const clientMap = new Map();
    bookings.forEach(booking => {
      const clientId = booking.client._id.toString();
      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, {
          clientId,
          name: booking.client.name,
          email: booking.client.email,
          phone: booking.client.phone,
          totalBookings: 0,
          totalSpent: 0,
          lastBooking: null,
          lastService: null,
          status: 'active'
        });
      }
      const client = clientMap.get(clientId);
      client.totalBookings += 1;
      client.totalSpent += booking.price || 0;
      if (!client.lastBooking || new Date(booking.createdAt) > new Date(client.lastBooking)) {
        client.lastBooking = booking.createdAt;
        client.lastService = booking.serviceCategory === 'car-detailing'
          ? (booking.carServicePackage || 'Car Detailing')
          : (booking.cleaningCategory || 'Home Cleaning');
      }
    });

    const clients = Array.from(clientMap.values()).slice((page - 1) * limit, page * limit);

    res.json({
      success: true,
      count: clients.length,
      total: clientMap.size,
      page: parseInt(page),
      pages: Math.ceil(clientMap.size / limit),
      clients
    });
  } catch (error) {
    console.error('Fetch clients error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching clients',
      error: error.message
    });
  }
});

// @route   GET /api/admin/bookings
// @desc    Get all bookings with filters
// @access  Private (Admin)
router.get('/bookings', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, serviceCategory, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (status) query.status = status;
    if (serviceCategory) query.serviceCategory = serviceCategory;

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('client', 'name email phone')
        .populate('cleaner', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Booking.countDocuments(query)
    ]);

    res.json({
      success: true,
      count: bookings.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      bookings
    });
  } catch (error) {
    console.error('Fetch bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings',
      error: error.message
    });
  }
});

// @route   GET /api/admin/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private (Admin)
router.get('/dashboard/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const [totalCleaners, pendingCleaners, approvedCleaners, totalBookings, completedBookings, totalRevenue] = await Promise.all([
      CleanerProfile.countDocuments(),
      CleanerProfile.countDocuments({ approvalStatus: 'pending' }),
      CleanerProfile.countDocuments({ approvalStatus: 'approved' }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'completed' }),
      Booking.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$price' } } }
      ])
    ]);

    const avgRating = await CleanerProfile.aggregate([
      { $match: { approvalStatus: 'approved' } },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ]);

    res.json({
      success: true,
      stats: {
        totalCleaners,
        pendingCleaners,
        approvedCleaners,
        totalBookings,
        completedBookings,
        totalRevenue: totalRevenue[0]?.total || 0,
        avgRating: avgRating[0]?.avgRating || 0
      }
    });
  } catch (error) {
    console.error('Fetch stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard stats',
      error: error.message
    });
  }
});

module.exports = router;
// ADMIN USER MANAGEMENT UTILITIES
// Add minimal admin-only endpoint to reset a user's password and optionally update role/name
router.put('/users/:phone/reset-password', protect, authorize('admin'), async (req, res) => {
  try {
    const { phone } = req.params;
    const { newPassword, role, name } = req.body || {};

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'newPassword is required and must be at least 6 characters' });
    }

    const user = await User.findOne({ phone }).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.password = newPassword;
    if (role) user.role = role;
    if (name) user.name = name;
    await user.save();

    res.json({
      success: true,
      message: 'User credentials updated',
      user: { id: user._id, name: user.name, phone: user.phone, role: user.role }
    });
  } catch (error) {
    console.error('Admin reset password error:', error);
    res.status(500).json({ success: false, message: 'Error updating user', error: error.message });
  }
});
