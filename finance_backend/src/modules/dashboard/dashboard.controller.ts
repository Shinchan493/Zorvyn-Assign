// ─── Dashboard Controller ─────────────────────────────
//
// WHAT THIS FILE DOES:
// Thin HTTP handlers for dashboard analytics endpoints.
// Same pattern as all other controllers:
//   1. Extract query params from request
//   2. Call the corresponding service function
//   3. Send a standardized response using ApiResponse
//
// ACCESS: ANALYST + ADMIN only (enforced in routes).
// All endpoints are GET-only — dashboards are read-only views.

import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/apiResponse';
import * as dashboardService from './dashboard.service';

// ═══════════════════════════════════════════════════════
// GET /api/dashboard/summary
// ═══════════════════════════════════════════════════════
// Returns high-level financial metrics.
//
// Optional query params: ?startDate=2025-01-01&endDate=2025-12-31
//
// Response (200 OK):
//   {
//     success: true,
//     data: {
//       totalIncome: 120000,
//       totalExpense: 85000,
//       netBalance: 35000,
//       recordCount: 150
//     }
//   }

export async function summaryHandler(req: Request, res: Response): Promise<void> {
  const summary = await dashboardService.getSummary(req.query as any);
  ApiResponse.success(res, summary);
}

// ═══════════════════════════════════════════════════════
// GET /api/dashboard/categories
// ═══════════════════════════════════════════════════════
// Returns amounts grouped by category.
//
// Optional query params: ?startDate=...&endDate=...&type=INCOME
//
// Response (200 OK):
//   {
//     success: true,
//     data: [
//       { category: "Salary", type: "INCOME", totalAmount: 50000, count: 5 },
//       { category: "Rent", type: "EXPENSE", totalAmount: 24000, count: 12 }
//     ]
//   }

export async function categoryBreakdownHandler(req: Request, res: Response): Promise<void> {
  const breakdown = await dashboardService.getCategoryBreakdown(req.query as any);
  ApiResponse.success(res, breakdown);
}

// ═══════════════════════════════════════════════════════
// GET /api/dashboard/trends
// ═══════════════════════════════════════════════════════
// Returns income/expense totals by month.
//
// Optional query params: ?startDate=...&endDate=...
//
// Response (200 OK):
//   {
//     success: true,
//     data: [
//       { month: "2025-01", income: 15000, expense: 8000, net: 7000 },
//       { month: "2025-02", income: 12000, expense: 9500, net: 2500 }
//     ]
//   }

export async function monthlyTrendsHandler(req: Request, res: Response): Promise<void> {
  const trends = await dashboardService.getMonthlyTrends(req.query as any);
  ApiResponse.success(res, trends);
}

// ═══════════════════════════════════════════════════════
// GET /api/dashboard/recent
// ═══════════════════════════════════════════════════════
// Returns the N most recent transactions.
//
// Optional query params: ?limit=10
//
// Response (200 OK):
//   {
//     success: true,
//     data: [
//       { id: "...", amount: 5000, type: "INCOME", category: "Salary", ... },
//       ...
//     ]
//   }

export async function recentTransactionsHandler(req: Request, res: Response): Promise<void> {
  const transactions = await dashboardService.getRecentTransactions(req.query as any);
  ApiResponse.success(res, transactions);
}
