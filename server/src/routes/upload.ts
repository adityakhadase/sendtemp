import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { defaultStorageProvider } from '../services/StorageService';
import { prisma } from '../lib/prisma';
import { parseRangeHeader } from '../utils/rangeParser';
import { env } from '../config/env';

const router = Router();

// IP-based rate limiter to protect share codes from brute-force lookup attacks
export const shareLookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 100, // Limit each IP to 100 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many lookup requests from this IP. Please try again later.',
    },
  },
});

// Configure temporary staging directory for Multer
const stagingDir = path.resolve(process.cwd(), './tmp/sendtemp-staging');
if (!fs.existsSync(stagingDir)) {
  fs.mkdirSync(stagingDir, { recursive: true });
}

// Compute max file size in bytes from validated env
const maxFileSizeBytes = env.MAX_FILE_SIZE_MB * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, stagingDir);
  },
  filename: (_req, _file, cb) => {
    // Stage with isolated random temporary names
    cb(null, `staging-${crypto.randomUUID()}`);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: maxFileSizeBytes,
  },
});

// Zod schema for upload payload validation
const createShareSchema = z.object({
  mode: z.enum(['SINGLE', 'MULTI'], {
    errorMap: () => ({ message: "Mode must be either 'SINGLE' or 'MULTI'" }),
  }),
  ttlMinutes: z.coerce
    .number({ invalid_type_error: 'ttlMinutes must be a valid number' })
    .int('ttlMinutes must be an integer')
    .min(1, 'ttlMinutes must be at least 1 minute')
    .max(10080, 'ttlMinutes cannot exceed 10080 minutes (7 days)'),
});

// Helper to generate a collision-resistant 6-digit numeric share code (e.g., "482731")
async function generate6DigitShareCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = crypto.randomInt(100000, 1000000).toString();
    const existing = await prisma.share.findUnique({
      where: { shareCode: candidate },
      select: { id: true, status: true, expiresAt: true },
    });

    if (
      !existing ||
      existing.status === 'EXPIRED' ||
      existing.status === 'CONSUMED' ||
      existing.expiresAt <= new Date()
    ) {
      return candidate;
    }
  }
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * POST /api/shares
 * Upload file, validate mode & ttlMinutes, stream to storage provider, and record in DB via Prisma transaction.
 */
router.post(
  '/',
  uploadMiddleware.single('file'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const tempFilePath = req.file?.path;

    const cleanupTempFile = async () => {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          await fs.promises.unlink(tempFilePath);
        } catch {
          // Ignore temp cleanup errors
        }
      }
    };

    try {
      if (!req.file) {
        res.status(400).json({
          error: {
            code: 'NO_FILE_UPLOADED',
            message: "A file payload is required under form field name 'file'",
          },
        });
        return;
      }

      // Validate body parameters
      const validationResult = createShareSchema.safeParse(req.body);
      if (!validationResult.success) {
        await cleanupTempFile();
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid share parameters',
            details: validationResult.error.flatten(),
          },
        });
        return;
      }

      const { mode, ttlMinutes } = validationResult.data;

      // Generate 6-digit purely numeric secure shareCode
      const shareCode = await generate6DigitShareCode();

      // Generate cryptographically secure UUID for physical storage key (never raw user filename)
      const storageKey = crypto.randomUUID();

      // Stream file to local storage provider
      const readStream = fs.createReadStream(req.file.path);
      await defaultStorageProvider.save(readStream, storageKey);

      // Clean up temporary staging file immediately after successful write to storage provider
      await cleanupTempFile();

      // Calculate expiration timestamp
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

      // Sanitize original filename (strip path tokens)
      const sanitizedOriginalName = path.basename(req.file.originalname) || 'file.bin';

      // Persist File metadata and create Share atomically in a Prisma transaction
      const { fileRecord, shareRecord } = await prisma.$transaction(async (tx) => {
        const file = await tx.file.create({
          data: {
            originalName: sanitizedOriginalName,
            mimeType: req.file!.mimetype || 'application/octet-stream',
            sizeBytes: BigInt(req.file!.size),
            storageKey: storageKey,
          },
        });

        const share = await tx.share.create({
          data: {
            fileId: file.id,
            shareCode: shareCode,
            mode: mode,
            status: 'ACTIVE',
            expiresAt: expiresAt,
          },
        });

        return { fileRecord: file, shareRecord: share };
      });

      res.status(201).json({
        shareCode: shareRecord.shareCode,
        mode: shareRecord.mode,
        expiresAt: shareRecord.expiresAt.toISOString(),
        file: {
          name: fileRecord.originalName,
          sizeBytes: Number(fileRecord.sizeBytes),
          mimeType: fileRecord.mimeType,
        },
        downloadUrl: `/api/shares/${shareRecord.shareCode}/download`,
      });
    } catch (error: any) {
      await cleanupTempFile();
      next(error);
    }
  }
);

/**
 * GET /api/shares/:code
 * Return file metadata for download preview without consuming single-claim shares.
 */
