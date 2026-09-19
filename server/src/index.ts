import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import helmet from 'helmet';
import uploadRouter from './routes/upload';
import { startCleanupWorker, stopCleanupWorker } from './jobs/cleanup';
import { prisma } from './lib/prisma';
import { env } from './config/env';

const app = express();
const port = env.PORT;

// Security Headers via Helmet (enforces X-Content-Type-Options: nosniff, etc.)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Core Middleware
const corsOrigin = env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(',').map((o) => o.trim());
app.use(cors({ origin: corsOrigin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'SendTemp API',
    timestamp: new Date().toISOString(),
  });
});

// Register Routes
app.use('/api/shares', uploadRouter);

// Centralized Error Handling Middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  // Handle Multer file size / limits
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      const maxMb = env.MAX_FILE_SIZE_MB;
      res.status(413).json({
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: `File exceeds maximum allowed size of ${maxMb}MB`,
        },
      });
      return;
    }

    res.status(400).json({
      error: {
        code: `UPLOAD_ERROR_${err.code}`,
        message: err.message,
      },
    });
    return;
  }

  // Handle Prisma / Database connectivity or transaction errors
  if (
    (err.code && typeof err.code === 'string' && err.code.startsWith('P')) ||
    err.name === 'PrismaClientInitializationError' ||
    err.name === 'PrismaClientKnownRequestError' ||
    err.name === 'PrismaClientRustPanicError'
  ) {
    console.error('[Prisma Database Error]:', err.message || err);
    res.status(503).json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database server is currently unavailable or unreachable at localhost:5432.',
      },
    });
    return;
  }

  console.error('[Unhandled Error]:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred.',
    },
  });
});

// 404 Route Catch-All
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'The requested resource does not exist.',
    },
  });
});

let server: any = null;

// Start Server & Workers if not in test environment
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(port, () => {
    console.log(`[SendTemp] Server listening on port ${port}`);

    // Initialize background cleanup worker
    startCleanupWorker(60000);
  });
}

// Graceful Shutdown Management
const gracefulShutdown = async (signal: string) => {
  console.log(`\n[SendTemp] Received ${signal}. Initiating graceful shutdown...`);

  // Stop background scheduler
  stopCleanupWorker();

  // Stop HTTP incoming requests
  if (server) {
    server.close(() => {
      console.log('[SendTemp] HTTP server closed successfully.');
    });
  }

  // Close Prisma database connection pool cleanly
  try {
    await prisma.$disconnect();
    console.log('[SendTemp] Database connections disconnected.');
  } catch (dbErr) {
    console.error('[SendTemp] Error disconnecting database:', dbErr);
  }

  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

export default app;
