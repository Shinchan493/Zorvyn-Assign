// ─── Auth Module Tests ────────────────────────────────
//
// Tests for: POST /api/auth/register, POST /api/auth/login, GET /api/auth/me
//
// These tests cover:
// - Successful registration and login flows
// - Input validation (missing fields, invalid email, short password)
// - Duplicate email rejection
// - Wrong password / nonexistent email handling
// - Authenticated /me endpoint
// - Unauthenticated access rejection

import request from 'supertest';
import app from '../app';
import { getAuthToken } from './helpers';
import { seedTestData, cleanupTestData, disconnectPrisma } from './setup';

beforeAll(async () => { await seedTestData(); });
afterAll(async () => { await cleanupTestData(); await disconnectPrisma(); });

describe('Auth Module', () => {
  // ─── REGISTER ──────────────────────────────────────
  describe('POST /api/auth/register', () => {
    const uniqueEmail = `register-test-${Date.now()}@test.com`;

    it('should register a new user and return token', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New Test User',
          email: uniqueEmail,
          password: 'password123',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toHaveProperty('id');
      expect(res.body.data.user.email).toBe(uniqueEmail);
      expect(res.body.data.user.role).toBe('VIEWER');
      expect(res.body.data.token).toBeDefined();
      // Password hash should NEVER be in response
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('should reject duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Duplicate User',
          email: uniqueEmail, // Same email as above
          password: 'password123',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'No Email' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject password shorter than 8 characters', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Short Pass',
          email: 'shortpass@test.com',
          password: '1234567',
        });

      expect(res.status).toBe(400);
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Bad Email',
          email: 'not-an-email',
          password: 'password123',
        });

      expect(res.status).toBe(400);
    });
  });

  // ─── LOGIN ─────────────────────────────────────────
  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test-admin@finance.com',
          password: 'testadmin123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('test-admin@finance.com');
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('should reject wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test-admin@finance.com',
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject nonexistent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nobody@nowhere.com',
          password: 'password123',
        });

      expect(res.status).toBe(401);
    });

    it('should return same error for wrong email and wrong password (enumeration protection)', async () => {
      const wrongEmail = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@nowhere.com', password: 'password123' });

      const wrongPass = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test-admin@finance.com', password: 'wrongpassword' });

      // Both should give 401 with same error message
      expect(wrongEmail.status).toBe(401);
      expect(wrongPass.status).toBe(401);
      expect(wrongEmail.body.error.message).toBe(wrongPass.body.error.message);
    });
  });

  // ─── GET ME ────────────────────────────────────────
  describe('GET /api/auth/me', () => {
    it('should return current user when authenticated', async () => {
      const token = await getAuthToken('admin');

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('test-admin@finance.com');
      expect(res.body.data.role).toBe('ADMIN');
      expect(res.body.data).not.toHaveProperty('passwordHash');
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token-here');

      expect(res.status).toBe(401);
    });
  });
});
