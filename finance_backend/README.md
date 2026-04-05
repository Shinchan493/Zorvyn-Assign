# Finance Backend API

A robust, secure, and fully-typed RESTful API for a personal finance management application.

## 🚀 Features

- **TypeScript** - Strongly typed throughout, from database models to HTTP responses.
- **Express 5** - Modern async error handling built-in.
- **Prisma ORM** - Type-safe database client with Better-SQLite3 driver adapter.
- **Role-Based Access Control (RBAC)** - Admin, Analyst, and Viewer roles.
- **Data Validation** - Strict request validation using Zod.
- **Security** - Rate limiting, helmet, and robust JWT authentication.
- **Interactive Analytics** - Complex aggregations for dashboard trends and summaries.
- **Automated Testing** - Comprehensive integration tests using Jest and Supertest.
- **OpenAPI / Swagger** - Interactive API documentation.

## 🛠 Tech Stack

- **Runtime:** Node.js
- **Framework:** Express (v5)
- **Language:** TypeScript
- **Database:** SQLite (via Prisma ORM 7 adapter)
- **Validation:** Zod
- **Authentication:** JSON Web Tokens (JWT) + bcryptjs
- **Testing:** Jest + Supertest
- **Documentation:** Swagger / OpenAPI 3.0

## 📦 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm

### 1. Installation

Clone the repository and install dependencies:

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory (you can copy the example securely):

```bash
cp .env.example .env
```

Ensure the `.env` file has the required values:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"
```

### 3. Database Setup & Seeding

Run the database migrations and populate it with demo data:

```bash
npm run db:setup
```

*Note: The seed script creates 3 demo users (Admin, Analyst, Viewer) and generates ~60 financial records spanning the last 6 months.*

### 4. Running the Application

**Development Mode (Hot Reloading)**
```bash
npm run dev
```

**Production Mode**
```bash
npm run build
npm start
```

## 🧪 Testing

The project includes a comprehensive test suite (50+ integration tests) verifying routing, validation, error handling, auth logic, security policies, and DB integrity.

```bash
# Run all tests
npm test
```

## 📚 API Documentation

Once the server is running, you can explore and interact with the API endpoints via Swagger UI:

**http://localhost:3000/api-docs**

### Endpoints Overview

| Module | Endpoints | Description |
|---|---|---|
| **Auth** | `POST /api/auth/register`<br>`POST /api/auth/login`<br>`GET /api/auth/me` | User registration, login, and profile fetching. |
| **Users** | `GET /api/users`<br>`GET /api/users/:id`<br>`PATCH /api/users/:id`<br>`PATCH /api/users/:id/role`<br>`PATCH /api/users/:id/status` | User management. Restricted to **ADMIN**. |
| **Records** | `GET /api/records`<br>`POST /api/records`<br>`PATCH /api/records/:id`<br>`DELETE /api/records/:id` | Financial records CRUD. Write operations restricted to **ADMIN**. Reads open to all. |
| **Dashboard** | `GET /api/dashboard/summary`<br>`GET /api/dashboard/categories`<br>`GET /api/dashboard/trends`<br>`GET /api/dashboard/recent` | Data aggregations. Restricted to **ANALYST** and **ADMIN**. |

## 👥 Authentication & Authorization

All secure endpoints require a valid JWT passed in the `Authorization` header:
`Authorization: Bearer <your_token_here>`

**Available Roles:**
- **ADMIN:** Full access to all endpoints, user management, and write access.
- **ANALYST:** Read access to records and all dashboard analytics metrics.
- **VIEWER:** Read access limited to records only.

## 📝 Available Scripts

- `npm run dev` - Start development server with hot-reload (tsx + nodemon)
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the compiled production build
- `npm test` - Run the Jest test suite
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Apply database migrations
- `npm run db:seed` - Run demo seed data script
- `npm run db:setup` - Run migrations & seed combined
- `npm run lint` - Run TypeScript compiler checks without emitting files