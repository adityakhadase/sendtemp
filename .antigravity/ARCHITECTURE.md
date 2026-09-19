# SendTemp - System Architecture Specification

**Role:** Senior Software Architect  
**Project:** SendTemp (Ephemeral, Secure File Sharing Service)  
**Status:** Canonical Reference Document  

---

## 1. Executive Summary

SendTemp is a high-performance, secure, ephemeral file-sharing platform designed for frictionless point-to-point and broadcast temporary transfers. The system emphasizes zero data retention beyond designated TTLs, stream-based I/O to guarantee minimal server memory footprints, and strictly atomic claims for single-recipient deliveries.

---

## 2. Core Technology Stack

| Layer | Technology | Rationale & Architectural Decisions |
| :--- | :--- | :--- |
| **Runtime** | Node.js (LTS v20+) | Event-driven, non-blocking I/O optimized for streaming file transfers and concurrent network connections. |
| **Language** | TypeScript (v5+) | Strict type safety (`strict: true`, `noImplicitAny`), contract adherence, and domain-driven design modeling. |
| **HTTP Framework** | Express.js | Mature, lightweight HTTP routing with deep support for standard Node.js `Readable` / `Writable` streams. |
| **Database** | PostgreSQL (15+) | ACID-compliant relational persistence with robust support for transactional row locking (`SELECT FOR UPDATE`) and temporal queries. |
| **ORM / Data Access**| Prisma ORM | Type-safe migrations, auto-generated TypeScript clients, transaction APIs (`$transaction`), and declarative schema management. |
| **Storage Layer** | `IStorageProvider` Abstraction | Decoupled storage interface. Default implementation: `LocalDiskStorageProvider`. Interface design enables drop-in cloud providers (S3/GCS/MinIO) without domain logic refactoring. |

---

## 3. Non-Negotiable Architectural Rules

### 3.1 Stream Pipeline & Memory Safety (Zero Full-File Buffering)
- **Hard Constraint:** Under no circumstances should incoming or outgoing file streams be buffered completely into memory (`Buffer.from()`, `fs.readFileSync()`, or unbounded memory storage).
- **Upload Ingestion:**
  - File uploads must use streaming or Multer configured with disk storage (`multer.diskStorage` into a secure staging directory) with strict `limits: { fileSize: MAX_BYTES }`.
  - Staged files are moved or streamed to target storage keys.
- **Download & Egress:**
  - File reads must be piped directly from storage to the HTTP response (`res`) using `stream.pipeline` (or `stream/promises.pipeline`).
  - Native stream pipelines guarantee proper backpressure handling, error propagation, automatic resource cleanup, and prevention of file descriptor leakage on client aborts (`res.on('close')`).

### 3.2 Concurrency & Atomic Single-Recipient Claims
- **Hard Constraint:** A share configured with mode `SINGLE` must be claimed and downloaded by at most one consumer, even under high-concurrency race conditions (e.g., simultaneous HTTP GET requests).
- **Atomic State Transition:**
  - Download eligibility checks and status updates must execute within an isolated database transaction.
  - Transactions must leverage conditional atomic updates:
    ```sql
    UPDATE "Share"
    SET "status" = 'CLAIMED', "claimedAt" = NOW()
    WHERE "shareCode" = $1 AND "status" = 'ACTIVE' AND "expiresAt" > NOW()
    RETURNING *;
    ```
  - If zero rows are returned or state check fails, the download must immediately abort with `410 Gone` or `404 Not Found` before any stream is initiated.
  - Physical file deletion should follow successful completion of the single-claim stream or be flagged for immediate asynchronous garbage collection.

### 3.3 Storage Security & Identifier Isolation
- **Hard Constraint:** Storage keys must never use or be derived from user-provided filenames.
- **UUID Allocation:**
  - Every stored payload is assigned a cryptographically random UUID v4 / v7 identifier (e.g., `storageKey = crypto.randomUUID()`).
  - The physical path on disk is decoupled from logical references: `storage/<hash-prefix>/<uuid>`.
- **Filename Sanitization:**
  - Original filenames (`originalName`) are stored as passive metadata in PostgreSQL after strict sanitization (stripping control chars, path traversal tokens like `../`, and non-printable sequences).
  - Filenames are exposed back to clients only via RFC 5987 / RFC 6266 formatted `Content-Disposition: attachment; filename="..."` headers.

---

## 4. Storage Provider Abstraction (`IStorageProvider`)

To ensure clean boundaries between business logic and the underlying file system, all I/O must adhere to the `IStorageProvider` contract:

```typescript
export interface StorageStreamOptions {
  start?: number;
  end?: number;
}

export interface IStorageProvider {
  /**
   * Writes a readable stream to the storage target.
   * Resolves when stream finishes writing and closes.
   */
  writeStream(key: string, stream: NodeJS.ReadableStream): Promise<{ bytesWritten: number }>;

  /**
   * Reads a byte stream from storage, with optional byte range slicing.
   */
  readStream(key: string, options?: StorageStreamOptions): Promise<NodeJS.ReadableStream>;

  /**
   * Deletes a physical file identified by key. Idempotent.
   */
  delete(key: string): Promise<void>;

  /**
   * Checks if a physical object exists.
   */
  exists(key: string): Promise<boolean>;

  /**
   * Retrieves byte length of stored asset.
   */
  getSize(key: string): Promise<number>;
}
```

### `LocalDiskStorageProvider`
- Resolves file keys within a dedicated base directory (e.g., `process.env.STORAGE_PATH` or `/var/data/sendtemp`).
- Implements strict path jail verification (`path.resolve` check against the base directory) to eliminate path traversal vulnerabilities.
- Handles partial chunk reads using `fs.createReadStream(filePath, { start, end })` for HTTP Range requests.

---

## 5. Lifecycle & Automated Cleanup Engine

1. **Active State:** Share is within TTL, status is `ACTIVE`.
2. **Expired State:** Reached `expiresAt` or claimed (`SINGLE` mode).
3. **Sweeper Service:**
   - A scheduled background worker (or cron daemon) queries:
     ```sql
     SELECT * FROM "Share" WHERE "status" IN ('EXPIRED', 'CLAIMED') OR ("status" = 'ACTIVE' AND "expiresAt" < NOW());
     ```
   - Invokes `IStorageProvider.delete(file.storageKey)`.
   - Transitions or archives database records to avoid dangling disk files.
