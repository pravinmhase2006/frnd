import { Request, Response } from 'express';
import { Chat } from '../models/Chat.js';
import { User } from '../models/User.js';
import { Transaction } from '../models/Transaction.js';
import mongoose from 'mongoose';

export const getChats = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { userId } = req.query;
    let query: Record<string, unknown> = {};

    if (userId && mongoose.Types.ObjectId.isValid(String(userId))) {
      query = { participants: new mongoose.Types.ObjectId(String(userId)) };
    }

    const chats = await Chat.find(query)
      .populate('participants', 'name avatar role isOnline rating callRate')
      .sort({ updatedAt: -1 });

    return res.status(200).json({ success: true, count: chats.length, data: chats });
  } catch (error) {
    console.error('Get chats error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getMessagesByChatId = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const firstChat = await Chat.findOne();
      return res.status(200).json({ success: true, data: firstChat ? firstChat.messages : [] });
    }

    const chat = await Chat.findById(id).populate('participants', 'name avatar isOnline');

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    return res.status(200).json({ success: true, data: chat.messages });
  } catch (error) {
    console.error('Get messages error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const sendMessage = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { chatId, senderId, receiverId, senderName, receiverName, text, type, giftCoins } = req.body;

    const parsedGiftCoins = Number(giftCoins) || 0;

    if (!text && parsedGiftCoins <= 0) {
      return res.status(400).json({ success: false, message: 'Text or gift is required.' });
    }

    let chat;
    if (chatId && mongoose.Types.ObjectId.isValid(chatId)) {
      chat = await Chat.findById(chatId);
    }

    let sId = senderId;
    let rId = receiverId;

    // Resolve sender user
    let senderUser = null;
    if (sId && mongoose.Types.ObjectId.isValid(String(sId))) {
      senderUser = await User.findById(sId);
    } else if (senderName) {
      senderUser = await User.findOne({ name: senderName });
      if (senderUser) sId = senderUser._id;
    }

    // Resolve receiver user
    let receiverUser = null;
    if (rId && mongoose.Types.ObjectId.isValid(String(rId))) {
      receiverUser = await User.findById(rId);
    } else if (receiverName) {
      receiverUser = await User.findOne({ name: receiverName });
      if (receiverUser) rId = receiverUser._id;
    }

    // Handle Gift and Coin Economy
    if (parsedGiftCoins > 0) {
      if (senderUser) {
        if (senderUser.coins < parsedGiftCoins) {
          return res.status(400).json({
            success: false,
            message: `Insufficient coins (${senderUser.coins} available, ${parsedGiftCoins} required). Please recharge.`,
          });
        }

        // Deduct coins from sender
        senderUser.coins -= parsedGiftCoins;
        await senderUser.save();

        // Record sender transaction
        await Transaction.create({
          userId: senderUser._id,
          type: 'gift_spend',
          coins: parsedGiftCoins,
          title: `Gift to ${receiverName || 'Host'} (${parsedGiftCoins} coins)`,
          status: 'completed',
        });
      }

      // Credit earnings to host
      if (receiverUser) {
        const creatorEarningsRupees = parsedGiftCoins * 0.7; // 70% share in rupees
        receiverUser.earnings = (receiverUser.earnings || 0) + creatorEarningsRupees;
        await receiverUser.save();

        // Record receiver transaction
        await Transaction.create({
          userId: receiverUser._id,
          type: 'creator_earning',
          amountRupees: creatorEarningsRupees,
          title: `Gift from ${senderName || 'Caller'} (${parsedGiftCoins} coins)`,
          status: 'completed',
        });
      }
    }

    // Find or create chat thread
    if (!chat && sId && rId) {
      const validSender = mongoose.Types.ObjectId.isValid(String(sId))
        ? new mongoose.Types.ObjectId(String(sId))
        : new mongoose.Types.ObjectId();
      const validReceiver = mongoose.Types.ObjectId.isValid(String(rId))
        ? new mongoose.Types.ObjectId(String(rId))
        : new mongoose.Types.ObjectId();

      chat = await Chat.findOne({
        participants: { $all: [validSender, validReceiver] },
      });

      if (!chat) {
        chat = new Chat({
          participants: [validSender, validReceiver],
          messages: [],
        });
      }
    }

    if (!chat) {
      chat = (await Chat.findOne()) || new Chat({ participants: [], messages: [] });
    }

    const finalSenderId = sId && mongoose.Types.ObjectId.isValid(String(sId))
      ? new mongoose.Types.ObjectId(String(sId))
      : new mongoose.Types.ObjectId();

    const newMessage = {
      senderId: finalSenderId,
      senderName: senderName || 'You',
      text: text || `Sent a gift (${parsedGiftCoins} coins) 🎁`,
      type: (type as 'text' | 'gift' | 'audio' | 'system') || (parsedGiftCoins > 0 ? 'gift' : 'text'),
      giftCoins: parsedGiftCoins,
      isRead: false,
      createdAt: new Date(),
    };

    chat.messages.push(newMessage);
    chat.lastMessage = newMessage.text;
    chat.lastMessageTime = new Date();
    await chat.save();

    // Broadcast via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('new_message', { chatId: chat._id, message: newMessage });
      if (rId) {
        io.to(`user_${rId}`).emit('new_message', { chatId: chat._id, message: newMessage });
      }
      if (sId) {
        io.to(`user_${sId}`).emit('new_message', { chatId: chat._id, message: newMessage });
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: newMessage,
      senderBalance: senderUser ? senderUser.coins : undefined,
    });
  } catch (error) {
    console.error('Send message error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getChatBetween = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { user1, user2 } = req.params;
    let u1Id: mongoose.Types.ObjectId | null = null;
    let u2Id: mongoose.Types.ObjectId | null = null;

    if (mongoose.Types.ObjectId.isValid(user1)) {
      u1Id = new mongoose.Types.ObjectId(user1);
    } else {
      const u1 = await User.findOne({ name: user1 });
      if (u1) u1Id = u1._id as mongoose.Types.ObjectId;
    }

    if (mongoose.Types.ObjectId.isValid(user2)) {
      u2Id = new mongoose.Types.ObjectId(user2);
    } else {
      const u2 = await User.findOne({ name: user2 });
      if (u2) u2Id = u2._id as mongoose.Types.ObjectId;
    }

    if (!u1Id || !u2Id) {
      return res.status(404).json({ success: false, message: 'Could not resolve users for chat' });
    }

    let chat = await Chat.findOne({
      participants: { $all: [u1Id, u2Id] },
    }).populate('participants', 'name avatar role isOnline rating callRate');

    if (!chat) {
      chat = await Chat.create({
        participants: [u1Id, u2Id],
        messages: [],
      });
      chat = await Chat.findById(chat._id).populate('participants', 'name avatar role isOnline rating callRate');
    }

    return res.status(200).json({ success: true, data: chat });
  } catch (error) {
    console.error('Get chat between error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
