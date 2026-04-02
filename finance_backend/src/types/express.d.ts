// ─── Express Type Augmentation ────────────────────────
// 
// PROBLEM: Express doesn't know about our custom `req.user` property.
// When our auth middleware sets `req.user = { id, email, name, role }`,
// TypeScript would complain: "Property 'user' does not exist on type 'Request'"
//
// SOLUTION: We "augment" Express's Request type to include our custom field.
// This file tells TypeScript: "Hey, Request objects can also have a `user` property."
//
// HOW IT WORKS:
// - `declare namespace Express` reopens Express's type namespace
// - We add `user?` to the Request interface (optional because not all requests are authenticated)
// - The `?` means it can be undefined — middleware must set it before controllers use it

declare namespace Express {
  interface Request {
    user?: {
      id: string;
      email: string;
      name: string;
      role: 'VIEWER' | 'ANALYST' | 'ADMIN';
    };
  }
}
