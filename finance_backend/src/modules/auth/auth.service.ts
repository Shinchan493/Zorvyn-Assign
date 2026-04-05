// ─── Auth Service ─────────────────────────────────────
//
// WHAT THIS FILE DOES:
// Contains ALL business logic for authentication:
//   1. register() — create a new user account
//   2. login()    — verify credentials and issue a JWT
//   3. getMe()    — fetch the currently authenticated user's profile
//
// WHY SEPARATE SERVICE FROM CONTROLLER?
// - Service: pure business logic — "what to do" (reusable, testable)
// - Controller: HTTP glue — "how to handle the request" (req/res parsing)
//
// This separation means:
// - Services can be called from tests, cron jobs, or other services
// - Controllers stay thin (< 10 lines each)
// - Business rules live in one place, not scattered across routes
//
// SECURITY NOTES:
// - Passwords are hashed with bcrypt (one-way; can't be reversed)
// - JWT contains { userId, email, name, role } — enough for auth middleware
// - We NEVER return passwordHash in any response (excluded via select)

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { ApiError } from '../../utils/apiError';
import type { RegisterInput, LoginInput } from './auth.schema';

// ─── Prisma Client Instance ──────────────────────────
// Single instance shared across the application.
// Prisma handles connection pooling internally.
const prisma = new PrismaClient();

// ─── Reusable select object ──────────────────────────
// Defines which User fields to include in API responses.
// CRITICAL: passwordHash is explicitly set to false.
// This prevents accidental password leaks, even if we refactor later.
const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  passwordHash: false,   // ← NEVER return the password hash
} as const;

// ─── Helper: Generate JWT Token ──────────────────────
// Encodes user identity into a signed, time-limited token.
// The auth middleware (middleware/auth.ts) will decode this on protected routes.
function generateToken(user: { id: string; email: string; name: string; role: string }): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] }
  );
}

// ═══════════════════════════════════════════════════════
// REGISTER
// ═══════════════════════════════════════════════════════
//
// Flow:
// 1. Check if email already exists → 409 Conflict
// 2. Hash the password with bcrypt
// 3. Create the user in the database
// 4. Generate a JWT token
// 5. Return { user, token }
//
// WHY hash passwords?
// If the database is ever breached, attackers get hashes, not plain passwords.
// bcrypt is intentionally slow (controlled by saltRounds) to resist brute-force.

export async function register(data: RegisterInput) {
  // ─── 1. Check for duplicate email ────
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw ApiError.conflict('A user with this email already exists.');
  }

  // ─── 2. Hash the password ────
  // bcrypt.hash(plaintext, saltRounds)
  // saltRounds = 12 → ~250ms per hash (good balance of speed vs security)
  const passwordHash = await bcrypt.hash(data.password, config.bcrypt.saltRounds);

  // ─── 3. Create user in database ────
  // New users always start as VIEWER + ACTIVE (enforced by Prisma defaults).
  // The `select` ensures we don't return the passwordHash.
  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      passwordHash,
    },
    select: userSelect,
  });

  // ─── 4. Generate JWT ────
  const token = generateToken(user);

  // ─── 5. Return user + token ────
  return { user, token };
}

// ═══════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════
//
// Flow:
// 1. Find user by email → 401 if not found
// 2. Check if account is ACTIVE → 403 if inactive
// 3. Compare password with bcrypt → 401 if wrong
// 4. Generate a JWT token
// 5. Return { user, token }
//
// SECURITY: We use the SAME error message for "user not found" and
// "wrong password" to prevent email enumeration attacks.
// An attacker can't tell if an email exists in the system.

export async function login(data: LoginInput) {
  // ─── 1. Find user by email (include passwordHash for comparison) ────
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    // Intentionally vague: don't reveal whether the email exists
    throw ApiError.unauthorized('Invalid email or password.');
  }

  // ─── 2. Check account status ────
  // Inactive users can't log in, even with correct password
  if (user.status === 'INACTIVE') {
    throw ApiError.forbidden(
      'Your account has been deactivated. Please contact an administrator.'
    );
  }

  // ─── 3. Compare password ────
  // bcrypt.compare(plaintext, hash) → true if they match
  // bcrypt handles the salt extraction internally
  const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);

  if (!isPasswordValid) {
    throw ApiError.unauthorized('Invalid email or password.');
  }

  // ─── 4. Generate JWT ────
  const token = generateToken(user);

  // ─── 5. Return user (without passwordHash) + token ────
  // We manually exclude passwordHash since we fetched the full user
  // (we needed passwordHash for comparison but don't want to return it)
  const { passwordHash: _, ...userWithoutPassword } = user;

  return { user: userWithoutPassword, token };
}

// ═══════════════════════════════════════════════════════
// GET ME (Current User Profile)
// ═══════════════════════════════════════════════════════
//
// Returns the full profile of the currently authenticated user.
// The userId comes from the JWT (decoded by auth middleware into req.user.id).
//
// WHY query the DB instead of using req.user directly?
// req.user only has { id, email, name, role } from the JWT.
// The DB query returns the full, up-to-date profile including timestamps.

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect,
  });

  if (!user) {
    throw ApiError.notFound('User not found.');
  }

  return user;
}
