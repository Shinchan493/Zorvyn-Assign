// ─── Records Controller ───────────────────────────────
//
// WHAT THIS FILE DOES:
// Thin HTTP handlers for financial record endpoints.
// Same pattern as auth and users controllers:
//   1. Extract data from request (params, query, body, user)
//   2. Call the corresponding service function
//   3. Send a standardized response using ApiResponse
//
// ACCESS CONTROL (enforced in routes):
// - Create/Update/Delete: ADMIN only
// - List/Get: All authenticated users (VIEWER, ANALYST, ADMIN)

import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/apiResponse';
import * as recordsService from './records.service';

// ═══════════════════════════════════════════════════════
// POST /api/records
// ═══════════════════════════════════════════════════════
// Creates a new financial record.
//
// Request body (already validated by Zod):
//   { amount: number, type: 'INCOME'|'EXPENSE', category: string, date: string, description?: string }
//
// The record is linked to the current user (req.user.id from JWT).
//
// Response (201 Created):
//   { success: true, data: { id, amount, type, ... } }

export async function createRecordHandler(req: Request, res: Response): Promise<void> {
  const record = await recordsService.createRecord(req.body, req.user!.id);
  ApiResponse.created(res, record);
}

// ═══════════════════════════════════════════════════════
// GET /api/records
// ═══════════════════════════════════════════════════════
// Lists financial records with pagination and optional filters.
//
// Query params (already validated by Zod):
//   ?page=1&limit=20&type=INCOME&category=Salary&startDate=2025-01-01&endDate=2025-12-31
//
// Response (200 OK):
//   { success: true, data: [...records], meta: { page, limit, total, totalPages } }

export async function listRecordsHandler(req: Request, res: Response): Promise<void> {
  const result = await recordsService.listRecords(req.query as any);
  ApiResponse.success(res, result.records, result.meta);
}

// ═══════════════════════════════════════════════════════
// GET /api/records/:id
// ═══════════════════════════════════════════════════════
// Gets a single financial record by ID.
//
// Response (200 OK):
//   { success: true, data: { id, amount, type, category, ... } }

export async function getRecordHandler(req: Request, res: Response): Promise<void> {
  const record = await recordsService.getRecordById(req.params.id as string);
  ApiResponse.success(res, record);
}

// ═══════════════════════════════════════════════════════
// PATCH /api/records/:id
// ═══════════════════════════════════════════════════════
// Updates a financial record (partial update).
//
// Request body (already validated by Zod):
//   { amount?, type?, category?, date?, description? }
//
// Response (200 OK):
//   { success: true, data: { ...updatedRecord } }

export async function updateRecordHandler(req: Request, res: Response): Promise<void> {
  const record = await recordsService.updateRecord(req.params.id as string, req.body);
  ApiResponse.success(res, record);
}

// ═══════════════════════════════════════════════════════
// DELETE /api/records/:id
// ═══════════════════════════════════════════════════════
// Soft deletes a financial record (sets isDeleted = true).
//
// Response (204 No Content):
//   (empty body — HTTP 204 means "success but nothing to return")

export async function deleteRecordHandler(req: Request, res: Response): Promise<void> {
  await recordsService.deleteRecord(req.params.id as string);
  ApiResponse.noContent(res);
}
