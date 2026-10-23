import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';

describe('System Health & Root Endpoints', () => {
  it('GET / should return server info and status', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('FRND Audio Calling & Chat Backend');
    expect(res.body.status).toBe('running');
    expect(res.body.endpoints).toBeDefined();
  });

  it('GET /api/health should report healthy database status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.database).toBe('connected');
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
  });

  it('GET /api/readiness should report readiness', async () => {
    const res = await request(app).get('/api/readiness');
    expect(res.status).toBe(200);
    expect(res.body.ready).toBe(true);
  });

  it('GET /unknown-route should return 404 with structured error response', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Cannot GET /api/does-not-exist');
  });
});
