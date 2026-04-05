// ─── Users Service ────────────────────────────────────
//
// WHAT THIS FILE DOES:
// Contains ALL business logic for user management (Admin-only operations):
//   1. listUsers()     — paginated list with optional role/status filters
//   2. getUserById()   — fetch a single user by ID
//   3. updateUser()    — update name/email
//   4. changeRole()    — change a user's role
//   5. changeStatus()  — activate/deactivate a user
//
// ACCESS CONTROL:
// All functions here are called from Admin-only routes.
// The RBAC middleware (authorize('ADMIN')) handles permission checks
// BEFORE the request reaches these functions.
//
// BUSINESS RULES:
// - Admins cannot change their own role (prevents locking themselves out)
// - Admins cannot deactivate their own account (same reason)
// - Email uniqueness is enforced (catch Prisma unique constraint errors)
// - Password hash is NEVER returned (excluded via userSelect)

import { PrismaClient } from '@prisma/client';
import { ApiError } from '../../utils/apiError';
import { parsePagination, buildMeta } from '../../utils/pagination';
import type {
  ListUsersQuery,
  UpdateUserInput,
  ChangeRoleInput,
  ChangeStatusInput,
} from './users.schema';

const prisma = new PrismaClient();

// ─── Reusable select object ──────────────────────────
// Same pattern as auth.service.ts — explicitly exclude passwordHash.
const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  passwordHash: false,
} as const;

// ═══════════════════════════════════════════════════════
// LIST USERS
// ═══════════════════════════════════════════════════════
//
// GET /api/users?page=1&limit=20&role=ADMIN&status=ACTIVE
//
// Returns a paginated list of users with optional filters.
// Uses the pagination utility to convert page/limit → skip/take.
//
// Prisma's `where` clause only includes filters that are provided.
// If no role filter → all roles are returned. Same for status.
//
// Two queries run in parallel (Promise.all):
//   1. Fetch the page of users
//   2. Count total matching users (for totalPages calculation)
//
// WHY parallel? Both queries hit the DB independently.
// Running them sequentially would double the response time.

export async function listUsers(query: ListUsersQuery) {
  const { skip, take, page, limit } = parsePagination(query);

  // Build dynamic WHERE clause based on provided filters
  const where: any = {};
  if (query.role) where.role = query.role;
  if (query.status) where.status = query.status;

  // Run both queries in parallel for performance
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: userSelect,
      skip,
      take,
      orderBy: { createdAt: 'desc' },  // Newest users first
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    meta: buildMeta(page, limit, total),
  };
}

// ═══════════════════════════════════════════════════════
// GET USER BY ID
// ═══════════════════════════════════════════════════════
//
// GET /api/users/:id
//
// Simple lookup by UUID. Returns 404 if not found.

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: userSelect,
  });

  if (!user) {
    throw ApiError.notFound('User not found.');
  }

  return user;
}

// ═══════════════════════════════════════════════════════
// UPDATE USER
// ═══════════════════════════════════════════════════════
//
// PATCH /api/users/:id
//
// Updates a user's name and/or email.
// Email uniqueness is enforced by catching Prisma's unique constraint error.
//
// WHY check if user exists first?
// Prisma's .update() throws a generic "Record not found" error.
// By checking first, we can throw our own 404 with a clear message.

export async function updateUser(id: string, data: UpdateUserInput) {
  // Verify user exists
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw ApiError.notFound('User not found.');
  }

  // Attempt update — catch email uniqueness violation
  try {
    const user = await prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });

    return user;
  } catch (error: any) {
    // Prisma error P2002 = unique constraint violation
    if (error.code === 'P2002') {
      throw ApiError.conflict('A user with this email already exists.');
    }
    throw error;  // Re-throw unexpected errors
  }
}

// ═══════════════════════════════════════════════════════
// CHANGE ROLE
// ═══════════════════════════════════════════════════════
//
// PATCH /api/users/:id/role
//
// Changes a user's role (VIEWER, ANALYST, ADMIN).
//
// BUSINESS RULE: Admins cannot change their own role.
// Why? If an Admin sets themselves to VIEWER, they can't undo it.
// This prevents accidental lockout.
//
// The `currentUserId` parameter comes from req.user.id (the JWT).

export async function changeRole(id: string, data: ChangeRoleInput, currentUserId: string) {
  // Prevent self-role-change
  if (id === currentUserId) {
    throw ApiError.badRequest('You cannot change your own role.');
  }

  // Verify user exists
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw ApiError.notFound('User not found.');
  }

  const user = await prisma.user.update({
    where: { id },
    data: { role: data.role },
    select: userSelect,
  });

  return user;
}

// ═══════════════════════════════════════════════════════
// CHANGE STATUS
// ═══════════════════════════════════════════════════════
//
// PATCH /api/users/:id/status
//
// Activates or deactivates a user account.
// Deactivated (INACTIVE) users cannot log in — this is enforced
// in auth.service.login() where we check user.status.
//
// BUSINESS RULE: Admins cannot deactivate their own account.
// Same lockout prevention logic as changeRole.

export async function changeStatus(id: string, data: ChangeStatusInput, currentUserId: string) {
  // Prevent self-deactivation
  if (id === currentUserId) {
    throw ApiError.badRequest('You cannot change your own status.');
  }

  // Verify user exists
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw ApiError.notFound('User not found.');
  }

  const user = await prisma.user.update({
    where: { id },
    data: { status: data.status },
    select: userSelect,
  });

  return user;
}
