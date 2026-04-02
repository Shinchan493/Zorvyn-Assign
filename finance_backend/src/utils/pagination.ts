// ─── Pagination Utility ───────────────────────────────
//
// HOW PAGINATION WORKS:
// Without pagination, GET /records would return ALL records at once.
// With 10,000 records, that's slow and wasteful.
//
// Instead, we return pages:
//   GET /records?page=1&limit=20  → records 1-20
//   GET /records?page=2&limit=20  → records 21-40
//
// PRISMA USES:
//   skip = how many records to skip (offset)
//   take = how many records to return (limit)
//
// CALCULATION:
//   page=2, limit=20 → skip = (2-1) * 20 = 20, take = 20

import { PaginationMeta } from './apiResponse';

/**
 * Parse page & limit from query string into Prisma-compatible skip/take.
 * 
 * @param query - The Express req.query object (or pre-validated Zod output)
 * @returns { skip, take, page, limit } ready for Prisma
 * 
 * Defaults: page=1, limit=20
 * Caps: limit max 100 (prevents client from requesting 1 million rows)
 */
export function parsePagination(query: { page?: number; limit?: number }): {
  skip: number;
  take: number;
  page: number;
  limit: number;
} {
  // Use provided values or defaults
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));

  return {
    skip: (page - 1) * limit,  // How many rows to skip
    take: limit,                // How many rows to return
    page,
    limit,
  };
}

/**
 * Build the pagination meta object for the API response.
 * 
 * @param page  - Current page number
 * @param limit - Items per page  
 * @param total - Total matching rows in the database
 * @returns PaginationMeta with totalPages calculated
 * 
 * Example: buildMeta(2, 20, 85) → { page: 2, limit: 20, total: 85, totalPages: 5 }
 * (85 / 20 = 4.25, ceil = 5 pages)
 */
export function buildMeta(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,  // At least 1 page even if 0 results
  };
}
