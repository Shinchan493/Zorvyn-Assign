// ─── Auth Routes ──────────────────────────────────────
//
// WHAT THIS FILE DOES:
// Wires together the auth endpoints with their middleware chain and controller.
// This is the "routing table" for /api/auth/*.
//
// ROUTE TABLE:
// ┌────────┬─────────────────────┬────────────────────────────────────────────┐
// │ Method │ Path                │ Middleware Chain                           │
// ├────────┼─────────────────────┼────────────────────────────────────────────┤
// │ POST   │ /api/auth/register  │ authLimiter → validate(registerSchema) → registerHandler │
// │ POST   │ /api/auth/login     │ authLimiter → validate(loginSchema) → loginHandler       │
// │ GET    │ /api/auth/me        │ authenticate → getMeHandler                              │
// └────────┴─────────────────────┴────────────────────────────────────────────┘
//
// MIDDLEWARE EXPLAINED:
// - authLimiter: 5 requests per 15 minutes (brute-force protection)
// - validate(): Zod schema validation (rejects bad data before controller)
// - authenticate: JWT verification (ensures user is logged in)
//
// NOTE: register and login do NOT use `authenticate` — you can't require a token
// to create an account or log in (chicken-and-egg problem).
//
// NOTE: /me does NOT use `validate` — there's no request body to validate.
// The userId comes from the JWT, which was already verified by `authenticate`.

import { Router } from 'express';
import { authLimiter } from '../../middleware/rateLimiter';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { registerSchema, loginSchema } from './auth.schema';
import { registerHandler, loginHandler, getMeHandler } from './auth.controller';

const router = Router();

// ─── POST /api/auth/register ─────────────────────────
// Create a new user account.
// Chain: rate limit → validate input → create user + generate JWT
router.post('/register', authLimiter, validate(registerSchema), registerHandler);

// ─── POST /api/auth/login ────────────────────────────
// Authenticate with email + password.
// Chain: rate limit → validate input → verify credentials + generate JWT
router.post('/login', authLimiter, validate(loginSchema), loginHandler);

// ─── GET /api/auth/me ────────────────────────────────
// Get the currently authenticated user's profile.
// Chain: verify JWT → fetch user from DB
router.get('/me', authenticate, getMeHandler);

export default router;
