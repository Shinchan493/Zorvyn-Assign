// ─── Users Controller ─────────────────────────────────
//
// WHAT THIS FILE DOES:
// Thin HTTP handlers for user management endpoints.
// Same pattern as auth.controller.ts:
//   1. Extract data from request (params, query, body, user)
//   2. Call the corresponding service function
//   3. Send a standardized response using ApiResponse
//
// ALL HANDLERS ARE ADMIN-ONLY:
// Access control is enforced by the RBAC middleware in the route definitions.
// By the time these handlers execute, we know the request is from an Admin.

import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/apiResponse';
import * as usersService from './users.service';

// ═══════════════════════════════════════════════════════
// GET /api/users
// ═══════════════════════════════════════════════════════
// Lists all users with pagination and optional filters.
//
// Query params (already validated by Zod):
//   ?page=1&limit=20&role=ADMIN&status=ACTIVE
//
// Response (200 OK):
//   { success: true, data: [...users], meta: { page, limit, total, totalPages } }

export async function listUsersHandler(req: Request, res: Response): Promise<void> {
  const result = await usersService.listUsers(req.query as any);
  ApiResponse.success(res, result.users, result.meta);
}

// ═══════════════════════════════════════════════════════
// GET /api/users/:id
// ═══════════════════════════════════════════════════════
// Gets a single user by ID.
//
// Response (200 OK):
//   { success: true, data: { id, name, email, role, status, ... } }

export async function getUserHandler(req: Request, res: Response): Promise<void> {
  const user = await usersService.getUserById(req.params.id as string);
  ApiResponse.success(res, user);
}

// ═══════════════════════════════════════════════════════
// PATCH /api/users/:id
// ═══════════════════════════════════════════════════════
// Updates a user's name and/or email.
//
// Request body (already validated by Zod):
//   { name?: string, email?: string }
//
// Response (200 OK):
//   { success: true, data: { ...updatedUser } }

export async function updateUserHandler(req: Request, res: Response): Promise<void> {
  const user = await usersService.updateUser(req.params.id as string, req.body);
  ApiResponse.success(res, user);
}

// ═══════════════════════════════════════════════════════
// PATCH /api/users/:id/role
// ═══════════════════════════════════════════════════════
// Changes a user's role.
//
// Request body (already validated by Zod):
//   { role: 'VIEWER' | 'ANALYST' | 'ADMIN' }
//
// The current user's ID (from JWT) is passed to the service
// to enforce the "cannot change own role" business rule.
//
// Response (200 OK):
//   { success: true, data: { ...updatedUser } }

export async function changeRoleHandler(req: Request, res: Response): Promise<void> {
  const user = await usersService.changeRole(req.params.id as string, req.body, req.user!.id);
  ApiResponse.success(res, user);
}

// ═══════════════════════════════════════════════════════
// PATCH /api/users/:id/status
// ═══════════════════════════════════════════════════════
// Activates or deactivates a user account.
//
// Request body (already validated by Zod):
//   { status: 'ACTIVE' | 'INACTIVE' }
//
// The current user's ID (from JWT) is passed to the service
// to enforce the "cannot deactivate own account" business rule.
//
// Response (200 OK):
//   { success: true, data: { ...updatedUser } }

export async function changeStatusHandler(req: Request, res: Response): Promise<void> {
  const user = await usersService.changeStatus(req.params.id as string, req.body, req.user!.id);
  ApiResponse.success(res, user);
}
