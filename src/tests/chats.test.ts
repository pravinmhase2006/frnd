import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { User } from '../models/User.js';
import { Chat } from '../models/Chat.js';

describe('Chat & Virtual Gift Economy APIs', () => {
  let sender: any;
  let receiver: any;

  it('Setup: create test users with coin balance', async () => {
    sender = await User.create({
      name: 'Chat Sender',
      email: `sender_${Date.now()}@frnd.app`,
      age: 23,
      role: 'male',
      coins: 200,
    });

    receiver = await User.create({
      name: 'Chat Receiver',
      email: `receiver_${Date.now()}@frnd.app`,
      age: 22,
      role: 'female',
      earnings: 0,
    });
  });

  it('POST /api/chats/messages should send regular text message', async () => {
    const res = await request(app)
      .post('/api/chats/messages')
      .send({
        senderId: sender._id.toString(),
        receiverId: receiver._id.toString(),
        senderName: 'Chat Sender',
        receiverName: 'Chat Receiver',
        text: 'Hello from automated test!',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.text).toBe('Hello from automated test!');
    expect(res.body.data.type).toBe('text');
  });

  it('POST /api/chats/messages with gift should deduct coins from sender and credit host', async () => {
    // Send 50 coins gift (Heart) -> host gets 50 * 0.7 = 35 rupees
    const res = await request(app)
      .post('/api/chats/messages')
      .send({
        senderId: sender._id.toString(),
        receiverId: receiver._id.toString(),
        senderName: 'Chat Sender',
        receiverName: 'Chat Receiver',
        giftCoins: 50,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.type).toBe('gift');
    expect(res.body.data.giftCoins).toBe(50);

    // Verify sender balance: 200 - 50 = 150
    const updatedSender = await User.findById(sender._id);
    expect(updatedSender?.coins).toBe(150);

    // Verify receiver earnings: 0 + 35 = 35
    const updatedReceiver = await User.findById(receiver._id);
    expect(updatedReceiver?.earnings).toBe(35);
  });

  it('GET /api/chats/between/:u1/:u2 should fetch the conversation thread', async () => {
    const res = await request(app).get(`/api/chats/between/${sender._id}/${receiver._id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.messages.length).toBeGreaterThanOrEqual(2);
  });
});
