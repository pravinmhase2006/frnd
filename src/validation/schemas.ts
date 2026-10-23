import { z } from 'zod';

export const sendEmailSchema = z.object({
  email: z.string().trim().email('Invalid email address format'),
});

export const verifyEmailSchema = z.object({
  email: z.string().trim().email('Invalid email address format'),
  code: z.string().trim().min(4, 'Verification code must be at least 4 characters'),
  role: z.enum(['male', 'female']).optional(),
  name: z.string().trim().min(1).max(50).optional(),
  age: z.union([z.number().int().min(18, 'Must be at least 18 years old'), z.string()]).optional(),
});

export const sendOtpSchema = z.object({
  phone: z.string().trim().min(8, 'Phone number must be at least 8 digits'),
});

export const verifyOtpSchema = z.object({
  phone: z.string().trim().min(8, 'Phone number must be at least 8 digits'),
  otp: z.string().trim().min(4, 'OTP must be at least 4 digits'),
  role: z.enum(['male', 'female']).optional(),
  name: z.string().trim().min(1).max(50).optional(),
  age: z.union([z.number().int().min(18), z.string()]).optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  bio: z.string().max(250).optional(),
  interests: z.array(z.string()).optional(),
  age: z.number().int().min(18, 'Age must be at least 18').max(120).optional(),
  avatar: z.string().url().or(z.string().trim()).optional(),
  language: z.string().optional(),
  callRate: z.number().int().min(1).max(1000).optional(),
  isOnline: z.boolean().optional(),
});

export const requestCallSchema = z.object({
  callerId: z.string().min(1, 'Caller ID is required'),
  receiverId: z.string().min(1, 'Receiver ID is required'),
  ratePerMinute: z.number().int().positive().optional(),
});

export const endCallSchema = z.object({
  durationSeconds: z.number().min(0, 'Duration cannot be negative'),
});

export const rateCallSchema = z.object({
  rating: z.number().min(1).max(5, 'Rating must be between 1 and 5 stars'),
  compliments: z.array(z.string()).optional(),
  review: z.string().max(500).optional(),
});

export const sendMessageSchema = z.object({
  chatId: z.string().optional(),
  senderId: z.string().optional(),
  receiverId: z.string().optional(),
  senderName: z.string().optional(),
  receiverName: z.string().optional(),
  text: z.string().optional(),
  type: z.enum(['text', 'gift', 'audio', 'system']).optional(),
  giftCoins: z.number().min(0).optional(),
});

export const rechargeCoinsSchema = z.object({
  coins: z.number().int().positive('Coins must be a positive integer'),
  amountRupees: z.number().min(0, 'Rupee amount cannot be negative'),
  userId: z.string().optional(),
});

export const withdrawalSchema = z.object({
  amountRupees: z.number().positive('Withdrawal amount must be greater than zero'),
  upiId: z.string().trim().includes('@', { message: 'A valid UPI ID is required (e.g. name@paytm)' }),
  userId: z.string().optional(),
});
