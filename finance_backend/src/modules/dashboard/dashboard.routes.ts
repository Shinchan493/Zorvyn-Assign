// ─── Dashboard Routes ─────────────────────────────────
//
// WHAT THIS FILE DOES:
// Wires together the dashboard analytics endpoints.
// This is the routing table for /api/dashboard/*.
//
// ACCESS CONTROL:
// All routes require authentication AND either ANALYST or ADMIN role.
// VIEWERs cannot access dashboard analytics — they can only view
// individual records via the records module.
//
// Applied at router level (same pattern as users module):
//   router.use(authenticate, authorize('ANALYST', 'ADMIN'))
//
// ROUTE TABLE:
// ┌────────┬────────────────────────────┬──────────────────────────────────────┐
// │ Method │ Path                       │ Description                          │
// ├────────┼────────────────────────────┼──────────────────────────────────────┤
// │ GET    │ /api/dashboard/summary     │ Income, expense, net balance, count  │
// │ GET    │ /api/dashboard/categories  │ Amounts grouped by category          │
// │ GET    │ /api/dashboard/trends      │ Income/expense by month              │
// │ GET    │ /api/dashboard/recent      │ Latest N transactions                │
// └────────┴────────────────────────────┴──────────────────────────────────────┘

import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import {
  summarySchema,
  categoryBreakdownSchema,
  monthlyTrendsSchema,
  recentTransactionsSchema,
} from './dashboard.schema';
import {
  summaryHandler,
  categoryBreakdownHandler,
  monthlyTrendsHandler,
  recentTransactionsHandler,
} from './dashboard.controller';

const router = Router();

// ─── Apply auth + RBAC to ALL dashboard routes ──────
// Only ANALYSTs and ADMINs can access analytics.
// VIEWERs are intentionally excluded — they only have read access to records.
router.use(authenticate, authorize('ANALYST', 'ADMIN'));

// ─── GET /api/dashboard/summary ──────────────────────
// High-level financial metrics: total income, expense, net balance, count
router.get('/summary', validate(summarySchema), summaryHandler);

// ─── GET /api/dashboard/categories ───────────────────
// Amounts grouped by category (optionally filtered by type)
router.get('/categories', validate(categoryBreakdownSchema), categoryBreakdownHandler);

// ─── GET /api/dashboard/trends ───────────────────────
// Monthly income/expense trends (for charts)
router.get('/trends', validate(monthlyTrendsSchema), monthlyTrendsHandler);

// ─── GET /api/dashboard/recent ───────────────────────
// Latest N transactions (recent activity widget)
router.get('/recent', validate(recentTransactionsSchema), recentTransactionsHandler);

export default router;
