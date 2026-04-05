// ─── Users Zod Schemas ────────────────────────────────
//
// WHAT THIS FILE DOES:
// Defines validation schemas for all user management endpoints.
// Only ADMINs can manage users, so these schemas cover admin operations:
//   - Listing users (with pagination + filters)
//   - Getting a user by ID
//   - Updating a user's profile (name, email)
//   - Changing a user's role
//   - Changing a user's status (activate/deactivate)
//
// PATTERN: query vs body vs params
// - params: URL path variables (e.g., /users/:id → params.id)
// - query: URL query string (e.g., /users?page=2&role=ADMIN)
// - body: JSON request body (e.g., { name: "New Name" })
//
// Each schema only validates the parts of the request that are relevant.

import { z } from 'zod/v4';

// ─── Shared: UUID param ──────────────────────────────
// Reused by every endpoint that takes :id in the URL.
// UUID format validation prevents invalid IDs from reaching the database.
const idParam = z.object({
  id: z.string().uuid('Invalid user ID format'),
});

// ─── List Users Schema ───────────────────────────────
// GET /api/users?page=1&limit=20&role=ADMIN&status=ACTIVE
//
// All query params are optional:
// - page/limit: pagination (defaults applied by parsePagination utility)
// - role: filter by role (VIEWER, ANALYST, ADMIN)
// - status: filter by status (ACTIVE, INACTIVE)
//
// z.coerce.number() handles the fact that query params arrive as strings.
// ?page=2 → req.query.page is "2" (string) → coerced to 2 (number)

export const listUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    role: z.enum(['VIEWER', 'ANALYST', 'ADMIN']).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  }),
});

// ─── Get User by ID Schema ──────────────────────────
// GET /api/users/:id
//
// Only validates the URL parameter — no body or query needed.

export const getUserSchema = z.object({
  params: idParam,
});

// ─── Update User Schema ─────────────────────────────
// PATCH /api/users/:id
//
// Admins can update a user's name and/or email.
// Both fields are optional (PATCH = partial update).
//
// .refine() ensures at least one field is provided —
// a PATCH request with an empty body makes no sense.

export const updateUserSchema = z.object({
  params: idParam,
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must not exceed 100 characters')
      .optional(),

    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Please provide a valid email address')
      .optional(),
  }).refine(
    (data) => data.name !== undefined || data.email !== undefined,
    { message: 'At least one field (name or email) must be provided' }
  ),
});

// ─── Change Role Schema ─────────────────────────────
// PATCH /api/users/:id/role
//
// Changes a user's role. This is a separate endpoint from general update
// because role changes are a significant security operation that should
// be clearly auditable and intentional.

export const changeRoleSchema = z.object({
  params: idParam,
  body: z.object({
    role: z.enum(['VIEWER', 'ANALYST', 'ADMIN'], {
      error: 'Role must be one of: VIEWER, ANALYST, ADMIN',
    }),
  }),
});

// ─── Change Status Schema ───────────────────────────
// PATCH /api/users/:id/status
//
// Activates or deactivates a user account.
// Deactivated users cannot log in (enforced by auth.service.login).
// Like role changes, this is a separate endpoint for clarity.

export const changeStatusSchema = z.object({
  params: idParam,
  body: z.object({
    status: z.enum(['ACTIVE', 'INACTIVE'], {
      error: 'Status must be one of: ACTIVE, INACTIVE',
    }),
  }),
});

// ─── Type Exports ────────────────────────────────────
// Inferred from schemas — always in sync with validation rules.

export type ListUsersQuery = z.infer<typeof listUsersSchema>['query'];
export type UpdateUserInput = z.infer<typeof updateUserSchema>['body'];
export type ChangeRoleInput = z.infer<typeof changeRoleSchema>['body'];
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>['body'];
