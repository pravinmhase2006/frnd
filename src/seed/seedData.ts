import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import { Chat } from '../models/Chat.js';
import { Transaction } from '../models/Transaction.js';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/frnd_app';

const sampleUsers = [
  {
    name: 'Ananya Sharma',
    email: 'ananya@frnd.app',
    phone: '+919876543210',
    age: 22,
    role: 'female',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    bio: 'Singer 🎶 Love late night chill conversations. Always up for good stories!',
    interests: ['Music', 'Late Night', 'Storytelling', 'Travel'],
    language: 'Hindi, English',
    location: 'Delhi',
    isVerified: true,
    isOnline: true,
    rating: 4.9,
    callRate: 20,
    earnings: 3450,
    totalCalls: 84,
    totalTalkMinutes: 245,
  },
  {
    name: 'Priya Patel',
    email: 'priya@frnd.app',
    phone: '+919876543211',
    age: 23,
    role: 'female',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
    bio: 'Sweet voice, gamer girl 🎮. Let us talk about movies and life!',
    interests: ['Gaming', 'Movies', 'Friendship', 'Comedy'],
    language: 'Gujarati, Hindi, English',
    location: 'Ahmedabad',
    isVerified: true,
    isOnline: true,
    rating: 4.8,
    callRate: 25,
    earnings: 2890,
    totalCalls: 62,
    totalTalkMinutes: 190,
  },
  {
    name: 'Sneha Roy',
    email: 'sneha@frnd.app',
    phone: '+919876543212',
    age: 21,
    role: 'female',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400',
    bio: 'Coffee lover ☕ Calm listener. Call me if you had a tough day!',
    interests: ['Chill', 'Deep Talk', 'Books', 'Music'],
    language: 'Bengali, Hindi',
    location: 'Kolkata',
    isVerified: true,
    isOnline: true,
    rating: 4.95,
    callRate: 30,
    earnings: 5120,
    totalCalls: 110,
    totalTalkMinutes: 380,
  },
  {
    name: 'Riya Sen',
    email: 'riya@frnd.app',
    phone: '+919876543213',
    age: 24,
    role: 'female',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    bio: 'Radio host vibes ✨ Let us do fun banter and laughter!',
    interests: ['Comedy', 'Radio', 'Fashion', 'Friendship'],
    language: 'Hindi, Punjabi, English',
    location: 'Chandigarh',
    isVerified: true,
    isOnline: false,
    rating: 4.7,
    callRate: 20,
    earnings: 1980,
    totalCalls: 45,
    totalTalkMinutes: 130,
  },
  {
    name: 'Rahul Verma',
    email: 'rahul@frnd.app',
    phone: '+919988776655',
    age: 25,
    role: 'male',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    bio: 'Tech enthusiast looking to make genuine friends.',
    interests: ['Tech', 'Music', 'Cricket'],
    language: 'Hindi, English',
    location: 'Mumbai',
    isVerified: true,
    isOnline: true,
    coins: 350,
    totalCalls: 28,
    totalTalkMinutes: 95,
  },
];

const seed = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for seeding...');

    await User.deleteMany({});
    await Chat.deleteMany({});
    await Transaction.deleteMany({});

    const createdUsers = await User.insertMany(sampleUsers);
    console.log(`✅ Seeded ${createdUsers.length} users`);

    const host = createdUsers[0];
    const caller = createdUsers[4];

    // Seed sample chat
    await Chat.create({
      participants: [caller._id, host._id],
      lastMessage: 'Hey! Are you free for a quick voice call?',
      lastMessageTime: new Date(),
      messages: [
        {
          senderId: caller._id,
          senderName: caller.name,
          text: 'Hi Ananya! Loved your bio.',
          type: 'text',
          isRead: true,
          createdAt: new Date(Date.now() - 3600000),
        },
        {
          senderId: host._id,
          senderName: host.name,
          text: 'Thank you Rahul! How is your evening going?',
          type: 'text',
          isRead: true,
          createdAt: new Date(Date.now() - 1800000),
        },
        {
          senderId: caller._id,
          senderName: caller.name,
          text: 'Sent a Rose gift 🌹',
          type: 'gift',
          giftCoins: 20,
          isRead: true,
          createdAt: new Date(Date.now() - 900000),
        },
        {
          senderId: caller._id,
          senderName: caller.name,
          text: 'Hey! Are you free for a quick voice call?',
          type: 'text',
          isRead: false,
          createdAt: new Date(),
        },
      ],
    });

    // Seed transaction
    await Transaction.create({
      userId: caller._id,
      type: 'coin_recharge',
      coins: 200,
      amountRupees: 99,
      title: 'Starter Coin Pack Recharge',
      status: 'completed',
    });

    console.log('✅ Seeded sample chat and transaction');
    await mongoose.disconnect();
    console.log('✅ Seed completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err);
    process.exit(1);
  }
};

seed();
