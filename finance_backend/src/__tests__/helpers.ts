// ─── Test Helpers ─────────────────────────────────────
//
// WHAT THIS FILE DOES:
// Provides utility functions used across all test files.
// The main helper is getAuthToken() which logs in as a test user
// and returns the JWT token for authenticated requests.

import request from 'supertest';
import app from '../app';
import { testUsers } from './setup';

type TestRole = 'admin' | 'analyst' | 'viewer';

// Cache tokens so we don't re-login for every test
const tokenCache: Partial<Record<TestRole, string>> = {};

/**
 * Get a JWT auth token for a test user.
 * Logs in via the /api/auth/login endpoint and caches the token.
 *
 * @param role - Which test user to login as ('admin', 'analyst', 'viewer')
 * @returns JWT token string
 */
export async function getAuthToken(role: TestRole): Promise<string> {
  if (tokenCache[role]) {
    return tokenCache[role]!;
  }

  const userData = testUsers[role];
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: userData.email, password: userData.password });

  if (res.status !== 200) {
    throw new Error(`Login failed for ${role}: ${res.status} ${JSON.stringify(res.body)}`);
  }

  tokenCache[role] = res.body.data.token;
  return tokenCache[role]!;
}

/**
 * Clear cached tokens (useful if a test modifies user status).
 */
export function clearTokenCache() {
  for (const key of Object.keys(tokenCache)) {
    delete tokenCache[key as TestRole];
  }
}
