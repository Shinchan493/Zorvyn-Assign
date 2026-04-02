// ─── API Response Helper ──────────────────────────────
//
// WHY a response helper?
// Every API response should have a consistent shape:
//   { success: true, data: {...} }                      ← success
//   { success: true, data: [...], meta: {page, ...} }   ← success with pagination
//   { success: false, error: { code, message } }        ← error (handled by errorHandler)
//
// This helper ensures we NEVER accidentally return a different format.
// It also prevents forgetting to set the status code.

import { Response } from 'express';

/**
 * Pagination metadata included in list responses.
 * Tells the client how many pages there are and where they are.
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class ApiResponse {
  /**
   * Standard success response (200 OK by default)
   * 
   * @param res    - Express response object
   * @param data   - The response payload (object, array, etc.)
   * @param meta   - Optional pagination metadata
   * @param statusCode - HTTP status (defaults to 200)
   * 
   * Example output:
   * { "success": true, "data": { "id": "...", "email": "..." } }
   */
  static success(res: Response, data: any, meta?: PaginationMeta, statusCode: number = 200): Response {
    const response: any = { success: true, data };

    // Only include meta if provided (for paginated responses)
    if (meta) {
      response.meta = meta;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * 201 Created — for successful POST requests that create a resource
   * 
   * Example output:
   * { "success": true, "data": { "id": "new-uuid", ... } }
   */
  static created(res: Response, data: any): Response {
    return res.status(201).json({ success: true, data });
  }

  /**
   * 204 No Content — for successful DELETE requests
   * No body is sent (HTTP 204 means "success, but nothing to return")
   */
  static noContent(res: Response): Response {
    return res.status(204).send();
  }
}
