// ─── Records Service ──────────────────────────────────
//
// WHAT THIS FILE DOES:
// Contains ALL business logic for financial record management:
//   1. createRecord()  — create a new financial record (Admin only)
//   2. listRecords()   — paginated list with filters (all authenticated users)
//   3. getRecordById() — fetch a single record (all authenticated users)
//   4. updateRecord()  — update a record (Admin only)
//   5. deleteRecord()  — soft delete a record (Admin only)
//
// SOFT DELETE PATTERN:
// Records are never physically deleted from the database.
// Instead, `isDeleted` is set to `true`. All queries filter out deleted records
// by default (WHERE isDeleted = false). This preserves audit trail and
// data integrity for dashboard analytics.
//
// WHY SOFT DELETE?
// - Financial data should never be permanently lost
// - Dashboard historical reports remain accurate
// - Accidentally deleted records can be recovered (by an Admin via DB)
// - Regulatory compliance often requires data retention

import { PrismaClient } from '@prisma/client';
import { ApiError } from '../../utils/apiError';
import { parsePagination, buildMeta } from '../../utils/pagination';
import type { CreateRecordInput, UpdateRecordInput, ListRecordsQuery } from './records.schema';

const prisma = new PrismaClient();

// ─── Reusable select object ──────────────────────────
// Defines which FinancialRecord fields to include in API responses.
// Includes a nested select on createdBy to show who created the record
// (name + email only — not the full user object with passwordHash).
const recordSelect = {
  id: true,
  amount: true,
  type: true,
  category: true,
  date: true,
  description: true,
  createdById: true,
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ═══════════════════════════════════════════════════════
// CREATE RECORD
// ═══════════════════════════════════════════════════════
//
// POST /api/records
//
// Creates a new financial record linked to the current user.
// The `createdById` is set from the JWT (not the request body)
// to prevent an Admin from creating records "as" another user.

export async function createRecord(data: CreateRecordInput, userId: string) {
  const record = await prisma.financialRecord.create({
    data: {
      amount: data.amount,
      type: data.type,
      category: data.category,
      date: new Date(data.date),
      description: data.description,
      createdById: userId,
    },
    select: recordSelect,
  });

  return record;
}

// ═══════════════════════════════════════════════════════
// LIST RECORDS
// ═══════════════════════════════════════════════════════
//
// GET /api/records?page=1&limit=20&type=INCOME&category=Salary&startDate=...&endDate=...
//
// Returns a paginated list of ACTIVE (non-deleted) records.
// Supports multiple optional filters that build up a Prisma WHERE clause.
//
// DATE RANGE:
// - startDate: records on or after this date
// - endDate: records on or before this date (end of day)
// Both are inclusive. They can be used independently or together.

export async function listRecords(query: ListRecordsQuery) {
  const { skip, take, page, limit } = parsePagination(query);

  // Build dynamic WHERE clause
  const where: any = {
    isDeleted: false,  // Always exclude soft-deleted records
  };

  if (query.type) where.type = query.type;
  if (query.category) where.category = query.category;

  // Date range filter
  if (query.startDate || query.endDate) {
    where.date = {};
    if (query.startDate) {
      where.date.gte = new Date(query.startDate);  // Greater than or equal
    }
    if (query.endDate) {
      // Add 1 day to make endDate inclusive (end of day)
      const end = new Date(query.endDate);
      end.setDate(end.getDate() + 1);
      where.date.lt = end;  // Less than (next day = end of endDate)
    }
  }

  const [records, total] = await Promise.all([
    prisma.financialRecord.findMany({
      where,
      select: recordSelect,
      skip,
      take,
      orderBy: { date: 'desc' },  // Most recent transactions first
    }),
    prisma.financialRecord.count({ where }),
  ]);

  return {
    records,
    meta: buildMeta(page, limit, total),
  };
}

// ═══════════════════════════════════════════════════════
// GET RECORD BY ID
// ═══════════════════════════════════════════════════════
//
// GET /api/records/:id
//
// Returns a single record. Only returns ACTIVE records —
// soft-deleted records return 404.

export async function getRecordById(id: string) {
  const record = await prisma.financialRecord.findUnique({
    where: { id },
    select: recordSelect,
  });

  if (!record || record.isDeleted) {
    throw ApiError.notFound('Financial record not found.');
  }

  return record;
}

// ═══════════════════════════════════════════════════════
// UPDATE RECORD
// ═══════════════════════════════════════════════════════
//
// PATCH /api/records/:id
//
// Updates one or more fields of a financial record.
// Cannot update soft-deleted records (they appear as "not found").

export async function updateRecord(id: string, data: UpdateRecordInput) {
  // Verify record exists and is not deleted
  const existing = await prisma.financialRecord.findUnique({ where: { id } });
  if (!existing || existing.isDeleted) {
    throw ApiError.notFound('Financial record not found.');
  }

  // Build update data — only include fields that were provided
  const updateData: any = {};
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.date !== undefined) updateData.date = new Date(data.date);
  if (data.description !== undefined) updateData.description = data.description;

  const record = await prisma.financialRecord.update({
    where: { id },
    data: updateData,
    select: recordSelect,
  });

  return record;
}

// ═══════════════════════════════════════════════════════
// DELETE RECORD (Soft Delete)
// ═══════════════════════════════════════════════════════
//
// DELETE /api/records/:id
//
// Does NOT physically delete the record.
// Sets `isDeleted = true` so it's excluded from all queries.
//
// WHY soft delete?
// 1. Financial data should never be permanently lost
// 2. Dashboard historical reports stay accurate
// 3. Accidental deletes can be recovered
// 4. Regulatory compliance (data retention requirements)

export async function deleteRecord(id: string) {
  // Verify record exists and is not already deleted
  const existing = await prisma.financialRecord.findUnique({ where: { id } });
  if (!existing || existing.isDeleted) {
    throw ApiError.notFound('Financial record not found.');
  }

  // Soft delete: set isDeleted flag instead of removing the row
  await prisma.financialRecord.update({
    where: { id },
    data: { isDeleted: true },
  });
}
