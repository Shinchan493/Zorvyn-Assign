// ─── Dashboard Service ────────────────────────────────
//
// WHAT THIS FILE DOES:
// Contains ALL business logic for dashboard analytics:
//   1. getSummary()           — total income, expense, net balance, record count
//   2. getCategoryBreakdown() — amounts grouped by category
//   3. getMonthlyTrends()     — income/expense totals by month
//   4. getRecentTransactions() — latest N transactions
//
// AGGREGATION APPROACH:
// Prisma doesn't support all SQL aggregation features natively
// (e.g., GROUP BY with raw date functions). For complex aggregations,
// we use Prisma's groupBy where possible and manual JavaScript
// aggregation where needed (monthly trends).
//
// PERFORMANCE NOTES:
// - All queries filter by isDeleted = false (soft delete)
// - Date range filters reduce the dataset before aggregation
// - Monthly trends fetches only the needed date range, then groups in JS
//
// ACCESS: ANALYST + ADMIN only (enforced in routes)

import { PrismaClient } from '@prisma/client';
import type { DateRangeQuery, CategoryBreakdownQuery, RecentTransactionsQuery } from './dashboard.schema';

const prisma = new PrismaClient();

// ─── Helper: Build date range WHERE clause ───────────
// Reused by all dashboard queries to filter by optional date range.
// Same inclusive endDate pattern as records.service.ts.
function buildDateFilter(query: { startDate?: string; endDate?: string }): any {
  const filter: any = {};

  if (query.startDate || query.endDate) {
    filter.date = {};
    if (query.startDate) {
      filter.date.gte = new Date(query.startDate);
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setDate(end.getDate() + 1);
      filter.date.lt = end;
    }
  }

  return filter;
}

// ═══════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════
//
// GET /api/dashboard/summary
//
// Returns high-level financial metrics:
//   - totalIncome: sum of all INCOME records
//   - totalExpense: sum of all EXPENSE records
//   - netBalance: totalIncome - totalExpense
//   - recordCount: total number of active records
//
// HOW IT WORKS:
// Two Prisma aggregate queries run in parallel:
//   1. SUM(amount) WHERE type = INCOME
//   2. SUM(amount) WHERE type = EXPENSE
// Plus a count query for total records.
//
// WHY THREE QUERIES INSTEAD OF ONE?
// Prisma's aggregate doesn't support GROUP BY + SUM in a single call.
// Promise.all runs them concurrently, so wall-clock time ≈ slowest query.

export async function getSummary(query: DateRangeQuery) {
  const dateFilter = buildDateFilter(query);

  const baseWhere = {
    isDeleted: false,
    ...dateFilter,
  };

  const [incomeResult, expenseResult, recordCount] = await Promise.all([
    // Total income
    prisma.financialRecord.aggregate({
      where: { ...baseWhere, type: 'INCOME' },
      _sum: { amount: true },
    }),
    // Total expense
    prisma.financialRecord.aggregate({
      where: { ...baseWhere, type: 'EXPENSE' },
      _sum: { amount: true },
    }),
    // Total record count
    prisma.financialRecord.count({ where: baseWhere }),
  ]);

  const totalIncome = incomeResult._sum.amount || 0;
  const totalExpense = expenseResult._sum.amount || 0;

  return {
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
    recordCount,
  };
}

// ═══════════════════════════════════════════════════════
// CATEGORY BREAKDOWN
// ═══════════════════════════════════════════════════════
//
// GET /api/dashboard/categories?type=INCOME
//
// Returns amount totals grouped by category.
// Optionally filtered by record type (INCOME or EXPENSE).
//
// Example response:
//   [
//     { category: "Salary", type: "INCOME", totalAmount: 50000, count: 5 },
//     { category: "Freelance", type: "INCOME", totalAmount: 12000, count: 3 },
//   ]
//
// USES: Prisma's groupBy — one of the more advanced Prisma features.
// groupBy returns rows similar to SQL's GROUP BY clause.

export async function getCategoryBreakdown(query: CategoryBreakdownQuery) {
  const dateFilter = buildDateFilter(query);

  const where: any = {
    isDeleted: false,
    ...dateFilter,
  };

  if (query.type) {
    where.type = query.type;
  }

  const breakdown = await prisma.financialRecord.groupBy({
    by: ['category', 'type'],
    where,
    _sum: { amount: true },
    _count: { id: true },
    orderBy: { _sum: { amount: 'desc' } },
  });

  // Transform Prisma's groupBy output into a cleaner format
  return breakdown.map((group) => ({
    category: group.category,
    type: group.type,
    totalAmount: group._sum.amount || 0,
    count: group._count.id,
  }));
}

// ═══════════════════════════════════════════════════════
// MONTHLY TRENDS
// ═══════════════════════════════════════════════════════
//
// GET /api/dashboard/trends
//
// Returns income and expense totals grouped by month.
// This powers line/bar charts on the frontend dashboard.
//
// Example response:
//   [
//     { month: "2025-01", income: 15000, expense: 8000, net: 7000 },
//     { month: "2025-02", income: 12000, expense: 9500, net: 2500 },
//   ]
//
// WHY NOT USE Prisma groupBy?
// Prisma's groupBy can't group by a derived value (year-month from a DateTime).
// So we fetch all matching records and group them in JavaScript.
//
// PERFORMANCE:
// For large datasets, this could be replaced with raw SQL using
// DATE_FORMAT or strftime. For this project's scope (demo data),
// the JS approach is clean and sufficient.

export async function getMonthlyTrends(query: DateRangeQuery) {
  const dateFilter = buildDateFilter(query);

  const records = await prisma.financialRecord.findMany({
    where: {
      isDeleted: false,
      ...dateFilter,
    },
    select: {
      amount: true,
      type: true,
      date: true,
    },
    orderBy: { date: 'asc' },
  });

  // Group records by year-month
  const monthMap = new Map<string, { income: number; expense: number }>();

  for (const record of records) {
    const date = new Date(record.date);
    // Format: "2025-01", "2025-02", etc.
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, { income: 0, expense: 0 });
    }

    const month = monthMap.get(monthKey)!;
    if (record.type === 'INCOME') {
      month.income += record.amount;
    } else {
      month.expense += record.amount;
    }
  }

  // Convert map to sorted array
  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      income: data.income,
      expense: data.expense,
      net: data.income - data.expense,
    }));
}

// ═══════════════════════════════════════════════════════
// RECENT TRANSACTIONS
// ═══════════════════════════════════════════════════════
//
// GET /api/dashboard/recent?limit=10
//
// Returns the N most recent financial transactions.
// Useful for a "Recent Activity" widget on the dashboard.
//
// Default limit: 10, max: 50 (enforced by Zod schema).

export async function getRecentTransactions(query: RecentTransactionsQuery) {
  const limit = query.limit || 10;

  const records = await prisma.financialRecord.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      amount: true,
      type: true,
      category: true,
      date: true,
      description: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      createdAt: true,
    },
    orderBy: { date: 'desc' },
    take: limit,
  });

  return records;
}
