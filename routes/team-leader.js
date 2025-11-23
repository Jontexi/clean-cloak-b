const express = require('express');
const router = express.Router();
const Team = require('../models/team');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Transaction = require('../models/transaction');
const auth = require('../middleware/auth');

// @route   GET /api/team-leader/dashboard
// @desc    Get team leader dashboard data
// @access  Private (Team Leader only)
router.get('/dashboard', auth, async (req, res) => {
  try {
    const team = await Team.findOne({ teamLeader: req.user.id })
      .populate('teamLeader', 'name email phone')
      .populate('crewMembers', 'name email phone verificationStatus');
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    const teamBookings = await Booking.find({ team: team._id })
      .populate('client', 'name phone')
      .sort({ createdAt: -1 });

    const totalEarnings = teamBookings.reduce((total, booking) => {
      return total + (booking.totalAmount * 0.40); // 40% for team leader
    }, 0);

    res.json({
      success: true,
      data: {
        team,
        bookings: teamBookings,
        totalEarnings,
        crewCount: team.crewMembers.length,
        activeBookings: teamBookings.filter(b => b.status === 'active').length
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/team-leader/invite-crew
// @desc    Invite crew member to team
// @access  Private (Team Leader only)
router.post('/invite-crew', auth, async (req, res) => {
  try {
    const { email, phone, message } = req.body;

    const team = await Team.findOne({ teamLeader: req.user.id });
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check if user already exists
    let crewUser = await User.findOne({ email });
    if (!crewUser) {
      // Create new crew user
      crewUser = new User({
        name: email.split('@')[0], // Temporary name
        email,
        phone,
        role: 'cleaner',
        verificationStatus: 'pending'
      });
      await crewUser.save();
    }

    // Add to team crew members
    if (!team.crewMembers.includes(crewUser._id)) {
      team.crewMembers.push(crewUser._id);
      await team.save();
    }

    res.json({
      success: true,
      message: 'Crew member invited successfully',
      data: crewUser
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/team-leader/remove-crew/:crewId
// @desc    Remove crew member from team
// @access  Private (Team Leader only)
router.delete('/remove-crew/:crewId', auth, async (req, res) => {
  try {
    const team = await Team.findOne({ teamLeader: req.user.id });
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    team.crewMembers = team.crewMembers.filter(
      crew => crew.toString() !== req.params.crewId
    );
    await team.save();

    res.json({
      success: true,
      message: 'Crew member removed successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/team-leader/earnings
// @desc    Get team leader earnings
// @access  Private (Team Leader only)
router.get('/earnings', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const team = await Team.findOne({ teamLeader: req.user.id });
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    const query = { team: team._id };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const bookings = await Booking.find(query);
    const transactions = await Transaction.find({ 
      team: team._id,
      recipient: req.user.id,
      type: 'team_leader_commission'
    });

    const totalEarnings = bookings.reduce((total, booking) => {
      return total + (booking.totalAmount * 0.40); // 40% commission
    }, 0);

    const paidEarnings = transactions.reduce((total, transaction) => {
      return total + transaction.amount;
    }, 0);

    res.json({
      success: true,
      data: {
        totalEarnings,
        paidEarnings,
        pendingEarnings: totalEarnings - paidEarnings,
        bookings,
        transactions
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/team-leader/auto-assignment
// @desc    Enable/disable auto team assignment
// @access  Private (Team Leader only)
router.put('/auto-assignment', auth, async (req, res) => {
  try {
    const { enabled } = req.body;
    
    const team = await Team.findOne({ teamLeader: req.user.id });
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    team.autoAssignment = enabled;
    await team.save();

    res.json({
      success: true,
      message: `Auto assignment ${enabled ? 'enabled' : 'disabled'}`,
      data: { autoAssignment: enabled }
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