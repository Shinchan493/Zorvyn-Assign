// ─── Database Seed Script ─────────────────────────────
//
// WHAT THIS FILE DOES:
// Populates the database with demo data for testing and evaluation.
// Run with: npm run db:seed (or automatically via npm run db:setup)
//
// CREATES:
//   - 3 demo users (Admin, Analyst, Viewer) with known passwords
//   - 60 financial records spanning 6 months across 10 categories
//
// LOGIN CREDENTIALS (for testing):
//   ┌────────────────────────┬──────────────────┬────────────┐
//   │ Email                  │ Password         │ Role       │
//   ├────────────────────────┼──────────────────┼────────────┤
//   │ admin@finance.com      │ admin123456      │ ADMIN      │
//   │ analyst@finance.com    │ analyst123456    │ ANALYST    │
//   │ viewer@finance.com     │ viewer123456     │ VIEWER     │
//   └────────────────────────┴──────────────────┴────────────┘
//
// IDEMPOTENT DESIGN:
// The script uses upsert (update-or-create) for users
// and deletes all existing records before re-seeding.
// This means you can run it multiple times safely.

import 'dotenv/config';
import { PrismaClient, Role, RecordType } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import bcrypt from 'bcryptjs';

// Prisma 7 requires a driver adapter for database connections
const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || 'file:./dev.db',
});
const prisma = new PrismaClient({ adapter });

// ─── Configuration ───────────────────────────────────
const SALT_ROUNDS = 12;

// ─── Demo Users ──────────────────────────────────────
// Each user has a known password for testing purposes.
// In production, these would never be hardcoded.
const users = [
  {
    email: 'admin@finance.com',
    name: 'Admin User',
    password: 'admin123456',
    role: Role.ADMIN,
  },
  {
    email: 'analyst@finance.com',
    name: 'Analyst User',
    password: 'analyst123456',
    role: Role.ANALYST,
  },
  {
    email: 'viewer@finance.com',
    name: 'Viewer User',
    password: 'viewer123456',
    role: Role.VIEWER,
  },
];

// ─── Financial Record Templates ──────────────────────
// These templates are used to generate realistic-looking records.
// Each template defines a type, category, amount range, and description.
const recordTemplates = [
  // INCOME categories
  { type: RecordType.INCOME, category: 'Salary',     minAmount: 4000, maxAmount: 6000, descriptions: ['Monthly salary', 'Salary payment', 'Base salary deposit'] },
  { type: RecordType.INCOME, category: 'Freelance',   minAmount: 500,  maxAmount: 3000, descriptions: ['Web development project', 'Design consultation', 'API integration work', 'Code review contract'] },
  { type: RecordType.INCOME, category: 'Investments',  minAmount: 100,  maxAmount: 2000, descriptions: ['Dividend payment', 'Stock sale proceeds', 'Bond interest', 'Mutual fund returns'] },
  { type: RecordType.INCOME, category: 'Refunds',     minAmount: 20,   maxAmount: 500,  descriptions: ['Product return refund', 'Insurance reimbursement', 'Tax refund', 'Overcharge correction'] },

  // EXPENSE categories
  { type: RecordType.EXPENSE, category: 'Rent',        minAmount: 1200, maxAmount: 1800, descriptions: ['Monthly rent payment', 'Apartment rent', 'Office space rent'] },
  { type: RecordType.EXPENSE, category: 'Utilities',    minAmount: 50,   maxAmount: 300,  descriptions: ['Electricity bill', 'Water bill', 'Internet subscription', 'Gas bill', 'Phone bill'] },
  { type: RecordType.EXPENSE, category: 'Groceries',    minAmount: 50,   maxAmount: 400,  descriptions: ['Weekly grocery shopping', 'Fresh produce', 'Bulk supplies', 'Organic food order'] },
  { type: RecordType.EXPENSE, category: 'Transport',    minAmount: 30,   maxAmount: 200,  descriptions: ['Fuel expenses', 'Public transit pass', 'Ride-share trips', 'Parking fees'] },
  { type: RecordType.EXPENSE, category: 'Entertainment', minAmount: 15,  maxAmount: 150,  descriptions: ['Streaming subscription', 'Movie tickets', 'Concert tickets', 'Gaming purchase', 'Books'] },
  { type: RecordType.EXPENSE, category: 'Healthcare',   minAmount: 25,  maxAmount: 500,  descriptions: ['Pharmacy prescription', 'Doctor visit copay', 'Dental checkup', 'Gym membership'] },
];

