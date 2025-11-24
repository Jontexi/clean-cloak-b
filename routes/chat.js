const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const ChatRoom = require('../models/ChatRoom');
const Booking = require('../models/Booking');

// @route   POST /api/chat
// @desc    Create chat room for a booking
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if chat room already exists
    let chatRoom = await ChatRoom.findOne({ booking: bookingId });
    
    if (chatRoom) {
      return res.json({
        success: true,
        chatRoom
      });
    }

    // Create new chat room
    chatRoom = await ChatRoom.create({
      booking: bookingId,
      client: booking.client,
      cleaner: booking.cleaner
    });

    res.status(201).json({
      success: true,
      chatRoom
    });
  } catch (error) {
    console.error('Create chat room error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating chat room'
    });
  }
});

// @route   GET /api/chat/:bookingId
// @desc    Get chat room for a booking
// @access  Private
router.get('/:bookingId', protect, async (req, res) => {
  try {
    const chatRoom = await ChatRoom.findOne({ booking: req.params.bookingId })
      .populate('client', 'name phone profileImage')
      .populate('cleaner', 'name phone profileImage');

    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }

    // Check authorization
    if (chatRoom.client._id.toString() !== req.user.id && 
        chatRoom.cleaner._id.toString() !== req.user.id &&
        req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this chat'
      });
    }

    // Mark messages as read
    const userRole = chatRoom.client._id.toString() === req.user.id ? 'client' : 'cleaner';
    await chatRoom.markAsRead(userRole);

    res.json({
      success: true,
      chatRoom
    });
  } catch (error) {
    console.error('Get chat room error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching chat room'
    });
  }
});

// @route   POST /api/chat/:bookingId/message
// @desc    Send a message
// @access  Private
router.post('/:bookingId/message', protect, async (req, res) => {
  try {
    const { message, imageUrl } = req.body;

    const chatRoom = await ChatRoom.findOne({ booking: req.params.bookingId });

    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }

    // Check authorization
    if (chatRoom.client.toString() !== req.user.id && 
        chatRoom.cleaner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send messages in this chat'
      });
    }

    // Determine sender role
    const senderRole = chatRoom.client.toString() === req.user.id ? 'client' : 'cleaner';

    // Add message
    await chatRoom.addMessage(req.user.id, senderRole, message, imageUrl);

    res.json({
      success: true,
      message: 'Message sent successfully',
      chatRoom
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending message'
    });
  }
});

// @route   GET /api/chat
// @desc    Get all chat rooms for logged in user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const query = {
      $or: [
        { client: req.user.id },
        { cleaner: req.user.id }
      ],
      active: true
    };

    const chatRooms = await ChatRoom.find(query)
      .populate('client', 'name phone profileImage')
      .populate('cleaner', 'name phone profileImage')
      .populate('booking', 'serviceCategory status')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      count: chatRooms.length,
      chatRooms
    });
  } catch (error) {
    console.error('Get chat rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching chat rooms'
    });
  }
});

module.exports = router;
