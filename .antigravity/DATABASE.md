# SendTemp - Database Architecture & Schema Specification

**Role:** Senior Software Architect  
**Project:** SendTemp (Ephemeral, Secure File Sharing Service)  
**Database Engine:** PostgreSQL (15+)  
**ORM:** Prisma  

---

## 1. Schema Overview

The SendTemp database maintains separation between the physical file asset metadata (`File`) and the ephemeral access token/sharing lifecycle (`Share`). This separation allows clean auditing, flexible multi-share associations if needed in future extensions, and unambiguous ownership of storage identifiers.

---

## 2. Prisma Schema Definition

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum ShareMode {
  SINGLE // Single-recipient claim (burn-after-reading)
  MULTI  // Multiple downloads permitted until expiration
}

enum ShareStatus {
  ACTIVE   // Available for download
  CLAIMED  // Downloaded and consumed (SINGLE mode)
  EXPIRED  // Exceeded ttl/expiresAt timestamp
  REVOKED  // Manually deleted/invalidated by owner or admin
}

model File {
  id           String   @id @default(uuid()) @db.Uuid
  originalName String   @db.VarChar(255)
  mimeType     String   @default("application/octet-stream") @db.VarChar(127)
  sizeBytes    BigInt
  storageKey   String   @unique @db.VarChar(255)
  createdAt    DateTime @default(now()) @db.Timestamptz(6)

  shares       Share[]

  @@map("files")
}

model Share {
  id         String      @id @default(uuid()) @db.Uuid
  fileId     String      @db.Uuid
  shareCode  String      @unique @db.VarChar(64)
  mode       ShareMode   @default(SINGLE)
  status     ShareStatus @default(ACTIVE)
  expiresAt  DateTime    @db.Timestamptz(6)
  claimedAt  DateTime?   @db.Timestamptz(6)
  createdAt  DateTime    @default(now()) @db.Timestamptz(6)
  updatedAt  DateTime    @updatedAt @db.Timestamptz(6)

  file       File        @relation(fields: [fileId], references: [id], onDelete: Cascade)

  @@index([shareCode])
  @@index([status, expiresAt])
  @@map("shares")
}
```

---

## 3. Entity Definitions & Field Rules

### 3.1 `File` Entity
Represents the stored binary object.

| Field | Type | Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key, Default UUID | Internal primary identifier for relational joins. |
| `originalName` | `VarChar(255)` | Non-null | Original user filename, sanitized of malicious characters and path traversal tokens. |
| `mimeType` | `VarChar(127)` | Non-null | Detected or provided MIME type (defaults to `application/octet-stream`). |
| `sizeBytes` | `BigInt` | Non-null | Exact byte length of the file on disk/storage. |
| `storageKey` | `VarChar(255)` | Unique, Non-null | Randomly generated UUID/key representing the path in `IStorageProvider`. **Never user-derived.** |
| `createdAt` | `Timestamptz` | Default `NOW()` | Record creation timestamp. |

### 3.2 `Share` Entity
Controls access rules, expiration, and consumption status.

| Field | Type | Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key, Default UUID | Internal share identifier. |
| `fileId` | `UUID` | Foreign Key (`File.id`) | Foreign key linking share to payload. Cascade delete cleans up shares when file record is removed. |
| `shareCode` | `VarChar(64)` | Unique, Indexed | Cryptographically random, URL-safe code used in API routes. |
| `mode` | `ShareMode` | Enum: `SINGLE`, `MULTI` | Operational mode (`SINGLE` burns after 1 download). |
| `status` | `ShareStatus`| Enum: `ACTIVE`, `CLAIMED`, `EXPIRED`, `REVOKED` | Lifecycle status of the share link. |
| `expiresAt` | `Timestamptz` | Indexed, Non-null | Cut-off timestamp calculated as `createdAt + ttlMinutes`. |
| `claimedAt` | `Timestamptz` | Nullable | Exact timestamp when download commenced for `SINGLE` mode shares. |
| `createdAt` | `Timestamptz` | Default `NOW()` | Generation timestamp. |
| `updatedAt` | `Timestamptz` | Auto-update | Last modification timestamp. |

---

## 4. Indexing & Concurrency Constraints

### 4.1 Lookup Optimization
- **`shareCode` Index:** Unique B-tree index on `shares(shareCode)` ensures $O(\log N)$ or instantaneous lookups for `/api/shares/:code` and `/api/shares/:code/download`.

### 4.2 Automated Cleanup Sweeper Index
- **Composite Index `(status, expiresAt)`:** Allows the background expiration worker to perform high-speed index range scans to find expired records:
  ```sql
  SELECT s.id, f."storageKey" 
  FROM shares s
  JOIN files f ON s."fileId" = f.id
  WHERE s.status = 'ACTIVE' AND s."expiresAt" <= NOW();
  ```

### 4.3 Atomic Single-Recipient Claim Execution
To prevent race conditions where two simultaneous downloads claim a `SINGLE` mode share:
- Use an atomic conditional write:
  ```typescript
  const claimedShare = await prisma.share.updateMany({
    where: {
      shareCode: code,
      mode: 'SINGLE',
      status: 'ACTIVE',
      expiresAt: { gt: new Date() }
    },
    data: {
      status: 'CLAIMED',
      claimedAt: new Date()
    }
  });

  if (claimedShare.count === 0) {
    throw new GoneException('Share has already been claimed or expired');
  }
  ```
- This ensures only one concurrent request executes the status transition, providing bulletproof claim guarantees at the database engine level.
