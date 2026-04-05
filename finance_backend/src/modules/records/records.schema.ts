// ─── Records Zod Schemas ──────────────────────────────
//
// WHAT THIS FILE DOES:
// Defines validation schemas for all financial record endpoints.
// These schemas handle more complex validation than auth/users because
// records have date ranges, enum filters, and numeric constraints.
//
// ACCESS CONTEXT:
// - Create/Update/Delete: ADMIN only
// - List/Get: All authenticated users (VIEWER, ANALYST, ADMIN)
//
// SCHEMA DESIGN NOTES:
// - Amounts must be positive (the RecordType determines income vs expense)
// - Dates are ISO 8601 strings validated and coerced to Date objects
// - Category is a free-text field (not an enum — allows flexibility)
// - Filters in list query are all optional (no filter = all records)

import { z } from 'zod/v4';

// ─── Shared: UUID param ──────────────────────────────
const idParam = z.object({
  id: z.string().uuid('Invalid record ID format'),
});

// ─── Create Record Schema ────────────────────────────
// POST /api/records
//
// Required fields: amount, type, category, date
// Optional: description
//
// Amount must be positive — the type field (INCOME/EXPENSE) determines
// whether it's money in or money out. This simplifies aggregation:
//   total income  = SUM(amount) WHERE type = INCOME
//   total expense = SUM(amount) WHERE type = EXPENSE
//   net balance   = income - expense

export const createRecordSchema = z.object({
  body: z.object({
    amount: z
      .number()
      .positive('Amount must be greater than 0'),

    type: z.enum(['INCOME', 'EXPENSE'], {
      error: 'Type must be either INCOME or EXPENSE',
    }),

    category: z
      .string()
      .trim()
      .min(1, 'Category is required')
      .max(100, 'Category must not exceed 100 characters'),

    date: z
      .iso.date('Date must be a valid ISO 8601 date (YYYY-MM-DD)'),

    description: z
      .string()
      .trim()
      .max(500, 'Description must not exceed 500 characters')
      .optional(),
  }),
});

// ─── Update Record Schema ────────────────────────────
// PATCH /api/records/:id
//
// All body fields are optional (PATCH = partial update).
// At least one field must be provided (same refine pattern as users).

export const updateRecordSchema = z.object({
  params: idParam,
  body: z.object({
    amount: z
      .number()
      .positive('Amount must be greater than 0')
      .optional(),

    type: z.enum(['INCOME', 'EXPENSE'], {
      error: 'Type must be either INCOME or EXPENSE',
    }).optional(),

    category: z
      .string()
      .trim()
      .min(1, 'Category is required')
      .max(100, 'Category must not exceed 100 characters')
      .optional(),

    date: z
      .iso.date('Date must be a valid ISO 8601 date (YYYY-MM-DD)')
      .optional(),

    description: z
      .string()
      .trim()
      .max(500, 'Description must not exceed 500 characters')
      .optional(),
  }).refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    { message: 'At least one field must be provided for update' }
  ),
});

// ─── Get Record Schema ──────────────────────────────
// GET /api/records/:id

export const getRecordSchema = z.object({
  params: idParam,
});

// ─── Delete Record Schema ───────────────────────────
// DELETE /api/records/:id
// (Soft delete — sets isDeleted = true)

export const deleteRecordSchema = z.object({
  params: idParam,
});

// ─── List Records Schema ────────────────────────────
// GET /api/records?page=1&limit=20&type=INCOME&category=Salary&startDate=2025-01-01&endDate=2025-12-31
//
// All query params are optional. Supports:
// - Pagination (page, limit)
// - Type filter (INCOME or EXPENSE)
// - Category filter (exact match)
// - Date range filter (startDate, endDate — inclusive)
//
// Date range enables queries like:
//   "Show me all expenses from January 2025"
//   → ?type=EXPENSE&startDate=2025-01-01&endDate=2025-01-31

export const listRecordsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    type: z.enum(['INCOME', 'EXPENSE']).optional(),
    category: z.string().trim().optional(),
    startDate: z
      .iso.date('startDate must be a valid ISO 8601 date (YYYY-MM-DD)')
      .optional(),
    endDate: z
      .iso.date('endDate must be a valid ISO 8601 date (YYYY-MM-DD)')
      .optional(),
  }),
});

// ─── Type Exports ────────────────────────────────────

export type CreateRecordInput = z.infer<typeof createRecordSchema>['body'];
export type UpdateRecordInput = z.infer<typeof updateRecordSchema>['body'];
export type ListRecordsQuery = z.infer<typeof listRecordsSchema>['query'];
