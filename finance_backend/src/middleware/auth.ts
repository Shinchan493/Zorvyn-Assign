// ─── Authentication Middleware ────────────────────────
//
// WHAT IT DOES:
// 1. Extracts the JWT from: Authorization: Bearer <token>
// 2. Verifies the token's signature (is it genuine? has it expired?)
// 3. Decodes the payload (userId, email, name, role)
// 4. Attaches the decoded user to req.user for downstream middleware/controllers
//
// REQUEST FLOW:
//   Client sends: Authorization: Bearer eyJhbGciOiJI...
//   → This middleware extracts "eyJhbGciOiJI..."
//   → jwt.verify() checks signature + expiration
//   → If valid: req.user = { id, email, name, role } → next()
//   → If invalid: throw ApiError.unauthorized()
//
// WHY not check the database here?
// The JWT already contains the user's role. Checking the DB on every request
// would add latency. The tradeoff: if a user's role changes, they need a
// new token (re-login). For this app's scope, that's acceptable.

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { ApiError } from '../utils/apiError';

/**
 * Shape of the JWT payload we encode during login.
 * This MUST match what auth.service.ts puts into the token.
 */
interface JwtPayload {
  userId: string;
  email: string;
  name: string;
  role: 'VIEWER' | 'ANALYST' | 'ADMIN';
}

/**
 * authenticate — Express middleware that verifies JWT tokens.
 *
 * Usage in routes:
 *   router.get('/protected', authenticate, controller);
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  // ─── Step 1: Extract the token from the header ────
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token provided at all, or wrong format
    throw ApiError.unauthorized('Authentication required. Please provide a valid token.');
  }

  // "Bearer eyJhbGci..." → "eyJhbGci..."
  const token = authHeader.split(' ')[1];

  if (!token) {
    throw ApiError.unauthorized('Authentication required. Please provide a valid token.');
  }

  // ─── Step 2: Verify and decode the token ──────────
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    // ─── Step 3: Attach user info to the request ────
    // This makes req.user available to all subsequent middleware and controllers.
    // The type is defined in types/express.d.ts
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
    };

    next();
  } catch (error) {
    // jwt.verify() throws different errors:
    // - TokenExpiredError: token was valid but has expired
    // - JsonWebTokenError: token is malformed or signature is invalid
    // - NotBeforeError: token used before its "nbf" claim
    if (error instanceof jwt.TokenExpiredError) {
      throw ApiError.unauthorized('Token has expired. Please log in again.');
    }

    if (error instanceof jwt.JsonWebTokenError) {
      throw ApiError.unauthorized('Invalid token. Please log in again.');
    }

    // Unexpected error during verification
    throw ApiError.unauthorized('Authentication failed.');
  }
}
