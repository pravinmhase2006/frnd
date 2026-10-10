const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['coin_recharge', 'call_spend', 'gift_spend', 'creator_earning', 'withdrawal'],
      required: true,
    },
    coins: {
      type: Number,
      default: 0,
    },
    amountRupees: {
      type: Number,
      default: 0,
    },
    title: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['completed', 'pending', 'failed'],
      default: 'completed',
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Transaction', transactionSchema);
