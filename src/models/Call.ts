import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICall extends Document {
  callerId: Types.ObjectId;
  receiverId: Types.ObjectId;
  status: 'requested' | 'active' | 'ended' | 'declined' | 'missed';
  durationSeconds: number;
  coinsDeducted: number;
  ratePerMinute: number;
  rating?: number;
  review?: string;
  compliments?: string[];
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const callSchema = new Schema<ICall>(
  {
    callerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
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
    rating: {
      type: Number,
      default: null,
    },
    review: {
      type: String,
      default: '',
    },
    compliments: {
      type: [String],
      default: [],
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

callSchema.index({ callerId: 1, createdAt: -1 });
callSchema.index({ receiverId: 1, createdAt: -1 });
callSchema.index({ status: 1 });

export const Call = mongoose.model<ICall>('Call', callSchema);

