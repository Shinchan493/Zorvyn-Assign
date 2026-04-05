// ─── Dashboard Module Tests ───────────────────────────
//
// Tests for: GET /api/dashboard/summary, categories, trends, recent
//
// These tests cover:
// - Analyst and Admin can access all dashboard endpoints
// - Viewer is rejected (403)
// - Response shapes match expected formats
// - Date range filtering works

import request from 'supertest';
import app from '../app';
import { getAuthToken } from './helpers';
import { seedTestData, cleanupTestData, disconnectPrisma } from './setup';

beforeAll(async () => { await seedTestData(); });
afterAll(async () => { await cleanupTestData(); await disconnectPrisma(); });

describe('Dashboard Module', () => {
  // ─── SUMMARY ───────────────────────────────────────
  describe('GET /api/dashboard/summary', () => {
    it('should return financial summary for Admin', async () => {
      const token = await getAuthToken('admin');

      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalIncome');
      expect(res.body.data).toHaveProperty('totalExpense');
      expect(res.body.data).toHaveProperty('netBalance');
      expect(res.body.data).toHaveProperty('recordCount');
      expect(typeof res.body.data.totalIncome).toBe('number');
      expect(typeof res.body.data.netBalance).toBe('number');
    });

    it('should return financial summary for Analyst', async () => {
      const token = await getAuthToken('analyst');

      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('totalIncome');
    });

    it('should reject Viewer access (403)', async () => {
      const token = await getAuthToken('viewer');

      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should support date range filtering', async () => {
      const token = await getAuthToken('admin');

      const res = await request(app)
        .get('/api/dashboard/summary?startDate=2025-01-01&endDate=2025-12-31')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('totalIncome');
    });

    it('should reject unauthenticated access', async () => {
      const res = await request(app).get('/api/dashboard/summary');

      expect(res.status).toBe(401);
    });
  });

  // ─── CATEGORY BREAKDOWN ────────────────────────────
  describe('GET /api/dashboard/categories', () => {
    it('should return category breakdown for Admin', async () => {
      const token = await getAuthToken('admin');

      const res = await request(app)
        .get('/api/dashboard/categories')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);

      if (res.body.data.length > 0) {
        expect(res.body.data[0]).toHaveProperty('category');
        expect(res.body.data[0]).toHaveProperty('type');
        expect(res.body.data[0]).toHaveProperty('totalAmount');
        expect(res.body.data[0]).toHaveProperty('count');
      }
    });

    it('should support type filter', async () => {
      const token = await getAuthToken('admin');

      const res = await request(app)
        .get('/api/dashboard/categories?type=INCOME')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      res.body.data.forEach((item: any) => {
        expect(item.type).toBe('INCOME');
      });
    });

    it('should reject Viewer access (403)', async () => {
      const token = await getAuthToken('viewer');

      const res = await request(app)
        .get('/api/dashboard/categories')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  // ─── MONTHLY TRENDS ────────────────────────────────
  describe('GET /api/dashboard/trends', () => {
    it('should return monthly trends for Admin', async () => {
      const token = await getAuthToken('admin');

      const res = await request(app)
        .get('/api/dashboard/trends')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);

      if (res.body.data.length > 0) {
        expect(res.body.data[0]).toHaveProperty('month');
        expect(res.body.data[0]).toHaveProperty('income');
        expect(res.body.data[0]).toHaveProperty('expense');
        expect(res.body.data[0]).toHaveProperty('net');
        // Month format should be YYYY-MM
        expect(res.body.data[0].month).toMatch(/^\d{4}-\d{2}$/);
      }
    });

    it('should return trends for Analyst', async () => {
      const token = await getAuthToken('analyst');

      const res = await request(app)
        .get('/api/dashboard/trends')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should reject Viewer access (403)', async () => {
      const token = await getAuthToken('viewer');

      const res = await request(app)
        .get('/api/dashboard/trends')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  // ─── RECENT TRANSACTIONS ───────────────────────────
  describe('GET /api/dashboard/recent', () => {
    it('should return recent transactions for Admin', async () => {
      const token = await getAuthToken('admin');

      const res = await request(app)
        .get('/api/dashboard/recent')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(10); // Default limit
    });

    it('should respect custom limit', async () => {
      const token = await getAuthToken('admin');

      const res = await request(app)
        .get('/api/dashboard/recent?limit=3')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(3);
    });

    it('should include createdBy info', async () => {
      const token = await getAuthToken('admin');

      const res = await request(app)
        .get('/api/dashboard/recent')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      if (res.body.data.length > 0) {
        expect(res.body.data[0]).toHaveProperty('createdBy');
        expect(res.body.data[0].createdBy).toHaveProperty('name');
        expect(res.body.data[0].createdBy).toHaveProperty('email');
      }
    });

    it('should reject Viewer access (403)', async () => {
      const token = await getAuthToken('viewer');

      const res = await request(app)
        .get('/api/dashboard/recent')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });
});
