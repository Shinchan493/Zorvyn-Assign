// ─── Server Entry Point ───────────────────────────────
//
// This file does ONE thing: starts the HTTP server.
//
// WHY separate from app.ts?
// - app.ts exports the Express app object (can be imported by tests)
// - server.ts calls app.listen() which is a SIDE EFFECT (binds to a port)
// - Tests use Supertest which calls the app directly without listening on a port
//
// FLOW:
//   npm run dev → nodemon runs tsx server.ts → this file executes → server starts

import app from './app';
import { config } from './config';

const server = app.listen(config.port, () => {
  console.log(`
  ╔═══════════════════════════════════════════════╗
  ║   Finance Backend API Server                  ║
  ║   Environment : ${config.nodeEnv.padEnd(28)}║
  ║   Port        : ${String(config.port).padEnd(28)}║
  ║   Health      : http://localhost:${config.port}/api/health ║
  ╚═══════════════════════════════════════════════╝
  `);
});

// ─── Graceful Shutdown ────────────────────────────────
// When the process receives SIGTERM (e.g., Docker stop, Ctrl+C),
// we close the server cleanly instead of killing mid-request.
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});
