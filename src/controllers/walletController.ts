import { Request, Response } from 'express';
import { User } from '../models/User.js';
import { Transaction } from '../models/Transaction.js';
import mongoose from 'mongoose';

export const getWalletSummary = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const transactions = await Transaction.find({ userId }).sort({ createdAt: -1 }).limit(15);

    return res.status(200).json({
      success: true,
      data: {
        coins: user.coins,
        earningsRupees: user.earnings,
        totalCalls: user.totalCalls,
        totalTalkMinutes: user.totalTalkMinutes,
        transactions,
      },
    });
  } catch (error) {
    console.error('Wallet summary error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const rechargeCoins = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { userId, coins, amountRupees } = req.body;

    if (!userId || !coins) {
      return res.status(400).json({ success: false, message: 'User ID and coins are required.' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { coins: Number(coins) } },
      { new: true },
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await Transaction.create({
      userId: new mongoose.Types.ObjectId(userId),
      type: 'coin_recharge',
      coins: Number(coins),
      amountRupees: Number(amountRupees || 0),
      title: `Coin Recharge (+${coins} coins)`,
      status: 'completed',
    });

    return res.status(200).json({
      success: true,
      message: 'Coins recharged successfully',
      data: {
        newBalance: user.coins,
      },
    });
  } catch (error) {
    console.error('Recharge coins error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const requestWithdrawal = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { userId, amountRupees, upiId } = req.body;

    if (!userId || !amountRupees || !upiId) {
      return res.status(400).json({ success: false, message: 'User ID, amount, and UPI ID are required.' });
    }

    const user = await User.findById(userId);
    if (!user || user.earnings < amountRupees) {
      return res.status(400).json({ success: false, message: 'Insufficient earnings balance.' });
    }

    user.earnings -= amountRupees;
    await user.save();

    const tx = await Transaction.create({
      userId: new mongoose.Types.ObjectId(userId),
      type: 'withdrawal',
      amountRupees,
      title: `Withdrawal to ${upiId}`,
      status: 'pending',
    });

    return res.status(200).json({
      success: true,
      message: 'Withdrawal requested successfully',
      data: {
        remainingEarnings: user.earnings,
        transaction: tx,
      },
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
