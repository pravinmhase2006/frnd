import { Request, Response } from 'express';
import { Chat } from '../models/Chat.js';
import mongoose from 'mongoose';

export const getChats = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { userId } = req.query;
    let query: Record<string, unknown> = {};

    if (userId && mongoose.Types.ObjectId.isValid(String(userId))) {
      query = { participants: new mongoose.Types.ObjectId(String(userId)) };
    }

    const chats = await Chat.find(query)
      .populate('participants', 'name avatar role isOnline rating')
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
      // If it's a demo conversation, return empty array or find first
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
    const { chatId, senderId, receiverId, senderName, text, type, giftCoins } = req.body;

    if (!text && !giftCoins) {
      return res.status(400).json({ success: false, message: 'Text or gift is required.' });
    }

    let chat;
    if (chatId && mongoose.Types.ObjectId.isValid(chatId)) {
      chat = await Chat.findById(chatId);
    }

    let sId = senderId;
    let rId = receiverId;

    // Resolve IDs by name if not provided (useful for flutter demo)
    if (!sId && senderName) {
      const senderUser = await mongoose.model('User').findOne({ name: senderName });
      if (senderUser) sId = senderUser._id;
    }
    
    // Using receiverName passed via flutter api
    const receiverName = req.body.receiverName;
    if (!rId && receiverName) {
      const receiverUser = await mongoose.model('User').findOne({ name: receiverName });
      if (receiverUser) rId = receiverUser._id;
    }

    if (!chat && sId && rId) {
      const validSender = mongoose.Types.ObjectId.isValid(sId)
        ? new mongoose.Types.ObjectId(String(sId))
        : new mongoose.Types.ObjectId();
      const validReceiver = mongoose.Types.ObjectId.isValid(rId)
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
      // Fallback: attach to most recent chat or create new
      chat = (await Chat.findOne()) || new Chat({ participants: [], messages: [] });
    }

    const finalSenderId = sId && mongoose.Types.ObjectId.isValid(sId)
      ? new mongoose.Types.ObjectId(String(sId))
      : new mongoose.Types.ObjectId();

    const newMessage = {
      senderId: finalSenderId,
      senderName: senderName || 'You',
      text: text || `Sent a gift (${giftCoins} coins) 🎁`,
      type: (type as 'text' | 'gift' | 'audio' | 'system') || (giftCoins ? 'gift' : 'text'),
      giftCoins: giftCoins || 0,
      isRead: false,
      createdAt: new Date(),
    };

    chat.messages.push(newMessage);
    chat.lastMessage = newMessage.text;
    chat.lastMessageTime = new Date();
    await chat.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('new_message', { chatId: chat._id, message: newMessage });
    }

    return res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: newMessage,
    });
  } catch (error) {
    console.error('Send message error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
