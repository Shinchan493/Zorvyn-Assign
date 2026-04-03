// ─── Role-Based Access Control (RBAC) Middleware ──────
//
// WHAT IT DOES:
// Checks if the authenticated user's role is in the list of allowed roles.
// If not, it throws a 403 Forbidden error.
//
// HOW IT WORKS:
// `authorize()` is a HIGHER-ORDER FUNCTION — a function that returns a function.
//
//   authorize('ADMIN')             → only Admins can access
//   authorize('ANALYST', 'ADMIN')  → Analysts and Admins can access
//   authorize('VIEWER', 'ANALYST', 'ADMIN') → everyone can access
//
// WHY a higher-order function?
// Express middleware has a fixed signature: (req, res, next).
// We can't pass extra arguments directly. So we wrap it:
//
//   router.get('/records', authenticate, authorize('ADMIN'), controller);
//                                        ^^^^^^^^^^^^^^^^
//                                        authorize('ADMIN') is CALLED here,
//                                        and it RETURNS the actual middleware function
//
// IMPORTANT:
// This middleware MUST come AFTER `authenticate` in the middleware chain.
// It depends on `req.user` being set by the auth middleware.

import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';

// Use the same role type as our Prisma schema
type Role = 'VIEWER' | 'ANALYST' | 'ADMIN';

/**
 * authorize — Creates middleware that restricts access to specific roles.
 *
 * @param allowedRoles - One or more roles that are permitted
 * @returns Express middleware function
 *
 * Usage:
 *   router.get('/records',    authenticate, authorize('VIEWER', 'ANALYST', 'ADMIN'), getRecords);
 *   router.post('/records',   authenticate, authorize('ADMIN'), createRecord);
 *   router.get('/dashboard',  authenticate, authorize('ANALYST', 'ADMIN'), getDashboard);
 */
export function authorize(...allowedRoles: Role[]) {
  // This is the actual middleware function that Express will call
  return (req: Request, _res: Response, next: NextFunction): void => {
    // ─── Safety check: is the user authenticated? ────
    // This should never happen if authenticate runs first,
    // but we check defensively to avoid cryptic errors.
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required.');
    }

    // ─── Check if user's role is in the allowed list ────
    if (!allowedRoles.includes(req.user.role as Role)) {
      throw ApiError.forbidden(
        `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}.`
      );
    }

    // User has the right role — proceed to the next middleware/controller
    next();
  };
}
