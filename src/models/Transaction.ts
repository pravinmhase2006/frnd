import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ITransaction extends Document {
  userId: Types.ObjectId;
  type: 'coin_recharge' | 'call_spend' | 'gift_spend' | 'creator_earning' | 'withdrawal';
  coins: number;
  amountRupees: number;
  title: string;
  status: 'completed' | 'pending' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
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

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);
