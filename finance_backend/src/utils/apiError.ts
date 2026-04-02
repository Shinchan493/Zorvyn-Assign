// ─── Custom API Error Class ───────────────────────────
//
// WHY a custom error class?
// JavaScript's built-in Error only has `message`. For an API, we also need:
//   - statusCode (400, 401, 403, 404, 409, 500)
//   - code (machine-readable like "VALIDATION_ERROR", "NOT_FOUND")
//   - details (optional: extra context like which field failed validation)
//
// PATTERN: "Static factory methods"
// Instead of remembering status codes, we use descriptive methods:
//   throw ApiError.notFound("User not found")     ← clean!
//   throw new ApiError(404, "NOT_FOUND", "...")    ← harder to read
//
// The global error handler middleware (errorHandler.ts) catches these
// and formats them into the standardized JSON response.

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;

  constructor(statusCode: number, code: string, message: string, details?: any) {
    // Call the parent Error constructor with the message
    super(message);

    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    // Fix the prototype chain (required for instanceof to work with extended Error)
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  // ─── Static Factory Methods ───────────────────────
  // Each one creates an ApiError with the correct HTTP status code.

  /** 400 — Client sent something invalid (bad data, self-delete attempt, etc.) */
  static badRequest(message: string, details?: any): ApiError {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }

  /** 401 — Not authenticated (no token, expired token, wrong password) */
  static unauthorized(message: string): ApiError {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }

  /** 403 — Authenticated but not allowed (wrong role, inactive account) */
  static forbidden(message: string): ApiError {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  /** 404 — Resource doesn't exist (or is soft-deleted) */
  static notFound(message: string): ApiError {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  /** 409 — Conflict (duplicate email, FK constraint violation) */
  static conflict(message: string): ApiError {
    return new ApiError(409, 'CONFLICT', message);
  }

  /** 500 — Something unexpected broke on the server */
  static internal(message: string): ApiError {
    return new ApiError(500, 'INTERNAL_ERROR', message);
  }
}
