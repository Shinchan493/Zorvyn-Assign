// ─── Shared Prisma Client Instance ────────────────────
//
// WHAT THIS FILE DOES:
// Creates and exports a SINGLE PrismaClient instance for the entire app.
//
// WHY A SHARED INSTANCE?
// 1. PrismaClient manages a connection pool internally.
//    Creating multiple instances wastes connections.
// 2. Prisma 7 requires a driver adapter for database connections.
//    Centralizing this avoids duplicating adapter setup in every service.
// 3. Importing from one place makes it easy to swap databases later.
//
// PRISMA 7 DRIVER ADAPTER:
// Prisma 7 no longer auto-connects to the database.
// You must provide a "driver adapter" that wraps the native DB driver.
// For SQLite, we use @prisma/adapter-better-sqlite3.

import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

// Create the driver adapter with the database URL from environment
// DATABASE_URL is loaded by dotenv in config/index.ts (imported before this runs)
const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || 'file:./dev.db',
});

// Create a single PrismaClient instance with the adapter
const prisma = new PrismaClient({ adapter });

export default prisma;
