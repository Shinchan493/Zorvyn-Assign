// ─── Zod Validation Middleware ────────────────────────
//
// WHAT IT DOES:
// Validates incoming request data (body, query, params) against a Zod schema
// BEFORE it reaches the controller. If validation fails, it immediately returns
// a 400 error with detailed field-level messages.
//
// WHY validate in middleware?
// 1. Controllers stay clean — they can trust the data is already validated
// 2. Consistent error format — every validation error looks the same
// 3. Reusable — same middleware works for any endpoint, just pass different schemas
//
// HOW IT WORKS:
// `validate(schema)` is a higher-order function (like authorize).
// The schema defines what shape the data should be:
//
//   const createRecordSchema = z.object({
//     body: z.object({
//       amount: z.number().positive(),
//       type: z.enum(['INCOME', 'EXPENSE']),
//     }),
//   });
//
//   router.post('/records', validate(createRecordSchema), controller);
//
// If the client sends { amount: -5 }, they get:
//   {
//     "success": false,
//     "error": {
//       "code": "VALIDATION_ERROR",
//       "message": "Invalid input",
//       "details": [{ "field": "body.amount", "message": "Number must be greater than 0" }]
//     }
//   }

import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { ApiError } from '../utils/apiError';

/**
 * validate — Creates middleware that validates request data against a Zod schema.
 *
 * @param schema - A Zod schema that validates { body?, query?, params? }
 * @returns Express middleware function
 *
 * The schema should be structured to validate the parts of the request you care about:
 *   z.object({
 *     body: z.object({ ... }),     ← validates req.body
 *     query: z.object({ ... }),    ← validates req.query
 *     params: z.object({ ... }),   ← validates req.params
 *   })
 */
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // ─── Run the schema against the request data ────
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      // ─── Validation failed — format the errors ────
      // Zod gives us an array of issues, each with a path and message.
      // We transform them into our API's error format.
      const details = formatZodErrors(result.error);

      throw ApiError.badRequest('Invalid input', details);
    }

    // ─── Validation passed — use the parsed (transformed) data ────
    // Zod can transform data (e.g., coerce strings to numbers, trim whitespace).
    // We write the parsed data BACK to the request so controllers get clean data.
    //
    // Cast to a record type because ZodSchema.safeParse returns `unknown`.
    // The actual shape depends on the schema passed to validate().
    const parsed = result.data as Record<string, any>;
    if (parsed.body) req.body = parsed.body;
    if (parsed.query) req.query = parsed.query;
    if (parsed.params) req.params = parsed.params;

    next();
  };
}

/**
 * Transform Zod's error format into our API's field-level error format.
 *
 * Zod error:
 *   { path: ['body', 'amount'], message: 'Expected number, received string' }
 *
 * Our format:
 *   { field: 'body.amount', message: 'Expected number, received string' }
 */
function formatZodErrors(error: ZodError): Array<{ field: string; message: string }> {
  return error.issues.map((issue) => ({
    // Join the path array: ['body', 'amount'] → 'body.amount'
    field: issue.path.join('.'),
    message: issue.message,
  }));
}
