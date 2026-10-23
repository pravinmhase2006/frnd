import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { User } from '../models/User.js';
import { Call } from '../models/Call.js';

describe('Voice Call Lifecycle & Settlement APIs', () => {
  let caller: any;
  let host: any;
  let callId = '';

  it('Setup: create a caller with coins and a host', async () => {
    caller = await User.create({
      name: 'Call Tester Male',
      email: `caller_${Date.now()}@frnd.app`,
      age: 24,
      role: 'male',
      coins: 100,
    });

    host = await User.create({
      name: 'Host Tester Female',
      email: `host_${Date.now()}@frnd.app`,
      age: 22,
      role: 'female',
      callRate: 20,
      earnings: 0,
    });
  });

  it('POST /api/calls/request should fail if caller has insufficient coins', async () => {
    // Temporarily reduce coins
    await User.findByIdAndUpdate(caller._id, { coins: 5 });

    const res = await request(app)
      .post('/api/calls/request')
      .send({
        callerId: caller._id.toString(),
        receiverId: host._id.toString(),
        ratePerMinute: 20,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Insufficient coins');

    // Restore coins
    await User.findByIdAndUpdate(caller._id, { coins: 100 });
  });

  it('POST /api/calls/request should start call session when coins are sufficient', async () => {
    const res = await request(app)
      .post('/api/calls/request')
      .send({
        callerId: caller._id.toString(),
        receiverId: host._id.toString(),
        ratePerMinute: 20,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBeDefined();
    expect(res.body.data.status).toBe('active');
    callId = res.body.data._id;
  });

  it('POST /api/calls/:id/end should settle call, deduct coins, and credit 70% host earnings', async () => {
    // 75 seconds duration = 2 billed minutes = 40 coins deducted.
    // 70% host earnings = 40 * 0.7 = 28 rupees.
    const res = await request(app)
      .post(`/api/calls/${callId}/end`)
      .send({ durationSeconds: 75 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.coinsDeducted).toBe(40);
    expect(res.body.data.minutes).toBe(2);
    expect(res.body.data.creatorEarnings).toBe(28);

    // Verify caller updated coins in DB: 100 - 40 = 60
    const updatedCaller = await User.findById(caller._id);
    expect(updatedCaller?.coins).toBe(60);

    // Verify host updated earnings in DB: 0 + 28 = 28
    const updatedHost = await User.findById(host._id);
    expect(updatedHost?.earnings).toBe(28);
  });

  it('POST /api/calls/:id/rate should record rating and update host average', async () => {
    const res = await request(app)
      .post(`/api/calls/${callId}/rate`)
      .send({
        rating: 5,
        compliments: ['Sweet Voice', 'Great Listener'],
        review: 'Super friendly and warm conversation!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const callDoc = await Call.findById(callId);
    expect(callDoc?.rating).toBe(5);
    expect(callDoc?.compliments).toContain('Sweet Voice');
  });

  it('GET /api/calls/history should return call records', async () => {
    const res = await request(app).get(`/api/calls/history?userId=${caller._id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
