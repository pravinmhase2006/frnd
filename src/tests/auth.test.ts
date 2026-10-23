import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { User } from '../models/User.js';

describe('Authentication & Profile Workflows', () => {
  const testEmail = `test_${Date.now()}@frnd.app`;
  let verificationCode = '';
  let authToken = '';
  let userId = '';

  it('POST /api/auth/send-email-code should validate email format', async () => {
    const res = await request(app)
      .post('/api/auth/send-email-code')
      .send({ email: 'invalid-email-string' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/send-email-code should issue verification code', async () => {
    const res = await request(app)
      .post('/api/auth/send-email-code')
      .send({ email: testEmail });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(testEmail);
    expect(res.body.data.codeHint).toBeDefined();
    verificationCode = res.body.data.codeHint;
  });

  it('POST /api/auth/verify-email should reject invalid code', async () => {
    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({
        email: testEmail,
        code: '999999',
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/verify-email should register user & return JWT token with valid code', async () => {
    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({
        email: testEmail,
        code: verificationCode,
        name: 'Automated Test User',
        role: 'male',
        age: 23,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe(testEmail);
    expect(res.body.data.user.role).toBe('male');
    expect(res.body.data.user.isVerified).toBe(true);

    authToken = res.body.data.token;
    userId = res.body.data.user._id;
  });

  it('GET /api/auth/me should return current user profile using JWT', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(userId);
    expect(res.body.data.email).toBe(testEmail);
  });

  it('PUT /api/auth/profile/:id should update user profile', async () => {
    const res = await request(app)
      .put(`/api/auth/profile/${userId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Rahul Updated',
        bio: 'Updated bio for automated testing',
        interests: ['Music', 'Deep Talk'],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Rahul Updated');
    expect(res.body.data.bio).toBe('Updated bio for automated testing');
  });

  it('PUT /api/auth/profile/:id should reject unauthorized edits to other profiles', async () => {
    const fakeOtherId = '507f1f77bcf86cd799439011';
    const res = await request(app)
      .put(`/api/auth/profile/${fakeOtherId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Hacker Name' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/logout should mark user offline', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const userInDb = await User.findById(userId);
    expect(userInDb?.isOnline).toBe(false);
  });
});
