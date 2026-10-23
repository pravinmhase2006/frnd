import mongoose, { Document, Schema } from 'mongoose';

export interface IOtpDocument extends Document {
  phone: string; // Normalized phone string, e.g. "919876543210"
  hashedOtp: string; // HMAC-SHA256 hashed code (never plaintext)
  expiresAt: Date;
  lastSentAt: Date;
  attempts: number; // Verification attempts counter
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const otpSchema = new Schema<IOtpDocument>(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    hashedOtp: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB TTL auto-purge
    },
    lastSentAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    attempts: {
      type: Number,
      required: true,
      default: 0,
    },
    verified: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const OtpModel = mongoose.model<IOtpDocument>('OtpVerification', otpSchema);
