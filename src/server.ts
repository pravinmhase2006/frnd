import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import callRoutes from './routes/callRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import { User } from './models/User.js';

import { createServer } from 'http';
import { Server, Socket } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Attach io to express app
app.set('io', io);

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Store active socket-to-user mappings
const onlineUsers = new Map<string, string>(); // socketId -> userId

// Socket.io connection handling
io.on('connection', (socket: Socket) => {
  const userId = socket.handshake.query.userId as string | undefined;

  if (userId) {
    onlineUsers.set(socket.id, userId);
    socket.join(`user_${userId}`);
    console.log(`👤 User joined room user_${userId} (Socket: ${socket.id})`);

    // Mark user online in DB if valid ObjectId
    if (userId.length === 24) {
      User.findByIdAndUpdate(userId, { isOnline: true }).exec().catch(() => {});
    }
  }

  // Join a dedicated call or chat room
  socket.on('join_room', (roomId: string) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });

  socket.on('leave_room', (roomId: string) => {
    socket.leave(roomId);
    console.log(`Socket ${socket.id} left room ${roomId}`);
  });

  // Targeted WebRTC Offer
  socket.on('webrtc_offer', (data: any) => {
    if (data.targetId) {
      io.to(`user_${data.targetId}`).emit('webrtc_offer', { ...data, senderSocketId: socket.id });
    }
    if (data.roomId) {
      socket.to(data.roomId).emit('webrtc_offer', { ...data, senderSocketId: socket.id });
    }
    // Fallback broadcast
    socket.broadcast.emit('webrtc_offer', data);
  });

  // Targeted WebRTC Answer
  socket.on('webrtc_answer', (data: any) => {
    if (data.targetId) {
      io.to(`user_${data.targetId}`).emit('webrtc_answer', { ...data, senderSocketId: socket.id });
    }
    if (data.roomId) {
      socket.to(data.roomId).emit('webrtc_answer', { ...data, senderSocketId: socket.id });
    }
    socket.broadcast.emit('webrtc_answer', data);
  });

  // Targeted ICE Candidate
  socket.on('webrtc_ice_candidate', (data: any) => {
    if (data.targetId) {
      io.to(`user_${data.targetId}`).emit('webrtc_ice_candidate', { ...data, senderSocketId: socket.id });
    }
    if (data.roomId) {
      socket.to(data.roomId).emit('webrtc_ice_candidate', { ...data, senderSocketId: socket.id });
    }
    socket.broadcast.emit('webrtc_ice_candidate', data);
  });

  // Live call lifecycle signaling
  socket.on('call_request', (data: any) => {
    if (data.receiverId) {
      io.to(`user_${data.receiverId}`).emit('incoming_call_request', data);
    }
    socket.broadcast.emit('incoming_call_request', data);
  });

  socket.on('call_accepted', (data: any) => {
    if (data.callerId) {
      io.to(`user_${data.callerId}`).emit('call_accepted', data);
    }
    if (data.roomId) {
      socket.to(data.roomId).emit('call_accepted', data);
    }
  });

  socket.on('call_declined', (data: any) => {
    if (data.callerId) {
      io.to(`user_${data.callerId}`).emit('call_declined', data);
    }
  });

  socket.on('call_ended', (data: any) => {
    if (data.targetId) {
      io.to(`user_${data.targetId}`).emit('call_ended', data);
    }
    if (data.roomId) {
      socket.to(data.roomId).emit('call_ended', data);
    }
  });

  socket.on('disconnect', () => {
    const disconnectedUserId = onlineUsers.get(socket.id);
    if (disconnectedUserId) {
      onlineUsers.delete(socket.id);
      if (disconnectedUserId.length === 24) {
        User.findByIdAndUpdate(disconnectedUserId, { isOnline: false }).exec().catch(() => {});
      }
    }
    console.log('User disconnected:', socket.id);
  });
});

// Health / Welcome route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'FRND Audio Calling & Chat Backend',
    status: 'running',
    runtime: 'Node.js + TypeScript',
    version: '1.0.0',
    endpoints: {
      auth: ['/api/auth/send-otp', '/api/auth/verify-otp', '/api/auth/me'],
      users: ['/api/users', '/api/users/match', '/api/users/:id'],
      chats: ['/api/chats', '/api/chats/:id/messages', '/api/chats/messages'],
      calls: ['/api/calls/request', '/api/calls/:id/end', '/api/calls/history'],
      wallet: ['/api/wallet/:userId', '/api/wallet/recharge', '/api/wallet/withdraw'],
    },
  });
});

// Mount Routes under /api
app.use('/api/auth', authRoutes);
app.use('/api', userRoutes);
app.use('/api', chatRoutes);
app.use('/api', callRoutes);
app.use('/api', walletRoutes);

const startServer = async (): Promise<void> => {
  await connectDB();

  httpServer.listen(PORT, () => {
    console.log(`🚀 FRND TypeScript backend running on http://localhost:${PORT}`);
  });
};

startServer();
