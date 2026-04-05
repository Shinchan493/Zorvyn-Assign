// ─── Records Module Tests ─────────────────────────────
//
// Tests for: CRUD operations on /api/records
//
// These tests cover:
// - Admin can create, list, get, update, and soft-delete records
// - Viewers can list and get records but cannot create/update/delete
// - Soft deleted records return 404
// - Validation (missing fields, invalid types)
// - Pagination and filtering

import request from 'supertest';
import app from '../app';
import { getAuthToken } from './helpers';
import { seedTestData, cleanupTestData, disconnectPrisma } from './setup';

beforeAll(async () => { await seedTestData(); });
afterAll(async () => { await cleanupTestData(); await disconnectPrisma(); });

describe('Records Module', () => {
  let createdRecordId: string;

  // ─── CREATE RECORD ─────────────────────────────────
  describe('POST /api/records', () => {
    it('should create a record when Admin', async () => {
      const token = await getAuthToken('admin');

      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 5000,
          type: 'INCOME',
          category: 'Test Salary',
          date: '2025-06-15',
          description: 'Test salary payment',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(5000);
      expect(res.body.data.type).toBe('INCOME');
      expect(res.body.data.category).toBe('Test Salary');
      expect(res.body.data.createdBy).toHaveProperty('id');

      createdRecordId = res.body.data.id;
    });

    it('should reject record creation by Viewer (403)', async () => {
      const token = await getAuthToken('viewer');

      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 100,
          type: 'EXPENSE',
          category: 'Test',
          date: '2025-06-15',
        });

      expect(res.status).toBe(403);
    });

    it('should reject missing required fields', async () => {
      const token = await getAuthToken('admin');

      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 100 }); // Missing type, category, date

      expect(res.status).toBe(400);
    });

    it('should reject negative amount', async () => {
      const token = await getAuthToken('admin');

      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: -100,
          type: 'EXPENSE',
          category: 'Test',
          date: '2025-06-15',
        });

      expect(res.status).toBe(400);
    });

    it('should reject invalid type', async () => {
      const token = await getAuthToken('admin');

      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 100,
          type: 'INVALID',
          category: 'Test',
          date: '2025-06-15',
        });

      expect(res.status).toBe(400);
    });
  });

  // ─── LIST RECORDS ──────────────────────────────────
  describe('GET /api/records', () => {
    it('should list records for any authenticated user', async () => {
      const token = await getAuthToken('viewer');

      const res = await request(app)
        .get('/api/records')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toHaveProperty('page');
      expect(res.body.meta).toHaveProperty('total');
    });

    it('should support type filter', async () => {
      const token = await getAuthToken('viewer');

      const res = await request(app)
        .get('/api/records?type=INCOME')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      res.body.data.forEach((record: any) => {
        expect(record.type).toBe('INCOME');
      });
    });

    it('should support pagination', async () => {
      const token = await getAuthToken('viewer');

      const res = await request(app)
        .get('/api/records?page=1&limit=5')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(5);
      expect(res.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should reject unauthenticated access', async () => {
      const res = await request(app).get('/api/records');

      expect(res.status).toBe(401);
    });
  });

  // ─── GET RECORD BY ID ─────────────────────────────
  describe('GET /api/records/:id', () => {
    it('should return a record by ID', async () => {
      const token = await getAuthToken('viewer');

      const res = await request(app)
        .get(`/api/records/${createdRecordId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdRecordId);
      expect(res.body.data.amount).toBe(5000);
    });

    it('should return 404 for non-existent record', async () => {
      const token = await getAuthToken('viewer');

      const res = await request(app)
        .get('/api/records/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── UPDATE RECORD ─────────────────────────────────
  describe('PATCH /api/records/:id', () => {
    it('should update a record when Admin', async () => {
      const token = await getAuthToken('admin');

      const res = await request(app)
        .patch(`/api/records/${createdRecordId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 5500, description: 'Updated salary' });

      expect(res.status).toBe(200);
      expect(res.body.data.amount).toBe(5500);
    });

    it('should reject update by Viewer (403)', async () => {
      const token = await getAuthToken('viewer');

      const res = await request(app)
        .patch(`/api/records/${createdRecordId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 9999 });

      expect(res.status).toBe(403);
    });
  });

  // ─── DELETE RECORD (Soft Delete) ───────────────────
  describe('DELETE /api/records/:id', () => {
    it('should soft-delete a record when Admin', async () => {
      const token = await getAuthToken('admin');

      const res = await request(app)
        .delete(`/api/records/${createdRecordId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);
    });

    it('should return 404 when getting a soft-deleted record', async () => {
      const token = await getAuthToken('viewer');

      const res = await request(app)
        .get(`/api/records/${createdRecordId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('should reject delete by Viewer (403)', async () => {
      const token = await getAuthToken('viewer');

      const res = await request(app)
        .delete(`/api/records/${createdRecordId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });
});
