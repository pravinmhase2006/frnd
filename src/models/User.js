const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    age: {
      type: Number,
      required: true,
      min: 18,
    },
    role: {
      type: String,
      enum: ['female', 'male'],
      required: true,
    },
    avatar: {
      type: String,
      default: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=250',
    },
    bio: {
      type: String,
      default: '',
      maxlength: 250,
    },
    interests: {
      type: [String],
      default: [],
    },
    language: {
      type: String,
      default: 'Hindi, English',
    },
    location: {
      type: String,
      default: 'India',
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    isOnline: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'blocked'],
      default: 'active',
    },
    coins: {
      type: Number,
      default: 120, // default coin balance for male users to make calls
    },
    earnings: {
      type: Number,
      default: 0, // rupees or coins earned for female creators
    },
    callRate: {
      type: Number,
      default: 20, // coins per minute
    },
    rating: {
      type: Number,
      default: 4.8,
    },
    totalCalls: {
      type: Number,
      default: 12,
    },
    totalTalkMinutes: {
      type: Number,
      default: 48,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('User', userSchema);
