// ─── Dashboard Zod Schemas ────────────────────────────
//
// WHAT THIS FILE DOES:
// Defines validation schemas for dashboard analytics endpoints.
// Dashboard routes are GET-only, so schemas only validate query params.
//
// All dashboard queries support optional date-range filtering.
// This lets users ask questions like:
//   "What was my total income in Q1 2025?"
//   → GET /api/dashboard/summary?startDate=2025-01-01&endDate=2025-03-31

import { z } from 'zod/v4';

// ─── Shared: Date range query params ─────────────────
// Reused by all dashboard endpoints.
// Both dates are optional — if omitted, queries cover ALL time.
const dateRangeQuery = z.object({
  startDate: z
    .iso.date('startDate must be a valid ISO 8601 date (YYYY-MM-DD)')
    .optional(),
  endDate: z
    .iso.date('endDate must be a valid ISO 8601 date (YYYY-MM-DD)')
    .optional(),
});

// ─── Summary Schema ──────────────────────────────────
// GET /api/dashboard/summary?startDate=...&endDate=...
export const summarySchema = z.object({
  query: dateRangeQuery,
});

// ─── Category Breakdown Schema ───────────────────────
// GET /api/dashboard/categories?startDate=...&endDate=...&type=INCOME
export const categoryBreakdownSchema = z.object({
  query: dateRangeQuery.extend({
    type: z.enum(['INCOME', 'EXPENSE']).optional(),
  }),
});

// ─── Monthly Trends Schema ───────────────────────────
// GET /api/dashboard/trends?startDate=...&endDate=...
export const monthlyTrendsSchema = z.object({
  query: dateRangeQuery,
});

// ─── Recent Transactions Schema ──────────────────────
// GET /api/dashboard/recent?limit=10
export const recentTransactionsSchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().positive().max(50).optional(),
  }),
});

// ─── Type Exports ────────────────────────────────────
export type DateRangeQuery = z.infer<typeof summarySchema>['query'];
export type CategoryBreakdownQuery = z.infer<typeof categoryBreakdownSchema>['query'];
export type RecentTransactionsQuery = z.infer<typeof recentTransactionsSchema>['query'];
