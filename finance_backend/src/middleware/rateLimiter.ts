// ─── Rate Limiting Middleware ─────────────────────────
//
// WHAT IT DOES:
// Limits how many requests a client can make in a time window.
// If they exceed the limit, they get a 429 "Too Many Requests" response.
//
// WHY TWO LIMITERS?
// 1. authLimiter (STRICT): Protects login/register from brute-force attacks.
//    Only 5 attempts per 15 minutes — stops password guessing dead.
//
// 2. apiLimiter (GENERAL): Prevents API abuse on all other routes.
//    100 requests per minute is generous for normal use, but blocks scrapers/bots.
//
// HOW express-rate-limit WORKS:
// It tracks requests by IP address (using an in-memory store).
// Each IP gets a "bucket" that fills up with each request.
// The bucket empties (resets) after the window expires.
//
// RESPONSE HEADERS (when standardHeaders is true):
//   RateLimit-Limit: 5          ← max requests allowed
//   RateLimit-Remaining: 3      ← requests left in this window
//   RateLimit-Reset: 900        ← seconds until the window resets
//
// NOTE: In-memory storage means limits reset if the server restarts,
// and they don't work across multiple server instances.
// For production, you'd use a Redis store instead.

import rateLimit from 'express-rate-limit';

/**
 * authLimiter — Strict rate limiter for authentication endpoints.
 *
 * Applied to: POST /api/auth/login, POST /api/auth/register
 * Window: 15 minutes
 * Max: 5 requests per window
 *
 * This prevents:
 * - Brute-force password attacks (trying many passwords)
 * - Credential stuffing (testing stolen email/password combos)
 * - Account creation spam
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes in milliseconds
  max: 5,                     // 5 attempts per window
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many attempts. Please try again after 15 minutes.',
    },
  },
  standardHeaders: true,      // Send RateLimit-* headers in the response
  legacyHeaders: false,       // Don't send X-RateLimit-* headers (deprecated)
});

/**
 * apiLimiter — General rate limiter for all API routes.
 *
 * Applied to: All /api/* routes
 * Window: 1 minute
 * Max: 100 requests per window
 *
 * This prevents:
 * - DDoS attacks (flooding the server)
 * - Web scraping / data harvesting
 * - Runaway client-side loops accidentally hammering the API
 */
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,   // 1 minute in milliseconds
  max: 100,                   // 100 requests per minute
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests. Please slow down.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
