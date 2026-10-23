import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import callRoutes from './routes/callRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import otpRoutes from './modules/otp/otp.routes.js';
import { User } from './models/User.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './config/swagger.js';

import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import mongoose from 'mongoose';

export const app = express();
export const httpServer = createServer(app);

const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*';

export const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Attach io to express app
app.set('io', io);

const PORT = process.env.PORT || 5000;

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false,
}));

// CORS Configuration
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// General Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: { success: false, message: 'Too many requests from this IP. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Auth Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { success: false, message: 'Too many authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Store active socket-to-user mappings
const onlineUsers = new Map<string, string>(); // socketId -> userId

// Socket.io connection handling
io.on('connection', (socket: Socket) => {
  const userId = socket.handshake.query.userId as string | undefined;

  if (userId) {
    onlineUsers.set(socket.id, userId);
    socket.join(`user_${userId}`);

    // Mark user online in DB if valid ObjectId
    if (userId.length === 24) {
      User.findByIdAndUpdate(userId, { isOnline: true }).exec().catch(() => {});
    }
  }

  // Join a dedicated call or chat room
  socket.on('join_room', (roomId: string) => {
    socket.join(roomId);
  });

  socket.on('leave_room', (roomId: string) => {
    socket.leave(roomId);
  });

  // Targeted WebRTC Offer
  socket.on('webrtc_offer', (data: any) => {
    if (data.targetId) {
      io.to(`user_${data.targetId}`).emit('webrtc_offer', { ...data, senderSocketId: socket.id });
    }
    if (data.roomId) {
      socket.to(data.roomId).emit('webrtc_offer', { ...data, senderSocketId: socket.id });
    }
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

  // Live Audio Room Multi-Speaker & Soundboard Broadcast
  socket.on('room_sfx', (data: any) => {
    if (data.roomId) {
      socket.to(data.roomId).emit('room_sfx', data);
    } else {
      socket.broadcast.emit('room_sfx', data);
    }
  });

  socket.on('raise_hand', (data: any) => {
    if (data.roomId) {
      socket.to(data.roomId).emit('hand_raised', data);
    } else {
      socket.broadcast.emit('hand_raised', data);
    }
  });

  socket.on('promote_speaker', (data: any) => {
    if (data.roomId) {
      io.to(data.roomId).emit('promoted_to_speaker', data);
    }
    if (data.userId) {
      io.to(`user_${data.userId}`).emit('promoted_to_speaker', data);
    }
  });

  socket.on('remove_speaker', (data: any) => {
    if (data.roomId) {
      io.to(data.roomId).emit('removed_from_stage', data);
    }
    if (data.userId) {
      io.to(`user_${data.userId}`).emit('removed_from_stage', data);
    }
  });

  // Live In-Room Chat Stream with Anti-Leak Filter
  socket.on('room_chat_message', (data: any) => {
    const phoneRegex = /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b|\b\d{10}\b/;
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

    if (data.text && (phoneRegex.test(data.text) || emailRegex.test(data.text))) {
      socket.emit('room_chat_error', {
        message: 'Sharing phone numbers or emails is strictly prohibited in live room chat.',
      });
      return;
    }

    const payload = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      roomId: data.roomId,
      senderId: data.senderId,
      senderName: data.senderName ? data.senderName.trim().split(' ')[0] : 'User',
      role: data.role || 'caller',
      text: data.text,
      timestamp: new Date().toISOString(),
    };

    if (data.roomId) {
      io.to(data.roomId).emit('room_chat_message', payload);
    } else {
      io.emit('room_chat_message', payload);
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
  });
});

// Swagger UI Documentation
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'FRND API Docs - Swagger',
  })
);
app.get('/docs', (_req: Request, res: Response) => res.redirect('/api-docs'));
app.get('/api-docs.json', (_req: Request, res: Response) => res.json(swaggerDocument));

// Root Information Endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'FRND Audio Calling & Chat Backend',
    status: 'running',
    runtime: 'Node.js + TypeScript',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      documentation: ['/api-docs', '/docs', '/api-docs.json'],
      otp: ['/api/otp/send', '/api/otp/verify'],
      auth: ['/api/auth/send-email-code', '/api/auth/verify-email', '/api/auth/send-otp', '/api/auth/verify-otp', '/api/auth/me'],
      users: ['/api/users', '/api/users/match', '/api/users/:id'],
      chats: ['/api/chats', '/api/chats/between/:user1/:user2', '/api/chats/:id/messages', '/api/chats/messages'],
      calls: ['/api/calls/request', '/api/calls/:id/end', '/api/calls/:id/accept', '/api/calls/:id/decline', '/api/calls/:id/rate', '/api/calls/history'],
      wallet: ['/api/wallet/:userId', '/api/wallet/recharge', '/api/wallet/withdraw'],
    },
  });
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.status(isDbConnected ? 200 : 503).json({
    status: isDbConnected ? 'healthy' : 'unhealthy',
    database: isDbConnected ? 'connected' : 'disconnected',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Readiness check
app.get('/api/readiness', (_req: Request, res: Response) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (isDbConnected) {
    res.status(200).json({ ready: true });
  } else {
    res.status(503).json({ ready: false, message: 'Database not connected' });
  }
});

// Mount Routes under /api
app.use('/api/otp', authLimiter, otpRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api', userRoutes);
app.use('/api', chatRoutes);
app.use('/api', callRoutes);
app.use('/api', walletRoutes);

// Catch-all 404 Handler
app.use(notFoundHandler);

// Centralized Error Handler
app.use(errorHandler);

export const startServer = async (): Promise<void> => {
  await connectDB();

  httpServer.listen(PORT, () => {
    console.log(`🚀 FRND TypeScript backend running on http://localhost:${PORT}`);
  });
};

// Graceful Shutdown
const handleShutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  io.close();
  httpServer.close(() => {
    console.log('HTTP and WebSocket servers closed.');
  });
  await mongoose.disconnect();
  console.log('MongoDB disconnected.');
  process.exit(0);
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
