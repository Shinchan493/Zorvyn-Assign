// ─── Swagger / OpenAPI Configuration ──────────────────
//
// WHAT THIS FILE DOES:
// Defines the complete OpenAPI 3.0 specification for the Finance Backend API.
// This powers the interactive Swagger UI at /api-docs where users can:
//   - Browse all available endpoints
//   - See request/response schemas
//   - Try out API calls directly from the browser
//
// APPROACH: Centralized spec vs JSDoc annotations
// We define the full spec here rather than scattering @swagger comments
// across route files. Benefits:
//   1. Complete picture in one place
//   2. Easier to maintain and review
//   3. No risk of spec drifting from implementation
//   4. Can be exported as a standalone OpenAPI JSON file
//
// STRUCTURE:
//   - info: API metadata (title, version, description)
//   - servers: Base URLs
//   - components: Reusable schemas and security definitions
//   - paths: All endpoint definitions grouped by tag

import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Finance Backend API',
    version: '1.0.0',
    description:
      'Finance Data Processing & Access Control Backend with role-based access control (RBAC). ' +
      'Supports three roles: VIEWER (read records), ANALYST (read records + dashboard), ADMIN (full access).',
    contact: {
      name: 'Finance Backend',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
  ],

  // ─── COMPONENTS ──────────────────────────────────────
  components: {
    // Security scheme — JWT Bearer token
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter the JWT token obtained from /api/auth/login',
      },
    },

    // Reusable schemas
    schemas: {
      // ─── User ────────────────────────────────────────
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: { type: 'string', enum: ['VIEWER', 'ANALYST', 'ADMIN'] },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      // ─── Financial Record ────────────────────────────
      FinancialRecord: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          amount: { type: 'number', minimum: 0 },
          type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
          category: { type: 'string' },
          date: { type: 'string', format: 'date-time' },
          description: { type: 'string', nullable: true },
          createdById: { type: 'string', format: 'uuid' },
          createdBy: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              email: { type: 'string', format: 'email' },
            },
          },
          isDeleted: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      // ─── Pagination Meta ─────────────────────────────
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },

      // ─── Error Response ──────────────────────────────
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },

  // ─── PATHS ───────────────────────────────────────────
  paths: {
    // ═══════════════════════════════════════════════════
    // HEALTH
    // ═══════════════════════════════════════════════════
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns server status and environment info.',
        responses: {
          '200': {
            description: 'Server is running',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', example: 'ok' },
                        timestamp: { type: 'string', format: 'date-time' },
                        environment: { type: 'string', example: 'development' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ═══════════════════════════════════════════════════
    // AUTH
    // ═══════════════════════════════════════════════════
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new account',
        description: 'Creates a new user with VIEWER role and returns a JWT token.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', minLength: 2, maxLength: 100, example: 'John Doe' },
                  email: { type: 'string', format: 'email', example: 'john@example.com' },
                  password: { type: 'string', minLength: 8, example: 'securepass123' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Account created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                        token: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Email already exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '429': { description: 'Too many attempts', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in to existing account',
        description: 'Authenticates with email + password and returns a JWT token.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'admin@finance.com' },
                  password: { type: 'string', example: 'admin123456' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                        token: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Account deactivated', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '429': { description: 'Too many attempts', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user profile',
        description: 'Returns the profile of the currently authenticated user.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Current user profile',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          '401': { description: 'Not authenticated', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    // ═══════════════════════════════════════════════════
    // USERS
    // ═══════════════════════════════════════════════════
    '/api/users': {
      get: {
        tags: ['Users'],
        summary: 'List all users (Admin only)',
        description: 'Returns a paginated list of users with optional role/status filters.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
          { name: 'role', in: 'query', schema: { type: 'string', enum: ['VIEWER', 'ANALYST', 'ADMIN'] } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] } },
        ],
        responses: {
          '200': {
            description: 'Paginated list of users',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/User' } },
                    meta: { $ref: '#/components/schemas/PaginationMeta' },
                  },
                },
              },
            },
          },
          '401': { description: 'Not authenticated' },
          '403': { description: 'Not authorized (Admin only)' },
        },
      },
    },

    '/api/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get user by ID (Admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'User details', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/User' } } } } } },
          '404': { description: 'User not found' },
        },
      },
      patch: {
        tags: ['Users'],
        summary: 'Update user (Admin only)',
        description: 'Update a user\'s name and/or email. At least one field required.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', minLength: 2, maxLength: 100 },
                  email: { type: 'string', format: 'email' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'User updated', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/User' } } } } } },
          '404': { description: 'User not found' },
          '409': { description: 'Email already exists' },
        },
      },
    },

    '/api/users/{id}/role': {
      patch: {
        tags: ['Users'],
        summary: 'Change user role (Admin only)',
        description: 'Changes a user\'s role. Admins cannot change their own role.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['role'],
                properties: {
                  role: { type: 'string', enum: ['VIEWER', 'ANALYST', 'ADMIN'] },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Role updated', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/User' } } } } } },
          '400': { description: 'Cannot change own role' },
          '404': { description: 'User not found' },
        },
      },
    },

    '/api/users/{id}/status': {
      patch: {
        tags: ['Users'],
        summary: 'Change user status (Admin only)',
        description: 'Activates or deactivates a user. Admins cannot change their own status.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Status updated', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/User' } } } } } },
          '400': { description: 'Cannot change own status' },
          '404': { description: 'User not found' },
        },
      },
    },

    // ═══════════════════════════════════════════════════
    // RECORDS
    // ═══════════════════════════════════════════════════
    '/api/records': {
      get: {
        tags: ['Records'],
        summary: 'List financial records',
        description: 'Returns a paginated list of active records with optional filters. All authenticated users can access.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['INCOME', 'EXPENSE'] } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' }, description: 'ISO 8601 date (YYYY-MM-DD)' },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' }, description: 'ISO 8601 date (YYYY-MM-DD), inclusive' },
        ],
        responses: {
          '200': {
            description: 'Paginated list of records',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/FinancialRecord' } },
                    meta: { $ref: '#/components/schemas/PaginationMeta' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Records'],
        summary: 'Create a financial record (Admin only)',
        description: 'Creates a new financial record linked to the authenticated user.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount', 'type', 'category', 'date'],
                properties: {
                  amount: { type: 'number', minimum: 0.01, example: 5000 },
                  type: { type: 'string', enum: ['INCOME', 'EXPENSE'], example: 'INCOME' },
                  category: { type: 'string', example: 'Salary' },
                  date: { type: 'string', format: 'date', example: '2025-06-15' },
                  description: { type: 'string', example: 'Monthly salary payment' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Record created', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/FinancialRecord' } } } } } },
          '400': { description: 'Validation error' },
          '403': { description: 'Admin only' },
        },
      },
    },

    '/api/records/{id}': {
      get: {
        tags: ['Records'],
        summary: 'Get record by ID',
        description: 'Returns a single financial record. Soft-deleted records return 404.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Record details', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/FinancialRecord' } } } } } },
          '404': { description: 'Record not found' },
        },
      },
      patch: {
        tags: ['Records'],
        summary: 'Update a record (Admin only)',
        description: 'Partially updates a financial record. At least one field required.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  amount: { type: 'number', minimum: 0.01 },
                  type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
                  category: { type: 'string' },
                  date: { type: 'string', format: 'date' },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Record updated', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/FinancialRecord' } } } } } },
          '404': { description: 'Record not found' },
        },
      },
      delete: {
        tags: ['Records'],
        summary: 'Soft delete a record (Admin only)',
        description: 'Sets isDeleted=true. The record is not physically removed.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '204': { description: 'Record deleted (no content)' },
          '404': { description: 'Record not found' },
        },
      },
    },

    // ═══════════════════════════════════════════════════
    // DASHBOARD
    // ═══════════════════════════════════════════════════
    '/api/dashboard/summary': {
      get: {
        tags: ['Dashboard'],
        summary: 'Financial summary (Analyst + Admin)',
        description: 'Returns total income, total expense, net balance, and record count.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Filter from date (YYYY-MM-DD)' },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Filter to date (YYYY-MM-DD)' },
        ],
        responses: {
          '200': {
            description: 'Financial summary',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        totalIncome: { type: 'number', example: 120000 },
                        totalExpense: { type: 'number', example: 85000 },
                        netBalance: { type: 'number', example: 35000 },
                        recordCount: { type: 'integer', example: 150 },
                      },
                    },
                  },
                },
              },
            },
          },
          '403': { description: 'Analyst or Admin role required' },
        },
      },
    },

    '/api/dashboard/categories': {
      get: {
        tags: ['Dashboard'],
        summary: 'Category breakdown (Analyst + Admin)',
        description: 'Returns amounts grouped by category and record type.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['INCOME', 'EXPENSE'] }, description: 'Filter by record type' },
        ],
        responses: {
          '200': {
            description: 'Category breakdown',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          category: { type: 'string', example: 'Salary' },
                          type: { type: 'string', example: 'INCOME' },
                          totalAmount: { type: 'number', example: 50000 },
                          count: { type: 'integer', example: 5 },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/dashboard/trends': {
      get: {
        tags: ['Dashboard'],
        summary: 'Monthly trends (Analyst + Admin)',
        description: 'Returns income/expense totals grouped by month for chart visualization.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          '200': {
            description: 'Monthly trends',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          month: { type: 'string', example: '2025-01' },
                          income: { type: 'number', example: 15000 },
                          expense: { type: 'number', example: 8000 },
                          net: { type: 'number', example: 7000 },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/dashboard/recent': {
      get: {
        tags: ['Dashboard'],
        summary: 'Recent transactions (Analyst + Admin)',
        description: 'Returns the N most recent financial transactions.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10, maximum: 50 }, description: 'Number of transactions (default: 10, max: 50)' },
        ],
        responses: {
          '200': {
            description: 'Recent transactions',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/FinancialRecord' } },
                  },
                },
              },
            },
          },
        },
      },
    },
  },

  // ─── TAGS ──────────────────────────────────────────
  tags: [
    { name: 'Health', description: 'Server health check' },
    { name: 'Auth', description: 'Authentication — register, login, profile' },
    { name: 'Users', description: 'User management — Admin only' },
    { name: 'Records', description: 'Financial records — CRUD operations' },
    { name: 'Dashboard', description: 'Analytics — Analyst + Admin only' },
  ],
};

// Generate the Swagger spec from the definition
// swagger-jsdoc merges inline definitions with JSDoc annotations (we use inline only)
export const swaggerSpec = swaggerJsdoc({
  definition: swaggerDefinition,
  apis: [],  // No JSDoc annotations — everything is defined inline above
});
