import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z
  .object({
    PORT: z.coerce.number().int().positive().default(8080),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
    STORAGE_PATH: z.string().default('./tmp/sendtemp-storage'),
    MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(100),
    CORS_ORIGIN: z.string().default('*'),

    // S3 / Cloudflare R2 / MinIO Optional/Required Parameters
    S3_ENDPOINT: z.string().optional(),
    S3_REGION: z.string().default('auto'),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),

    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  })
  .refine(
    (data) => {
      if (data.STORAGE_PROVIDER === 's3') {
        return Boolean(data.S3_BUCKET && data.S3_ACCESS_KEY_ID && data.S3_SECRET_ACCESS_KEY);
      }
      return true;
    },
    {
      message:
        'S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY are strictly required when STORAGE_PROVIDER=s3',
      path: ['STORAGE_PROVIDER'],
    }
  );

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('[FATAL: Invalid Environment Configuration]');
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

export const env = parsedEnv.data;
export type EnvConfig = typeof env;
