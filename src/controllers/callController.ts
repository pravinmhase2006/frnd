import { Request, Response } from 'express';
import { Call } from '../models/Call.js';
import { User } from '../models/User.js';
import { Transaction } from '../models/Transaction.js';
import { sanitizeUser } from './userController.js';
import mongoose from 'mongoose';

export const getIceServers = async (_req: Request, res: Response): Promise<Response> => {
  return res.status(200).json({
    success: true,
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
    ],
  });
};

export const requestCall = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { callerId, receiverId, ratePerMinute } = req.body;

    if (!callerId || !receiverId) {
      return res.status(400).json({ success: false, message: 'Caller and receiver IDs are required.' });
    }

    // Resolve caller user
    let callerUser = null;
    if (mongoose.Types.ObjectId.isValid(String(callerId))) {
      callerUser = await User.findById(callerId);
    } else {
      callerUser = await User.findOne({ name: callerId });
    }

    // Resolve receiver user
    let receiverUser = null;
    if (mongoose.Types.ObjectId.isValid(String(receiverId))) {
      receiverUser = await User.findById(receiverId);
    } else {
      receiverUser = await User.findOne({ name: receiverId });
    }

    // Privacy & Safety checks: Blocking & Privacy settings
    if (callerUser && receiverUser) {
      const isBlockedByReceiver = receiverUser.blockedUsers?.some((b: any) => b.equals(callerUser._id));
      const isBlockedByCaller = callerUser.blockedUsers?.some((b: any) => b.equals(receiverUser._id));

      if (isBlockedByReceiver || isBlockedByCaller) {
        return res.status(403).json({
          success: false,
          message: 'Call cannot be connected. Communication is blocked between these accounts.',
        });
      }

      if (receiverUser.privacySettings?.allowCalls === false) {
        return res.status(403).json({
          success: false,
          message: 'This host is currently not accepting incoming calls.',
        });
      }
    }

    const effectiveRate = Number(ratePerMinute) || (receiverUser ? receiverUser.callRate : 20);

    if (callerUser && callerUser.coins < effectiveRate) {
      return res.status(400).json({
        success: false,
        message: `Insufficient coins. You have ${callerUser.coins} coins, but minimum ${effectiveRate} coins are required.`,
      });
    }

    const cId = callerUser ? callerUser._id : new mongoose.Types.ObjectId();
    const rId = receiverUser ? receiverUser._id : new mongoose.Types.ObjectId();

    const call = await Call.create({
      callerId: cId,
      receiverId: rId,
      status: 'active',
      ratePerMinute: effectiveRate,
      startedAt: new Date(),
    });

    // Notify receiver via Socket.IO - Sanitized payload only (no private details)
    const io = req.app.get('io');
    if (io) {
      const callData = {
        callId: call._id,
        caller: {
          id: cId,
          name: callerUser ? callerUser.name : 'Friendly Caller',
          role: 'male',
        },
        receiver: {
          id: rId,
          name: receiverUser ? receiverUser.name.split(' ')[0] : 'Voice Host',
        },
        ratePerMinute: effectiveRate,
        timestamp: new Date().toISOString(),
      };

      io.to(`user_${rId}`).emit('incoming_call_request', callData);
      io.emit('incoming_call_request', callData);
    }

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

    let call = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      call = await Call.findById(id);
    }

    // If call session was demo or not found by ObjectId, find the most recent active call
    if (!call) {
      call = await Call.findOne({ status: 'active' }).sort({ createdAt: -1 });
    }

    if (!call) {
      return res.status(200).json({
        success: true,
        message: 'Demo call concluded',
        data: { durationSeconds: durationSeconds || 60, coinsDeducted: 20 },
      });
    }

    const seconds = Number(durationSeconds) || 60;
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    const coinsDeducted = minutes * (call.ratePerMinute || 20);

    call.status = 'ended';
    call.durationSeconds = seconds;
    call.coinsDeducted = coinsDeducted;
    call.endedAt = new Date();
    await call.save();

    // Deduct coins from caller
    if (call.callerId) {
      await User.findByIdAndUpdate(call.callerId, {
        $inc: {
          coins: -coinsDeducted,
          totalCalls: 1,
          totalTalkMinutes: minutes,
        },
      });

      // Record caller spend transaction
      await Transaction.create({
        userId: call.callerId,
        type: 'call_spend',
        coins: coinsDeducted,
        title: `Voice Call (${minutes} min @ ${call.ratePerMinute} coins/min)`,
        status: 'completed',
      });
    }

    // Credit earnings to female host: 70% share in rupees
    if (call.receiverId) {
      const creatorEarningsRupees = Number((coinsDeducted * 0.7).toFixed(2));

      await User.findByIdAndUpdate(call.receiverId, {
        $inc: {
          earnings: creatorEarningsRupees,
          totalCalls: 1,
          totalTalkMinutes: minutes,
        },
      });

      // Record host earning transaction
      await Transaction.create({
        userId: call.receiverId,
        type: 'creator_earning',
        amountRupees: creatorEarningsRupees,
        title: `Host Earning: Call (${minutes} min @ 70% share)`,
        status: 'completed',
      });
    }

    // Broadcast call_ended event safely
    const io = req.app.get('io');
    if (io) {
      const endPayload = {
        callId: call._id,
        durationSeconds: seconds,
        coinsDeducted,
      };
      if (call.callerId) io.to(`user_${call.callerId}`).emit('call_ended', endPayload);
      if (call.receiverId) io.to(`user_${call.receiverId}`).emit('call_ended', endPayload);
    }

    return res.status(200).json({
      success: true,
      message: 'Call ended and settled successfully',
      data: {
        callId: call._id,
        durationSeconds: seconds,
        minutes,
        coinsDeducted,
        creatorEarnings: Number((coinsDeducted * 0.7).toFixed(2)),
        ratePerMinute: call.ratePerMinute,
      },
    });
  } catch (error) {
    console.error('End call error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const acceptCall = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    let call = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      call = await Call.findById(id);
    }

    if (call) {
      call.status = 'active';
      await call.save();
    }

    const io = req.app.get('io');
    if (io && call) {
      io.to(`user_${call.callerId}`).emit('call_accepted', { callId: call._id });
    }

    return res.status(200).json({ success: true, message: 'Call accepted' });
  } catch (error) {
    console.error('Accept call error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const declineCall = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    let call = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      call = await Call.findById(id);
    }

    if (call) {
      call.status = 'declined';
      call.endedAt = new Date();
      await call.save();
    }

    const io = req.app.get('io');
    if (io && call) {
      io.to(`user_${call.callerId}`).emit('call_declined', { callId: call._id });
    }

    return res.status(200).json({ success: true, message: 'Call declined' });
  } catch (error) {
    console.error('Decline call error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getCallHistory = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { userId } = req.query;

    const query = userId && mongoose.Types.ObjectId.isValid(String(userId))
      ? { $or: [{ callerId: new mongoose.Types.ObjectId(String(userId)) }, { receiverId: new mongoose.Types.ObjectId(String(userId)) }] }
      : {};

    const calls = await Call.find(query)
      .populate('callerId', 'name avatar role')
      .populate('receiverId', 'name avatar role')
      .sort({ createdAt: -1 })
      .limit(20);

    const sanitizedCalls = calls.map((c) => {
      const obj = c.toObject();
      if (obj.callerId) obj.callerId = sanitizeUser(obj.callerId);
      if (obj.receiverId) obj.receiverId = sanitizeUser(obj.receiverId);
      return obj;
    });

    return res.status(200).json({ success: true, count: sanitizedCalls.length, data: sanitizedCalls });
  } catch (error) {
    console.error('Call history error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const rateCall = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { rating, compliments, review } = req.body;

    const numRating = Math.max(1, Math.min(5, Number(rating) || 5));

    let call = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      call = await Call.findById(id);
    }

    if (call) {
      call.rating = numRating;
      if (compliments) call.compliments = compliments;
      if (review) call.review = review;
      await call.save();

      // Recalculate receiver creator's rating
      const receiver = await User.findById(call.receiverId);
      if (receiver) {
        const callsWithRating = await Call.find({
          receiverId: receiver._id,
          rating: { $exists: true, $ne: null },
        });
        if (callsWithRating.length > 0) {
          const totalRating = callsWithRating.reduce((sum, c) => sum + (c.rating || 5), 0);
          receiver.rating = Number((totalRating / callsWithRating.length).toFixed(1));
          await receiver.save();
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Thank you for your rating!',
      data: { rating: numRating, compliments, review },
    });
  } catch (error) {
    console.error('Rate call error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
