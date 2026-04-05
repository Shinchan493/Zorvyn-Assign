// ─── Records Routes ───────────────────────────────────
//
// WHAT THIS FILE DOES:
// Wires together the financial record endpoints with their middleware + controllers.
// This is the routing table for /api/records/*.
//
// ACCESS CONTROL:
// Unlike the users module (Admin-only), records have MIXED access:
// - Read operations (GET): All authenticated users (VIEWER, ANALYST, ADMIN)
// - Write operations (POST, PATCH, DELETE): ADMIN only
//
// So we can't apply a blanket router.use(authorize('ADMIN')).
// Instead, each route explicitly declares its required roles.
//
// ROUTE TABLE:
// ┌────────┬──────────────────────┬────────────────────────────────────────────┐
// │ Method │ Path                 │ Access + Middleware                        │
// ├────────┼──────────────────────┼────────────────────────────────────────────┤
// │ GET    │ /api/records         │ All auth'd → validate → listRecords       │
// │ GET    │ /api/records/:id     │ All auth'd → validate → getRecord         │
// │ POST   │ /api/records         │ ADMIN only → validate → createRecord      │
// │ PATCH  │ /api/records/:id     │ ADMIN only → validate → updateRecord      │
// │ DELETE │ /api/records/:id     │ ADMIN only → validate → deleteRecord      │
// └────────┴──────────────────────┴────────────────────────────────────────────┘

import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import {
  createRecordSchema,
  updateRecordSchema,
  getRecordSchema,
  deleteRecordSchema,
  listRecordsSchema,
} from './records.schema';
import {
  createRecordHandler,
  listRecordsHandler,
  getRecordHandler,
  updateRecordHandler,
  deleteRecordHandler,
} from './records.controller';

const router = Router();

// ─── All routes require authentication ───────────────
// Applied at router level — every endpoint below needs a valid JWT.
router.use(authenticate);

// ─── READ ROUTES (All authenticated users) ───────────
// VIEWERs, ANALYSTs, and ADMINs can all list and view records.

// GET /api/records — List records with pagination + filters
router.get(
  '/',
  authorize('VIEWER', 'ANALYST', 'ADMIN'),
  validate(listRecordsSchema),
  listRecordsHandler
);

// GET /api/records/:id — Get a single record
router.get(
  '/:id',
  authorize('VIEWER', 'ANALYST', 'ADMIN'),
  validate(getRecordSchema),
  getRecordHandler
);

// ─── WRITE ROUTES (Admin only) ───────────────────────
// Only ADMINs can create, update, or delete records.

// POST /api/records — Create a new record
router.post(
  '/',
  authorize('ADMIN'),
  validate(createRecordSchema),
  createRecordHandler
);

// PATCH /api/records/:id — Update a record
router.patch(
  '/:id',
  authorize('ADMIN'),
  validate(updateRecordSchema),
  updateRecordHandler
);

// DELETE /api/records/:id — Soft delete a record
router.delete(
  '/:id',
  authorize('ADMIN'),
  validate(deleteRecordSchema),
  deleteRecordHandler
);

export default router;