router.get('/:code', shareLookupLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawCode = req.params.code as string;
    const cleanDigits = rawCode.replace(/\D/g, '');
    const code = cleanDigits.length === 6 ? cleanDigits : rawCode;

    const share = await prisma.share.findFirst({
      where: {
        OR: [
          { shareCode: code },
          { shareCode: rawCode },
          { shareCode: cleanDigits },
        ],
      },
      include: { file: true },
    });

    if (!share) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Share code not found.',
        },
      });
      return;
    }

    // Check expiration or consumed state
    const isExpired = new Date() > share.expiresAt;
    if (share.status !== 'ACTIVE' || isExpired) {
      res.status(410).json({
        error: {
          code: 'SHARE_INACTIVE',
          message: 'This share link has expired or has already been consumed.',
        },
      });
      return;
    }

    res.status(200).json({
      shareCode: share.shareCode,
      mode: share.mode,
      status: share.status,
      expiresAt: share.expiresAt.toISOString(),
      file: {
        name: share.file.originalName,
        sizeBytes: Number(share.file.sizeBytes),
        mimeType: share.file.mimeType,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/shares/:code/download
 * Stream file with support for full downloads and HTTP Range requests (206 Partial Content).
 * Complies with RFC 7233 byte-range specifications.
 * Atomically marks SINGLE mode shares as CONSUMED.
 */
router.get('/:code/download', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawCode = req.params.code as string;
    const cleanDigits = rawCode.replace(/\D/g, '');
    const code = cleanDigits.length === 6 ? cleanDigits : rawCode;

    const share = await prisma.share.findFirst({
      where: {
        OR: [
          { shareCode: code },
          { shareCode: rawCode },
          { shareCode: cleanDigits },
        ],
      },
      include: { file: true },
    });

    if (!share) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Share code not found.',
        },
      });
      return;
    }

    const isExpired = new Date() > share.expiresAt;
    if (share.status !== 'ACTIVE' || isExpired) {
      res.status(410).json({
        error: {
          code: 'SHARE_INACTIVE',
          message: 'This share link has expired or has already been consumed.',
        },
      });
      return;
    }

    // Atomic claim transaction for SINGLE mode
    if (share.mode === 'SINGLE') {
      const updateResult = await prisma.share.updateMany({
        where: {
          id: share.id,
          status: 'ACTIVE',
          expiresAt: { gt: new Date() },
        },
        data: {
          status: 'CONSUMED',
        },
      });

      if (updateResult.count === 0) {
        res.status(410).json({
          error: {
            code: 'ALREADY_CONSUMED',
            message: 'This single-use share has already been claimed by another client.',
          },
        });
        return;
      }
    }

    const totalSize = Number(share.file.sizeBytes);

    // Set standard download headers
    res.setHeader('Content-Type', share.file.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(share.file.originalName)}"`
    );
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    // Parse and validate Range header per RFC 7233
    const rangeResult = parseRangeHeader(req.headers.range, totalSize);

    if (rangeResult.type === 'INVALID') {
      // RFC 7233: 416 Range Not Satisfiable
      res.status(416);
      res.setHeader('Content-Range', `bytes */${totalSize}`);
      res.end();
      return;
    }

    if (rangeResult.type === 'VALID') {
      // 206 Partial Content
      const { start, end, contentLength } = rangeResult.range;
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
      res.setHeader('Content-Length', contentLength);

      const stream = await defaultStorageProvider.getStream(share.file.storageKey, start, end);
      stream.pipe(res);
    } else {
      // 200 OK Full Content
      res.status(200);
      res.setHeader('Content-Length', totalSize);

      const stream = await defaultStorageProvider.getStream(share.file.storageKey);
      stream.pipe(res);
    }

    // If SINGLE mode, clean up disk storage once stream completes
    if (share.mode === 'SINGLE') {
      res.on('finish', async () => {
        try {
          await defaultStorageProvider.delete(share.file.storageKey);
        } catch (err) {
          console.error(`[Storage Cleanup Error]: failed to delete ${share.file.storageKey}`, err);
        }
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/shares/:code
 * Invalidate share and remove physical file from storage.
 */
router.delete('/:code', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawCode = req.params.code as string;
    const cleanDigits = rawCode.replace(/\D/g, '');
    const code = cleanDigits.length === 6 ? cleanDigits : rawCode;

    const share = await prisma.share.findFirst({
      where: {
        OR: [
          { shareCode: code },
          { shareCode: rawCode },
          { shareCode: cleanDigits },
        ],
      },
      include: { file: true },
    });

    if (!share) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Share code not found.',
        },
      });
      return;
    }

    // Delete record (cascade deletes share)
    await prisma.file.delete({
      where: { id: share.fileId },
    });

    // Delete physical file
    await defaultStorageProvider.delete(share.file.storageKey);

    res.status(200).json({
      success: true,
      message: 'Share invalidated and associated file removed successfully.',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
