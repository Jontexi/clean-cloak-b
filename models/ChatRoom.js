const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderRole: {
    type: String,
    enum: ['client', 'cleaner'],
    required: true
  },
  message: {
    type: String,
    required: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  imageUrl: {
    type: String,
    default: ''
  },
  readByClient: {
    type: Boolean,
    default: false
  },
  readByCleaner: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const chatRoomSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    unique: true
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
  messages: [messageSchema],
  lastMessage: {
    type: String,
    default: ''
  },
  lastMessageTime: {
    type: Date,
    default: Date.now
  },
  unreadClientCount: {
    type: Number,
    default: 0
  },
  unreadCleanerCount: {
    type: Number,
    default: 0
  },
  active: {
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

// Method to add a message
chatRoomSchema.methods.addMessage = async function(senderId, senderRole, message, imageUrl = '') {
  const newMessage = {
    sender: senderId,
    senderRole,
    message,
    imageUrl,
    timestamp: new Date()
  };

  this.messages.push(newMessage);
  this.lastMessage = message;
  this.lastMessageTime = new Date;

  // Update unread counts
  if (senderRole === 'client') {
    this.unreadCleanerCount += 1;
    // Mark as read by client
    newMessage.readByClient = true;
  } else {
    this.unreadClientCount += 1;
    // Mark as read by cleaner
    newMessage.readByCleaner = true;
  }

  return this.save();
};

// Method to mark messages as read
chatRoomSchema.methods.markAsRead = async function(userRole) {
  const unreadMessages = this.messages.filter(msg => {
    if (userRole === 'client') {
      return !msg.readByClient && msg.senderRole === 'cleaner';
    } else {
      return !msg.readByCleaner && msg.senderRole === 'client';
    }
  });

  unreadMessages.forEach(msg => {
    if (userRole === 'client') {
      msg.readByClient = true;
    } else {
      msg.readByCleaner = true;
    }
  });

  // Reset unread count
  if (userRole === 'client') {
    this.unreadClientCount = 0;
  } else {
    this.unreadCleanerCount = 0;
  }

  return this.save();
};

// Indexes for performance
chatRoomSchema.index({ booking: 1 });
chatRoomSchema.index({ client: 1, active: 1 });
chatRoomSchema.index({ cleaner: 1, active: 1 });
chatRoomSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
