/**
 * Auth Routes — Integration Tests
 *
 * Run with: npm test --workspace=apps/api-gateway
 * Requires: DATABASE_URL and REDIS_URL env vars pointing to test instances
 */
import 'express-async-errors';
import request from 'supertest';
import express from 'express';
import authRoutes from '../routes/auth.routes';
import { errorHandler } from '../middleware/errorHandler';

// Minimal test app
const app = express();
app.use(express.json());
app.use('/auth', authRoutes);
app.use(errorHandler);

describe('POST /auth/register', () => {
  it('returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'not-an-email', username: 'test', password: 'Test@123456' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for weak password', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'test@example.com', username: 'test', password: 'weak' });
    expect(res.status).toBe(400);
  });
});

describe('POST /auth/login', () => {
  it('returns 400 for missing fields', async () => {
    const res = await request(app).post('/auth/login').send({});
    expect(res.status).toBe(400);
  });

  it('returns 401 for wrong credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'Wrong@123' });
    expect(res.status).toBe(401);
  });
});
