import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { User } from '../models/User.js';

describe('Privacy-First & Anti-Abuse Safety Tests', () => {
  let femaleHost: any;
  let maleCaller: any;

  beforeAll(async () => {
    const ts = Date.now().toString().slice(-6);
    // Seed test female host with unique phone/email
    femaleHost = await User.create({
      name: 'Ananya Sharma',
      phone: `+91789${ts}1`,
      email: `ananya.real.${ts}@example.com`,
      age: 22,
      role: 'female',
      avatar: 'https://images.unsplash.com/photo-real-girl.jpg',
      bio: 'Loves classical music and deep conversations',
      callRate: 20,
      coins: 50,
      isOnline: true,
      status: 'active',
    });

    // Seed test male caller with unique phone/email
    maleCaller = await User.create({
      name: 'Rohan Verma',
      phone: `+91789${ts}2`,
      email: `rohan.caller.${ts}@example.com`,
      age: 24,
      role: 'male',
      avatar: 'https://images.unsplash.com/photo-boy.jpg',
      coins: 200,
      isOnline: true,
      status: 'active',
    });
  });

  it('1. GET /api/users: Female users MUST NOT expose phone, email, surname, or real photo', async () => {
    const res = await request(app).get('/api/users?role=female');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const host = res.body.data.find((u: any) => u._id.toString() === femaleHost._id.toString());
    expect(host).toBeDefined();

    // Verification of Gender-Based Privacy Rules
    expect(host.name).toBe('Ananya'); // First name only
    expect(host.avatar).toBe(''); // No real photo exposed
    expect(host.phone).toBeUndefined(); // Phone stripped
    expect(host.email).toBeUndefined(); // Email stripped
    expect(host.phoneVerificationCode).toBeUndefined();
  });

  it('2. GET /api/users/:id: Single user lookup MUST sanitize female private information', async () => {
    const res = await request(app).get(`/api/users/${femaleHost._id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    expect(res.body.data.name).toBe('Ananya');
    expect(res.body.data.avatar).toBe('');
    expect(res.body.data.phone).toBeUndefined();
    expect(res.body.data.email).toBeUndefined();
  });

  it('3. POST /api/chats/messages: Reject message containing phone number (anti-leak filter)', async () => {
    const res = await request(app)
      .post('/api/chats/messages')
      .send({
        senderId: maleCaller._id,
        receiverId: femaleHost._id,
        text: 'Hey call me on WhatsApp at 9876543210 please',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Sharing phone numbers');
  });

  it('4. POST /api/chats/messages: Reject message containing email address', async () => {
    const res = await request(app)
      .post('/api/chats/messages')
      .send({
        senderId: maleCaller._id,
        receiverId: femaleHost._id,
        text: 'My personal email is secret@gmail.com write to me',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Sharing phone numbers, email addresses');
  });

  it('5. POST /api/users/block: Block user and prevent them from messaging or calling', async () => {
    // Female host blocks male caller
    const blockRes = await request(app)
      .post('/api/users/block')
      .send({
        currentUserId: femaleHost._id,
        targetUserId: maleCaller._id,
      });

    expect(blockRes.status).toBe(200);
    expect(blockRes.body.success).toBe(true);

    // Blocked caller tries to send message -> Must return 403 Forbidden
    const chatRes = await request(app)
      .post('/api/chats/messages')
      .send({
        senderId: maleCaller._id,
        receiverId: femaleHost._id,
        text: 'Hello are you there?',
      });

    expect(chatRes.status).toBe(403);
    expect(chatRes.body.success).toBe(false);
    expect(chatRes.body.message).toContain('blocked');

    // Blocked caller tries to request call -> Must return 403 Forbidden
    const callRes = await request(app)
      .post('/api/calls/request')
      .send({
        callerId: maleCaller._id,
        receiverId: femaleHost._id,
        ratePerMinute: 20,
      });

    expect(callRes.status).toBe(403);
    expect(callRes.body.success).toBe(false);
    expect(callRes.body.message).toContain('blocked');
  });

  it('6. POST /api/users/report: Submit safety violation report', async () => {
    const res = await request(app)
      .post('/api/users/report')
      .send({
        reporterId: femaleHost._id,
        reportedId: maleCaller._id,
        reason: 'contact_exchange',
        details: 'User attempted to share phone number repeatedly in room.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Safety report submitted');
  });

  it('7. PUT /api/users/privacy: Update privacy controls (hide online status)', async () => {
    const res = await request(app)
      .put('/api/users/privacy')
      .send({
        userId: femaleHost._id,
        hideOnlineStatus: true,
        allowCalls: false,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.hideOnlineStatus).toBe(true);
    expect(res.body.data.allowCalls).toBe(false);
  });

  it('8. GET /api/calls/ice-servers: Returns secure STUN/TURN server configuration', async () => {
    const res = await request(app).get('/api/calls/ice-servers');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.iceServers).toBeInstanceOf(Array);
    expect(res.body.iceServers.length).toBeGreaterThan(0);
  });

  it('9. DELETE /api/users/me: Permanent account deletion and data wiping', async () => {
    const tempUser = await User.create({
      name: 'Temp Deletable User',
      phone: `+91799${Date.now().toString().slice(-6)}8`,
      email: `delete.me.${Date.now()}@privacy.test`,
      age: 23,
      role: 'male',
      avatar: 'https://test.com/temp.jpg',
      coins: 50,
    });

    const res = await request(app)
      .delete('/api/users/me')
      .send({ userId: tempUser._id });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const deletedRecord = await User.findById(tempUser._id);
    expect(deletedRecord?.isDeleted).toBe(true);
    expect(deletedRecord?.phone).toBeUndefined();
    expect(deletedRecord?.name).toBe('Deleted User');
  });
});
