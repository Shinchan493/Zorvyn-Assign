// ─── Global Error Handler Middleware ──────────────────
//
// This is the LAST middleware in the Express pipeline.
// It catches EVERY error thrown or passed via next(error) in the app.
//
// TWO TYPES OF ERRORS:
// 1. ApiError (ours): has statusCode, code, message, details → use them directly
// 2. Unknown Error:   something unexpected broke → wrap as 500 Internal Error
//
// WHY a global handler?
// Without this, Express's default error handler sends HTML (ugly for an API).
// This ensures EVERY error returns our standardized JSON format:
//   { success: false, error: { code, message, details? } }
//
// IMPORTANT: Express identifies error-handling middleware by having
// EXACTLY 4 parameters: (err, req, res, next). Remove any and it breaks.

import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';
import { config } from '../config';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // ─── Case 1: It's our custom ApiError ──────────
  // We know exactly what went wrong — use the error's own fields
  if (err instanceof ApiError) {
    const response: any = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    };

    // Include validation details if present (e.g., which fields failed)
    if (err.details) {
      response.error.details = err.details;
    }

    // In development, include the stack trace for debugging
    if (config.isDev) {
      response.error.stack = err.stack;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // ─── Case 2: Unexpected error (bug, DB crash, etc.) ────
  // Log the full error for debugging, but don't expose internals to client
  console.error('Unexpected Error:', err);

  const response: any = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  };

  // Only show the real error message & stack in development
  if (config.isDev) {
    response.error.message = err.message;
    response.error.stack = err.stack;
  }

  res.status(500).json(response);
}
