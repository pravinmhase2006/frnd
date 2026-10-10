import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMessage {
  _id?: Types.ObjectId;
  senderId: Types.ObjectId;
  senderName: string;
  text: string;
  type: 'text' | 'gift' | 'audio' | 'system';
  giftCoins?: number;
  isRead: boolean;
  createdAt: Date;
}

export interface IChat extends Document {
  participants: Types.ObjectId[];
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    senderId: {
      type: Schema.Types.ObjectId,
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

const chatSchema = new Schema<IChat>(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
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
    messages: [messageSchema],
  },
  {
    timestamps: true,
  },
);

export const Chat = mongoose.model<IChat>('Chat', chatSchema);