// ─── Helper: Random number in range ──────────────────
function randomBetween(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

// ─── Helper: Random item from array ──────────────────
function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Helper: Generate a date within the last N months ──
function randomDate(monthsBack: number): Date {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  const diff = now.getTime() - start.getTime();
  return new Date(start.getTime() + Math.random() * diff);
}

// ═══════════════════════════════════════════════════════
// MAIN SEED FUNCTION
// ═══════════════════════════════════════════════════════

async function main() {
  console.log('🌱 Seeding database...\n');

  // ─── 1. Create/Update Demo Users ─────────────────
  console.log('👤 Creating demo users...');
  const createdUsers: Array<{ id: string; email: string; role: Role }> = [];

  for (const userData of users) {
    const passwordHash = await bcrypt.hash(userData.password, SALT_ROUNDS);

    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        name: userData.name,
        passwordHash,
        role: userData.role,
      },
      create: {
        email: userData.email,
        name: userData.name,
        passwordHash,
        role: userData.role,
      },
    });

    createdUsers.push({ id: user.id, email: user.email, role: user.role });
    console.log(`   ✅ ${user.role.padEnd(7)} → ${user.email} (password: ${userData.password})`);
  }

  // ─── 2. Clear existing records ───────────────────
  // Delete all existing records before re-seeding
  // to avoid duplicates on repeated runs.
  const deleteResult = await prisma.financialRecord.deleteMany({});
  console.log(`\n🗑️  Cleared ${deleteResult.count} existing records.`);

  // ─── 3. Generate Financial Records ───────────────
  console.log('\n💰 Creating financial records...');

  // Use the Admin user as the creator for all seeded records
  const adminUser = createdUsers.find((u) => u.role === 'ADMIN')!;
  const records: Array<{
    amount: number;
    type: RecordType;
    category: string;
    date: Date;
    description: string;
    createdById: string;
  }> = [];

  // Generate ~60 records across 6 months
  // Strategy: For each month, generate a mix of income and expense records
  // to create realistic-looking trends for the dashboard.
  for (let month = 0; month < 6; month++) {
    // Salary — once per month (consistent income)
    const salaryTemplate = recordTemplates[0]; // Salary
    records.push({
      amount: randomBetween(salaryTemplate.minAmount, salaryTemplate.maxAmount),
      type: salaryTemplate.type,
      category: salaryTemplate.category,
      date: new Date(new Date().getFullYear(), new Date().getMonth() - month, 1),
      description: randomFrom(salaryTemplate.descriptions),
      createdById: adminUser.id,
    });

    // 2-3 freelance gigs per month (variable income)
    const freelanceCount = Math.floor(Math.random() * 2) + 2;
    for (let i = 0; i < freelanceCount; i++) {
      const template = recordTemplates[1]; // Freelance
      records.push({
        amount: randomBetween(template.minAmount, template.maxAmount),
        type: template.type,
        category: template.category,
        date: randomDate(month + 1),
        description: randomFrom(template.descriptions),
        createdById: adminUser.id,
      });
    }

    // 1 investment return per month
    const investTemplate = recordTemplates[2]; // Investments
    records.push({
      amount: randomBetween(investTemplate.minAmount, investTemplate.maxAmount),
      type: investTemplate.type,
      category: investTemplate.category,
      date: randomDate(month + 1),
      description: randomFrom(investTemplate.descriptions),
      createdById: adminUser.id,
    });

    // Rent — once per month (consistent expense)
    const rentTemplate = recordTemplates[4]; // Rent
    records.push({
      amount: randomBetween(rentTemplate.minAmount, rentTemplate.maxAmount),
      type: rentTemplate.type,
      category: rentTemplate.category,
      date: new Date(new Date().getFullYear(), new Date().getMonth() - month, 5),
      description: randomFrom(rentTemplate.descriptions),
      createdById: adminUser.id,
    });

    // 2-4 utility bills per month
    const utilityCount = Math.floor(Math.random() * 3) + 2;
    for (let i = 0; i < utilityCount; i++) {
      const template = recordTemplates[5]; // Utilities
      records.push({
        amount: randomBetween(template.minAmount, template.maxAmount),
        type: template.type,
        category: template.category,
        date: randomDate(month + 1),
        description: randomFrom(template.descriptions),
        createdById: adminUser.id,
      });
    }

    // 3-5 grocery trips per month
    const groceryCount = Math.floor(Math.random() * 3) + 3;
    for (let i = 0; i < groceryCount; i++) {
      const template = recordTemplates[6]; // Groceries
      records.push({
        amount: randomBetween(template.minAmount, template.maxAmount),
        type: template.type,
        category: template.category,
        date: randomDate(month + 1),
        description: randomFrom(template.descriptions),
        createdById: adminUser.id,
      });
    }

    // 1-2 entertainment per month
    const entertainCount = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < entertainCount; i++) {
      const template = recordTemplates[8]; // Entertainment
      records.push({
        amount: randomBetween(template.minAmount, template.maxAmount),
        type: template.type,
        category: template.category,
        date: randomDate(month + 1),
        description: randomFrom(template.descriptions),
        createdById: adminUser.id,
      });
    }

    // 1-2 transport per month
    const transportCount = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < transportCount; i++) {
      const template = recordTemplates[7]; // Transport
      records.push({
        amount: randomBetween(template.minAmount, template.maxAmount),
        type: template.type,
        category: template.category,
        date: randomDate(month + 1),
        description: randomFrom(template.descriptions),
        createdById: adminUser.id,
      });
    }

    // 0-1 healthcare per month (occasional)
    if (Math.random() > 0.4) {
      const template = recordTemplates[9]; // Healthcare
      records.push({
        amount: randomBetween(template.minAmount, template.maxAmount),
        type: template.type,
        category: template.category,
        date: randomDate(month + 1),
        description: randomFrom(template.descriptions),
        createdById: adminUser.id,
      });
    }

    // 0-1 refund per month (rare)
    if (Math.random() > 0.6) {
      const template = recordTemplates[3]; // Refunds
      records.push({
        amount: randomBetween(template.minAmount, template.maxAmount),
        type: template.type,
        category: template.category,
        date: randomDate(month + 1),
        description: randomFrom(template.descriptions),
        createdById: adminUser.id,
      });
    }
  }

  // Bulk insert all records using createMany (much faster than individual creates)
  const result = await prisma.financialRecord.createMany({ data: records });
  console.log(`   ✅ Created ${result.count} financial records across 6 months.`);

  // ─── 4. Summary ──────────────────────────────────
  const incomeTotal = records
    .filter((r) => r.type === 'INCOME')
    .reduce((sum, r) => sum + r.amount, 0);

  const expenseTotal = records
    .filter((r) => r.type === 'EXPENSE')
    .reduce((sum, r) => sum + r.amount, 0);

  const categories = [...new Set(records.map((r) => r.category))];

  console.log('\n📊 Seed Summary:');
  console.log(`   Users:      ${createdUsers.length}`);
  console.log(`   Records:    ${result.count}`);
  console.log(`   Income:     $${incomeTotal.toFixed(2)}`);
  console.log(`   Expenses:   $${expenseTotal.toFixed(2)}`);
  console.log(`   Net:        $${(incomeTotal - expenseTotal).toFixed(2)}`);
  console.log(`   Categories: ${categories.join(', ')}`);
  console.log(`   Date range: last 6 months`);

  console.log('\n✅ Database seeded successfully!');
  console.log('\n📝 Login credentials:');
  console.log('   Admin:   admin@finance.com   / admin123456');
  console.log('   Analyst: analyst@finance.com / analyst123456');
  console.log('   Viewer:  viewer@finance.com  / viewer123456');
}

// ─── Run ─────────────────────────────────────────────
main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
