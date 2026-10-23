import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { User } from '../models/User.js';

describe('User Discovery & Match APIs', () => {
  let sampleHostId = '';

  it('Setup: ensure at least one female host exists in DB', async () => {
    let host = await User.findOne({ role: 'female' });
    if (!host) {
      host = await User.create({
        name: 'Test Ananya Host',
        email: `ananya_${Date.now()}@frnd.app`,
        age: 22,
        role: 'female',
        isOnline: true,
        callRate: 20,
        rating: 4.9,
      });
    }
    sampleHostId = host._id.toString();
    expect(sampleHostId).toBeDefined();
  });

  it('GET /api/users should list online creators', async () => {
    const res = await request(app).get('/api/users?role=female');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/users/match should pick a valid instant match', async () => {
    const res = await request(app).get('/api/users/match?role=male');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.role).toBe('female');
  });

  it('GET /api/users/:id should fetch user details by ObjectId', async () => {
    const res = await request(app).get(`/api/users/${sampleHostId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(sampleHostId);
  });

  it('GET /api/users/:id should return 404 for non-existent ID', async () => {
    const fakeId = '507f1f77bcf86cd799439099';
    const res = await request(app).get(`/api/users/${fakeId}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
