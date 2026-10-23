import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  phone?: string;
  email: string;
  emailVerificationCode?: string;
  emailVerificationExpires?: Date;
  phoneVerificationCode?: string;
  phoneVerificationExpires?: Date;
  age: number;
  role: 'female' | 'male';
  avatar: string;
  bio: string;
  interests: string[];
  language: string;
  location: string;
  isVerified: boolean;
  isOnline: boolean;
  status: 'active' | 'pending' | 'blocked';
  coins: number;
  earnings: number;
  callRate: number;
  rating: number;
  totalCalls: number;
  totalTalkMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    emailVerificationCode: {
      type: String,
      default: null,
    },
    emailVerificationExpires: {
      type: Date,
      default: null,
    },
    phoneVerificationCode: {
      type: String,
      default: null,
    },
    phoneVerificationExpires: {
      type: Date,
      default: null,
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
      default: 120, // default coins for callers
    },
    earnings: {
      type: Number,
      default: 0, // rupee earnings for creators
    },
    callRate: {
      type: Number,
      default: 20, // coins/min
    },
    rating: {
      type: Number,
      default: 4.8,
    },
    totalCalls: {
      type: Number,
      default: 0,
    },
    totalTalkMinutes: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });
userSchema.index({ role: 1, isOnline: 1, rating: -1 });
userSchema.index({ rating: -1 });

export const User = mongoose.model<IUser>('User', userSchema);

