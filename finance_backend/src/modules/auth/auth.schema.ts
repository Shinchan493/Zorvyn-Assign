// ─── Auth Zod Schemas ─────────────────────────────────
//
// WHAT THIS FILE DOES:
// Defines the shape of valid request data for auth endpoints using Zod.
// These schemas are used by the `validate()` middleware to:
//   1. Reject bad data BEFORE it reaches the controller
//   2. Provide clear, field-level error messages to the client
//   3. Transform/coerce data (e.g., trim whitespace from emails)
//
// SCHEMA STRUCTURE:
// Each schema wraps its fields in `body: z.object({...})` because the
// validate middleware parses `{ body: req.body, query: req.query, params: req.params }`.
// This means the Zod path for errors will be "body.email", "body.password", etc.,
// which maps perfectly to where the field came from.
//
// WHY NOT USE z.string().email() ALONE?
// We add .trim() and .toLowerCase() to normalize emails.
// "  User@Gmail.COM  " → "user@gmail.com"
// This prevents duplicate accounts with different casing/spacing.

import { z } from 'zod/v4';

// ─── Register Schema ─────────────────────────────────
// POST /api/auth/register
//
// Requirements:
// - name: 2–100 characters, trimmed
// - email: valid email format, trimmed, lowercased
// - password: 8–100 characters (strong enough for this project)
//
// NOTE: We don't allow setting `role` or `status` during registration.
// New users always start as VIEWER + ACTIVE. Only Admins can change roles later.

export const registerSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must not exceed 100 characters'),

    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Please provide a valid email address'),

    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password must not exceed 100 characters'),
  }),
});

// ─── Login Schema ─────────────────────────────────────
// POST /api/auth/login
//
// Simpler than register — we just need email + password.
// No length validation on password here (that was enforced during registration).
// We still trim/lowercase email for consistent lookups.

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Please provide a valid email address'),

    password: z
      .string()
      .min(1, 'Password is required'),
  }),
});

// ─── Type Exports ─────────────────────────────────────
// These types are inferred FROM the schemas, so they're always in sync.
// If you change the schema, the type updates automatically.
//
// Usage in service/controller:
//   import type { RegisterInput, LoginInput } from './auth.schema';
//   function register(data: RegisterInput) { ... }

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
