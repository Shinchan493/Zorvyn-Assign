// ─── Test Setup ───────────────────────────────────────
//
// WHAT THIS FILE DOES:
// Exports test user data and helper functions for seeding.
// Each test file imports and calls these in its own beforeAll/afterAll.
//
// WHY NOT GLOBAL SETUP?
// Jest's setupFiles run BEFORE the test framework (no beforeAll/afterAll).
// Jest's globalSetup runs in a SEPARATE process (no shared state).
// So we export functions and let each test file manage its own lifecycle.

import prisma from '../config/prisma';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export const testUsers = {
  admin: {
    email: 'test-admin@finance.com',
    name: 'Test Admin',
    password: 'testadmin123',
    role: 'ADMIN' as const,
  },
  analyst: {
    email: 'test-analyst@finance.com',
    name: 'Test Analyst',
    password: 'testanalyst123',
    role: 'ANALYST' as const,
  },
  viewer: {
    email: 'test-viewer@finance.com',
    name: 'Test Viewer',
    password: 'testviewer123',
    role: 'VIEWER' as const,
  },
};

// Store created user IDs for use in tests
export const userIds: Record<string, string> = {};

export async function seedTestData() {
  for (const [key, userData] of Object.entries(testUsers)) {
    const passwordHash = await bcrypt.hash(userData.password, SALT_ROUNDS);

    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: { passwordHash, role: userData.role, name: userData.name, status: 'ACTIVE' },
      create: {
        email: userData.email,
        name: userData.name,
        passwordHash,
        role: userData.role,
      },
    });

    userIds[key] = user.id;
  }
}

export async function cleanupTestData() {
  // Delete test records first (foreign key constraint)
  await prisma.financialRecord.deleteMany({
    where: {
      createdById: { in: Object.values(userIds) },
    },
  });

  // Delete test users  
  await prisma.user.deleteMany({
    where: {
      email: { in: Object.values(testUsers).map((u) => u.email) },
    },
  });
}

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
