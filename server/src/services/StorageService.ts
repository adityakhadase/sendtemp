import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { env } from '../config/env';

export interface StorageProvider {
  /**
   * Saves a readable stream into storage under the provided identifier.
   * Uses streaming pipelines to ensure constant-memory writing.
   */
  save(stream: NodeJS.ReadableStream, id: string): Promise<{ bytesWritten: number; storageKey: string }>;

  /**
   * Retrieves a readable stream for the specified stored file, supporting byte slicing.
   */
  getStream(id: string, start?: number, end?: number): Promise<NodeJS.ReadableStream>;

  /**
   * Deletes the stored file idempotently.
   */
  delete(id: string): Promise<void>;
}

export class LocalDiskStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor(customBasePath?: string) {
    const rawPath = customBasePath || env.STORAGE_PATH || './tmp/sendtemp-storage';
    this.baseDir = path.resolve(process.cwd(), rawPath);
    this.ensureDirectorySync();
  }

  private ensureDirectorySync(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /**
   * Resolves and verifies that the target path stays strictly inside baseDir.
   */
  private resolveSafePath(id: string): string {
    const safeId = path.basename(id);
    const resolvedPath = path.resolve(this.baseDir, safeId);

    if (!resolvedPath.startsWith(this.baseDir)) {
      throw new Error(`Path traversal attempt detected: ${id}`);
    }

    return resolvedPath;
  }

  async save(stream: NodeJS.ReadableStream, id: string): Promise<{ bytesWritten: number; storageKey: string }> {
    await fs.promises.mkdir(this.baseDir, { recursive: true });
    const targetPath = this.resolveSafePath(id);
    const writeStream = fs.createWriteStream(targetPath, { flags: 'w' });

    let bytesWritten = 0;
    stream.on('data', (chunk: Buffer) => {
      bytesWritten += chunk.length;
    });

    await pipeline(stream as Readable, writeStream);

    return { bytesWritten, storageKey: id };
  }

  async getStream(id: string, start?: number, end?: number): Promise<NodeJS.ReadableStream> {
    const targetPath = this.resolveSafePath(id);

    try {
      await fs.promises.access(targetPath, fs.constants.R_OK);
    } catch {
      throw new Error(`File not found or unreadable: ${id}`);
    }

    const options: { start?: number; end?: number } = {};
    if (typeof start === 'number') options.start = start;
    if (typeof end === 'number') options.end = end;

    return fs.createReadStream(targetPath, options);
  }

  async delete(id: string): Promise<void> {
    const targetPath = this.resolveSafePath(id);

    try {
      await fs.promises.unlink(targetPath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  }

  getBaseDir(): string {
    return this.baseDir;
  }
}

export interface S3StorageConfig {
  endpoint?: string;
  region?: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

/**
 * Production S3StorageProvider conforming to StorageProvider.
 * Fully compatible with AWS S3, Cloudflare R2, MinIO, and other S3-compatible APIs.
 */
export class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor(config: S3StorageConfig) {
    this.bucket = config.bucket;

    const s3ClientConfig: any = {
      region: config.region || 'auto',
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    };

    if (config.endpoint) {
      s3ClientConfig.endpoint = config.endpoint;
      s3ClientConfig.forcePathStyle = true;
    }

    this.client = new S3Client(s3ClientConfig);
  }

  async save(stream: NodeJS.ReadableStream, id: string): Promise<{ bytesWritten: number; storageKey: string }> {
    let bytesWritten = 0;
    stream.on('data', (chunk: Buffer) => {
      bytesWritten += chunk.length;
    });

    const parallelUpload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: id,
        Body: stream as Readable,
      },
      // Keep small memory buffer per chunk
      queueSize: 4,
      partSize: 5 * 1024 * 1024,
      leavePartsOnError: false,
    });

    await parallelUpload.done();

    return { bytesWritten, storageKey: id };
  }

  async getStream(id: string, start?: number, end?: number): Promise<NodeJS.ReadableStream> {
    const params: { Bucket: string; Key: string; Range?: string } = {
      Bucket: this.bucket,
      Key: id,
    };

    if (typeof start === 'number' && typeof end === 'number') {
      params.Range = `bytes=${start}-${end}`;
    } else if (typeof start === 'number') {
      params.Range = `bytes=${start}-`;
    }

    const command = new GetObjectCommand(params);
    const response = await this.client.send(command);

    if (!response.Body) {
      throw new Error(`S3 Object body empty for key: ${id}`);
    }

    return response.Body as NodeJS.ReadableStream;
  }

  async delete(id: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: id,
      });
      await this.client.send(command);
    } catch (err: any) {
      if (err.name !== 'NoSuchKey' && err.name !== 'NotFound') {
        throw err;
      }
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: id,
      });
      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Initializes and selects the active storage provider according to STORAGE_PROVIDER env setting.
 */
export function createStorageProvider(): StorageProvider {
  if (env.STORAGE_PROVIDER === 's3') {
    return new S3StorageProvider({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      bucket: env.S3_BUCKET!,
      accessKeyId: env.S3_ACCESS_KEY_ID!,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
    });
  }

  return new LocalDiskStorageProvider(env.STORAGE_PATH);
}

// Export default singleton instance
export const defaultStorageProvider: StorageProvider = createStorageProvider();
