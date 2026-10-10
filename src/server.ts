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

import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Attach io to req object
app.set('io', io);

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  // Basic WebRTC Signaling Relay
  socket.on('webrtc_offer', (data) => {
    socket.broadcast.emit('webrtc_offer', data);
  });
  
  socket.on('webrtc_answer', (data) => {
    socket.broadcast.emit('webrtc_answer', data);
  });
  
  socket.on('webrtc_ice_candidate', (data) => {
    socket.broadcast.emit('webrtc_ice_candidate', data);
  });

  socket.on('disconnect', () => {
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
