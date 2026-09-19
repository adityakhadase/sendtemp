# SendTemp - API Contract Specification

**Role:** Senior Software Architect  
**Project:** SendTemp (Ephemeral, Secure File Sharing Service)  
**API Version:** `v1`  
**Base Path:** `/api`  

---

## 1. Overview & General Standards

- **Protocols:** HTTPS only.
- **Content Types:** JSON (`application/json`) for metadata and standard REST transactions; `multipart/form-data` for binary uploads; binary streams (`application/octet-stream` or inferred MIME) for file downloads.
- **Error Response Standard:**
  All error responses adhere to the standard error envelope:
  ```json
  {
    "error": {
      "code": "STRING_IDENTIFIER",
      "message": "Human-readable description of error",
      "details": {}
    }
  }
  ```

---

## 2. Endpoints

### 2.1 Create Share & Upload File
**`POST /api/shares`**

Uploads a file to the temporary storage provider and provisions a unique shareable resource.

- **Request Headers:**
  - `Content-Type: multipart/form-data`
- **Request Body (Multipart Form Fields):**
  | Field Name | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `file` | Binary | Yes | File payload to upload. Handled via stream / disk staging. |
  | `mode` | String | Yes | Share claim mode: `'SINGLE'` (burn-after-reading) or `'MULTI'` (unlimited downloads within TTL). |
  | `ttlMinutes` | Integer | Yes | Time-to-live in minutes (Min: `1`, Max: `10080` [7 days]). |

- **Success Response:** `201 Created`
  ```json
  {
    "shareCode": "k9XyZ12aB",
    "mode": "SINGLE",
    "expiresAt": "2026-09-18T23:21:00.000Z",
    "file": {
      "name": "financial_report_q3.pdf",
      "sizeBytes": 2459120,
      "mimeType": "application/pdf"
    },
    "downloadUrl": "/api/shares/k9XyZ12aB/download"
  }
  ```

- **Error Responses:**
  - `400 Bad Request`: Missing file, invalid mode, or `ttlMinutes` outside acceptable range.
  - `413 Payload Too Large`: File exceeds server upload limits.
  - `500 Internal Server Error`: Storage write or database transaction failure.

---

### 2.2 Get Share Metadata (Download Preview)
**`GET /api/shares/:code`**

Fetches metadata for a share to render the download preview landing page without triggering the download or consuming single-claim shares.

- **URL Parameters:**
  - `code` (string, required): The unique alphanumeric share code.
- **Success Response:** `200 OK`
  ```json
  {
    "shareCode": "k9XyZ12aB",
    "mode": "SINGLE",
    "status": "ACTIVE",
    "expiresAt": "2026-09-18T23:21:00.000Z",
    "file": {
      "name": "financial_report_q3.pdf",
      "sizeBytes": 2459120,
      "mimeType": "application/pdf"
    }
  }
  ```

- **Error Responses:**
  - `404 Not Found`: Share code does not exist.
  - `410 Gone`: Share has expired or has already been claimed (in `SINGLE` mode).

---

### 2.3 Download File (Full Stream & HTTP Range Support)
**`GET /api/shares/:code/download`**

Streams the underlying file to the client. Fully supports full downloads (`200 OK`) and chunked/resumable downloads via HTTP Range Requests (`206 Partial Content`).

- **URL Parameters:**
  - `code` (string, required): The unique alphanumeric share code.

- **Request Headers (Optional for Range Requests):**
  - `Range: bytes=start-end` (e.g., `Range: bytes=0-1048575` or `Range: bytes=1048576-`)

- **Single Mode Claim Semantics:**
  - If `mode === 'SINGLE'`, this endpoint atomically marks the share as `CLAIMED` before opening the stream.
  - Subsequent calls will immediately receive `410 Gone`.

- **Success Response (Full Download - No Range Requested):**
  - **Status:** `200 OK`
  - **Headers:**
    ```http
    Content-Type: application/pdf
    Content-Length: 2459120
    Content-Disposition: attachment; filename="financial_report_q3.pdf"
    Accept-Ranges: bytes
    Cache-Control: no-store, no-cache, must-revalidate, private
    ```
  - **Body:** Binary stream (`stream.pipeline(storageStream, res)`).

- **Success Response (Partial Download - Range Requested):**
  - **Status:** `206 Partial Content`
  - **Headers:**
    ```http
    Content-Type: application/pdf
    Content-Range: bytes 0-1048575/2459120
    Content-Length: 1048576
    Content-Disposition: attachment; filename="financial_report_q3.pdf"
    Accept-Ranges: bytes
    ```
  - **Body:** Sliced binary chunk stream.

- **Error Responses:**
  - `404 Not Found`: Share code not found.
  - `410 Gone`: Share expired or previously claimed.
  - `416 Range Not Satisfiable`: Requested byte range is outside the file size boundary (`Content-Range: bytes */2459120`).

---

### 2.4 Invalidate Share & Remove Physical File
**`DELETE /api/shares/:code`**

Explicitly invalidates an active share prior to its TTL expiration and triggers immediate physical removal of the file from the storage provider.

- **URL Parameters:**
  - `code` (string, required): The unique alphanumeric share code.
- **Success Response:** `200 OK` (or `204 No Content`)
  ```json
  {
    "success": true,
    "message": "Share invalidated and associated file removed successfully."
  }
  ```

- **Error Responses:**
  - `404 Not Found`: Share code does not exist.
  - `500 Internal Server Error`: Failed to remove disk asset or update database record.
