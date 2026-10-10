import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICall extends Document {
  callerId: Types.ObjectId;
  receiverId: Types.ObjectId;
  status: 'requested' | 'active' | 'ended' | 'declined' | 'missed';
  durationSeconds: number;
  coinsDeducted: number;
  ratePerMinute: number;
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

export const Call = mongoose.model<ICall>('Call', callSchema);
