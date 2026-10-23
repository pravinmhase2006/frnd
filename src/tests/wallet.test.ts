import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { User } from '../models/User.js';

describe('Wallet, Recharges & Withdrawals APIs', () => {
  let caller: any;
  let creator: any;

  it('Setup: create user accounts for wallet tests', async () => {
    caller = await User.create({
      name: 'Wallet Caller',
      email: `wcaller_${Date.now()}@frnd.app`,
      age: 25,
      role: 'male',
      coins: 50,
    });

    creator = await User.create({
      name: 'Wallet Creator',
      email: `wcreator_${Date.now()}@frnd.app`,
      age: 23,
      role: 'female',
      earnings: 500,
    });
  });

  it('GET /api/wallet/:userId should fetch wallet summary', async () => {
    const res = await request(app).get(`/api/wallet/${caller._id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.coins).toBe(50);
  });

  it('POST /api/wallet/recharge should add coins to balance', async () => {
    const res = await request(app)
      .post('/api/wallet/recharge')
      .send({
        userId: caller._id.toString(),
        coins: 250,
        amountRupees: 99,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.newBalance).toBe(300); // 50 + 250

    const updatedUser = await User.findById(caller._id);
    expect(updatedUser?.coins).toBe(300);
  });

  it('POST /api/wallet/withdraw should reject invalid UPI IDs', async () => {
    const res = await request(app)
      .post('/api/wallet/withdraw')
      .send({
        userId: creator._id.toString(),
        amountRupees: 200,
        upiId: 'invalid-upi-without-at-sign',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/wallet/withdraw should reject withdrawal exceeding balance', async () => {
    const res = await request(app)
      .post('/api/wallet/withdraw')
      .send({
        userId: creator._id.toString(),
        amountRupees: 99999,
        upiId: 'creator@paytm',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Insufficient earnings balance');
  });

  it('POST /api/wallet/withdraw should atomically deduct balance and record payout', async () => {
    const res = await request(app)
      .post('/api/wallet/withdraw')
      .send({
        userId: creator._id.toString(),
        amountRupees: 200,
        upiId: 'creator@paytm',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.remainingEarnings).toBe(300); // 500 - 200

    const updatedCreator = await User.findById(creator._id);
    expect(updatedCreator?.earnings).toBe(300);
  });
});
