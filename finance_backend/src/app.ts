// ─── Express App Setup ────────────────────────────────
//
// This file creates and configures the Express application.
// It is SEPARATE from server.ts on purpose:
//
//   app.ts  → creates the Express app, attaches middleware (testable)
//   server.ts → starts listening on a port (side effect, not testable)
//
// This separation lets us import `app` in tests without starting a server.

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { apiLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';

const app = express();

// ─── MIDDLEWARE ORDER MATTERS! ────────────────────────
// Express processes middleware top-to-bottom. Order:
// 1. Security headers (protect against common attacks)
// 2. CORS (allow cross-origin requests)
// 3. Request logging (see what's hitting the server)
// 4. Body parsing (convert JSON string → JS object)
// 5. Rate limiting (reject too-frequent requests) — added later
// 6. Routes — added later
// 7. 404 handler — added later
// 8. Error handler (MUST be last)

// 1. Helmet: sets security HTTP headers automatically
//    - X-Content-Type-Options: nosniff
//    - X-Frame-Options: DENY
//    - Strict-Transport-Security, etc.
app.use(helmet());

// 2. CORS: allows requests from any origin (frontend can be on a different port)
//    In production, you'd restrict this to specific domains
app.use(cors());

// 3. Morgan: logs every HTTP request to console
//    'dev' format: :method :url :status :response-time ms
//    Example: POST /api/auth/login 200 45.123 ms
if (config.isDev) {
  app.use(morgan('dev'));
}

// 4. Body Parsing: converts incoming JSON request bodies to JavaScript objects
//    limit: '10kb' protects against giant payload attacks
//    Without this, req.body would be undefined
app.use(express.json({ limit: '10kb' }));

// 5. Rate Limiting: reject too-frequent requests
//    100 requests per minute per IP for all /api routes
app.use('/api', apiLimiter);

// ─── ROUTES ───────────────────────────────────────────

// Auth routes — register, login, get current user
app.use('/api/auth', authRoutes);

// Users routes — CRUD + role/status management (Admin-only)
app.use('/api/users', usersRoutes);

// Health check endpoint — useful to verify the server is running
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
    },
  });
});

// ─── 404 Handler ──────────────────────────────────────
// This catches any request that didn't match a defined route.
// Must come AFTER all routes, BEFORE the error handler.
// NOTE: Express 5 uses {*name} syntax instead of just *
app.use('{*path}', (_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
});

// ─── Global Error Handler ─────────────────────────────
// MUST be the LAST middleware. Express routes thrown errors and
// next(error) calls to the first 4-argument middleware it finds.
app.use(errorHandler);

export default app;
