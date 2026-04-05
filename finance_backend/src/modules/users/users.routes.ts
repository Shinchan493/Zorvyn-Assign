// ─── Users Routes ─────────────────────────────────────
//
// WHAT THIS FILE DOES:
// Wires together the user management endpoints with their middleware + controllers.
// This is the routing table for /api/users/*.
//
// ACCESS CONTROL:
// ALL routes require authentication AND Admin role.
// Instead of repeating `authenticate, authorize('ADMIN')` on every route,
// we apply them once at the router level using router.use().
// This means every route defined below is automatically protected.
//
// ROUTE TABLE:
// ┌────────┬──────────────────────────┬──────────────────────────────────┐
// │ Method │ Path                     │ Middleware + Handler             │
// ├────────┼──────────────────────────┼──────────────────────────────────┤
// │ GET    │ /api/users               │ validate(list) → listUsers      │
// │ GET    │ /api/users/:id           │ validate(get)  → getUser        │
// │ PATCH  │ /api/users/:id           │ validate(upd)  → updateUser     │
// │ PATCH  │ /api/users/:id/role      │ validate(role) → changeRole     │
// │ PATCH  │ /api/users/:id/status    │ validate(stat) → changeStatus   │
// └────────┴──────────────────────────┴──────────────────────────────────┘
//
// NOTE: There is no DELETE endpoint. Users are never deleted — they are
// deactivated via the /status endpoint. This preserves data integrity
// (financial records still reference the user who created them).

import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import {
  listUsersSchema,
  getUserSchema,
  updateUserSchema,
  changeRoleSchema,
  changeStatusSchema,
} from './users.schema';
import {
  listUsersHandler,
  getUserHandler,
  updateUserHandler,
  changeRoleHandler,
  changeStatusHandler,
} from './users.controller';

const router = Router();

// ─── Apply auth + RBAC to ALL routes in this router ──
// Every endpoint below requires:
//   1. A valid JWT token (authenticate)
//   2. The ADMIN role (authorize('ADMIN'))
router.use(authenticate, authorize('ADMIN'));

// ─── GET /api/users ──────────────────────────────────
// List all users with pagination and optional role/status filters.
router.get('/', validate(listUsersSchema), listUsersHandler);

// ─── GET /api/users/:id ─────────────────────────────
// Get a single user by ID.
router.get('/:id', validate(getUserSchema), getUserHandler);

// ─── PATCH /api/users/:id ───────────────────────────
// Update a user's name and/or email.
router.patch('/:id', validate(updateUserSchema), updateUserHandler);

// ─── PATCH /api/users/:id/role ──────────────────────
// Change a user's role (VIEWER, ANALYST, ADMIN).
router.patch('/:id/role', validate(changeRoleSchema), changeRoleHandler);

// ─── PATCH /api/users/:id/status ────────────────────
// Activate or deactivate a user account.
router.patch('/:id/status', validate(changeStatusSchema), changeStatusHandler);

export default router;
