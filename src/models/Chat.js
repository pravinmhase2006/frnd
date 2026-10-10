const mongoose = require('mongoose');

const messageSubSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderName: {
      type: String,
      default: '',
    },
    text: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['text', 'gift', 'audio', 'system'],
      default: 'text',
    },
    giftCoins: {
      type: Number,
      default: 0,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const chatSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    lastMessage: {
      type: String,
      default: '',
    },
    lastMessageTime: {
      type: Date,
      default: Date.now,
    },
    unreadCount: {
      type: Number,
      default: 0,
    },
    messages: [messageSubSchema],
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Chat', chatSchema);
