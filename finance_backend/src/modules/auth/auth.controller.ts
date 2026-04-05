// ─── Auth Controller ──────────────────────────────────
//
// WHAT THIS FILE DOES:
// Translates HTTP requests into service calls and formats the responses.
// Controllers are intentionally THIN — all business logic lives in auth.service.ts.
//
// PATTERN: Controller → Service → Database
//
//   Request → Controller (extract data from req) → Service (business logic) → Response
//
// EACH CONTROLLER METHOD:
// 1. Extracts relevant data from the request (body, params, user)
// 2. Calls the corresponding service function
// 3. Sends a standardized response using ApiResponse
//
// WHY THIN CONTROLLERS?
// - If you ever need the same logic from a CLI or cron job, call the service directly
// - Services are easy to unit test (no req/res mocking needed)
// - Controllers only handle HTTP concerns (status codes, headers, etc.)
//
// ERROR HANDLING:
// Controllers don't catch errors. They let exceptions bubble up to the
// global `errorHandler` middleware, which formats them consistently.
// This avoids duplicating try/catch in every controller method.

import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/apiResponse';
import * as authService from './auth.service';

// ═══════════════════════════════════════════════════════
// POST /api/auth/register
// ═══════════════════════════════════════════════════════
// Creates a new user account and returns a JWT token.
//
// Request body (already validated by Zod middleware):
//   { name: string, email: string, password: string }
//
// Response (201 Created):
//   { success: true, data: { user: {...}, token: "eyJ..." } }

export async function registerHandler(req: Request, res: Response): Promise<void> {
  const result = await authService.register(req.body);
  ApiResponse.created(res, result);
}

// ═══════════════════════════════════════════════════════
// POST /api/auth/login
// ═══════════════════════════════════════════════════════
// Authenticates a user and returns a JWT token.
//
// Request body (already validated by Zod middleware):
//   { email: string, password: string }
//
// Response (200 OK):
//   { success: true, data: { user: {...}, token: "eyJ..." } }

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const result = await authService.login(req.body);
  ApiResponse.success(res, result);
}

// ═══════════════════════════════════════════════════════
// GET /api/auth/me
// ═══════════════════════════════════════════════════════
// Returns the currently authenticated user's profile.
// Requires a valid JWT token (enforced by `authenticate` middleware).
//
// req.user is set by the auth middleware (middleware/auth.ts).
// We use the non-null assertion (!) because the `authenticate` middleware
// guarantees req.user exists before this controller is reached.
//
// Response (200 OK):
//   { success: true, data: { id, name, email, role, status, createdAt, updatedAt } }

export async function getMeHandler(req: Request, res: Response): Promise<void> {
  const user = await authService.getMe(req.user!.id);
  ApiResponse.success(res, user);
}
