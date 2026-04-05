// ─── Users Module Tests ───────────────────────────────
//
// Tests for: GET/PATCH /api/users (Admin-only endpoints)
//
// These tests cover:
// - Admin can list, get, update users
// - Admin can change roles and status
// - Self-action protection (cannot change own role/status)
// - Non-admin users are rejected (403 Forbidden)
// - Unauthenticated access is rejected (401 Unauthorized)

import request from 'supertest';
import app from '../app';
import { getAuthToken } from './helpers';
import { seedTestData, cleanupTestData, disconnectPrisma, userIds } from './setup';

beforeAll(async () => { await seedTestData(); });
afterAll(async () => { await cleanupTestData(); await disconnectPrisma(); });

describe('Users Module', () => {
  // ─── LIST USERS ────────────────────────────────────
  describe('GET /api/users', () => {
    it('should list users when Admin', async () => {
      const token = await getAuthToken('admin');

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toHaveProperty('page');
      expect(res.body.meta).toHaveProperty('total');
    });

    it('should support pagination params', async () => {
      const token = await getAuthToken('admin');

      const res = await request(app)
        .get('/api/users?page=1&limit=2')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(2);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
    });

    it('should filter by role', async () => {
      const token = await getAuthToken('admin');

      const res = await request(app)
        .get('/api/users?role=ADMIN')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      res.body.data.forEach((user: any) => {
        expect(user.role).toBe('ADMIN');
      });
    });

    it('should reject Viewer access (403)', async () => {
      const token = await getAuthToken('viewer');

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should reject Analyst access (403)', async () => {
      const token = await getAuthToken('analyst');

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should reject unauthenticated access (401)', async () => {
      const res = await request(app).get('/api/users');

      expect(res.status).toBe(401);
    });
  });

  // ─── GET USER BY ID ────────────────────────────────
  describe('GET /api/users/:id', () => {
    it('should return a user by ID', async () => {
      const token = await getAuthToken('admin');
      const targetId = userIds['viewer'];

      const res = await request(app)
        .get(`/api/users/${targetId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(targetId);
      expect(res.body.data).not.toHaveProperty('passwordHash');
    });

    it('should return 404 for non-existent user', async () => {
      const token = await getAuthToken('admin');

      const res = await request(app)
        .get('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── UPDATE USER ───────────────────────────────────
  describe('PATCH /api/users/:id', () => {
    it('should update user name', async () => {
      const token = await getAuthToken('admin');
      const targetId = userIds['viewer'];

      const res = await request(app)
        .patch(`/api/users/${targetId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Viewer Name' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Viewer Name');
    });

    it('should reject empty update body', async () => {
      const token = await getAuthToken('admin');
      const targetId = userIds['viewer'];

      const res = await request(app)
        .patch(`/api/users/${targetId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ─── CHANGE ROLE ───────────────────────────────────
  describe('PATCH /api/users/:id/role', () => {
    it('should change another user\'s role', async () => {
      const token = await getAuthToken('admin');
      const targetId = userIds['viewer'];

      const res = await request(app)
        .patch(`/api/users/${targetId}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'ANALYST' });

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('ANALYST');

      // Restore original role for other tests
      await request(app)
        .patch(`/api/users/${targetId}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'VIEWER' });
    });

    it('should prevent Admin from changing own role', async () => {
      const token = await getAuthToken('admin');
      const adminId = userIds['admin'];

      const res = await request(app)
        .patch(`/api/users/${adminId}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'VIEWER' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── CHANGE STATUS ─────────────────────────────────
  describe('PATCH /api/users/:id/status', () => {
    it('should deactivate another user', async () => {
      const token = await getAuthToken('admin');
      const targetId = userIds['viewer'];

      const res = await request(app)
        .patch(`/api/users/${targetId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'INACTIVE' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('INACTIVE');

      // Reactivate for other tests
      await request(app)
        .patch(`/api/users/${targetId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'ACTIVE' });
    });

    it('should prevent Admin from deactivating self', async () => {
      const token = await getAuthToken('admin');
      const adminId = userIds['admin'];

      const res = await request(app)
        .patch(`/api/users/${adminId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'INACTIVE' });

      expect(res.status).toBe(400);
    });
  });
});
