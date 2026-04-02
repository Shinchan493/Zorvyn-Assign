// ─── Prisma Configuration (Prisma 7+) ─────────────────
// In Prisma 7, database connection config moved from schema.prisma
// to this centralized config file. This is where the CLI reads the
// DATABASE_URL for migrations, seeding, etc.

import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  // Path to the Prisma schema file
  schema: 'prisma/schema.prisma',

  // Database connection — reads from .env file
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
