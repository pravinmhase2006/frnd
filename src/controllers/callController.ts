import { Request, Response } from 'express';
import { Call } from '../models/Call.js';
import { User } from '../models/User.js';
import { Transaction } from '../models/Transaction.js';
import mongoose from 'mongoose';

export const requestCall = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { callerId, receiverId, ratePerMinute } = req.body;

    if (!callerId || !receiverId) {
      return res.status(400).json({ success: false, message: 'Caller and receiver IDs are required.' });
    }

    const caller = await User.findById(callerId);
    if (caller && caller.coins < (ratePerMinute || 20)) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient coins. Please recharge your wallet.',
      });
    }

    const call = await Call.create({
      callerId: new mongoose.Types.ObjectId(callerId),
      receiverId: new mongoose.Types.ObjectId(receiverId),
      status: 'active',
      ratePerMinute: ratePerMinute || 20,
      startedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: 'Call started successfully',
      data: call,
    });
  } catch (error) {
    console.error('Request call error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const endCall = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { durationSeconds } = req.body;

    const call = await Call.findById(id);
    if (!call) {
      return res.status(404).json({ success: false, message: 'Call not found' });
    }

    const seconds = durationSeconds || 60;
    const minutes = Math.ceil(seconds / 60);
    const coinsDeducted = minutes * (call.ratePerMinute || 20);

    call.status = 'ended';
    call.durationSeconds = seconds;
    call.coinsDeducted = coinsDeducted;
    call.endedAt = new Date();
    await call.save();

    // Deduct coins from caller
    await User.findByIdAndUpdate(call.callerId, {
      $inc: { coins: -coinsDeducted, totalTalkMinutes: minutes },
    });

    // Credit earnings to host
    const creatorEarningRupees = coinsDeducted * 0.7; // 70% share in rupees
    await User.findByIdAndUpdate(call.receiverId, {
      $inc: { earnings: creatorEarningRupees, totalCalls: 1, totalTalkMinutes: minutes },
    });

    // Record transactions
    await Transaction.create([
      {
        userId: call.callerId,
        type: 'call_spend',
        coins: coinsDeducted,
        title: `Audio Call (${minutes} min)`,
        status: 'completed',
      },
      {
        userId: call.receiverId,
        type: 'creator_earning',
        amountRupees: creatorEarningRupees,
        title: `Call Earnings (${minutes} min)`,
        status: 'completed',
      },
    ]);

    return res.status(200).json({
      success: true,
      message: 'Call ended and balances updated',
      data: {
        call,
        coinsDeducted,
        minutes,
        creatorEarnings: creatorEarningRupees,
      },
    });
  } catch (error) {
    console.error('End call error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getCallHistory = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { userId } = req.query;
    const query = userId
      ? { $or: [{ callerId: userId }, { receiverId: userId }] }
      : {};

    const calls = await Call.find(query)
      .populate('callerId', 'name avatar role')
      .populate('receiverId', 'name avatar role')
      .sort({ createdAt: -1 })
      .limit(20);

    return res.status(200).json({ success: true, count: calls.length, data: calls });
  } catch (error) {
    console.error('Call history error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
