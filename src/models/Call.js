const mongoose = require('mongoose');

const callSchema = new mongoose.Schema(
  {
    callerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['requested', 'active', 'ended', 'declined', 'missed'],
      default: 'requested',
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    coinsDeducted: {
      type: Number,
      default: 0,
    },
    ratePerMinute: {
      type: Number,
      default: 20,
    },
    startedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Call', callSchema);
