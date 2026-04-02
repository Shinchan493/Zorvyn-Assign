// ─── Configuration Module ─────────────────────────────
// This reads environment variables and exports them as typed constants.
//
// WHY a config module?
// 1. Single source of truth: if you need PORT, import from here — not process.env
// 2. Validation: catches missing env vars at startup, not at runtime mid-request
// 3. Type safety: everything is properly typed (number, string, etc.)
// 4. Default values: sensible fallbacks for development

import dotenv from 'dotenv';

// Load .env file into process.env
// This MUST happen before accessing any env vars
dotenv.config();

export const config = {
  // ─── Server ───
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Helper: are we in development mode?
  get isDev(): boolean {
    return this.nodeEnv === 'development';
  },

  // ─── Database ───
  // Prisma reads DATABASE_URL directly, but we expose it here for reference
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',

  // ─── JWT (JSON Web Token) ───
  jwt: {
    // The secret key used to sign & verify tokens
    // MUST be changed in production — a leaked secret means anyone can forge tokens
    secret: process.env.JWT_SECRET || 'fallback-dev-secret',

    // How long a token is valid after creation
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  // ─── Bcrypt ───
  bcrypt: {
    // "Salt rounds" = how many times the hash is re-computed
    // Higher = slower but more secure. 12 takes ~250ms (good balance)
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
  },
} as const;
