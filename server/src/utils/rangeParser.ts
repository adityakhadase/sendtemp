export interface ParsedRange {
  start: number;
  end: number;
  contentLength: number;
}

export type RangeParseResult =
  | { type: 'NONE' }
  | { type: 'VALID'; range: ParsedRange }
  | { type: 'INVALID' };

/**
 * Parses and validates an HTTP Range header per RFC 7233.
 *
 * Supported syntaxes:
 * - bytes=start-end (e.g. bytes=0-499)
 * - bytes=start-    (e.g. bytes=500-)
 * - bytes=-suffix   (e.g. bytes=-500)
 */
export function parseRangeHeader(rangeHeader: string | undefined, totalSize: number): RangeParseResult {
  if (!rangeHeader) {
    return { type: 'NONE' };
  }

  const trimmed = rangeHeader.trim();
  if (!trimmed.startsWith('bytes=')) {
    return { type: 'INVALID' };
  }

  const rangeSpec = trimmed.substring(6).trim();

  // Multi-range requests (comma separated) are not satisfiable for single stream
  if (rangeSpec.includes(',')) {
    return { type: 'INVALID' };
  }

  const match = /^(\d*)-(\d*)$/.exec(rangeSpec);
  if (!match) {
    return { type: 'INVALID' };
  }

  const [, rawStart, rawEnd] = match;

  if (rawStart === '' && rawEnd === '') {
    return { type: 'INVALID' };
  }

  let start: number;
  let end: number;

  if (rawStart === '') {
    // Suffix range: bytes=-500 (the last 500 bytes)
    const suffixLength = parseInt(rawEnd, 10);
    if (isNaN(suffixLength) || suffixLength <= 0) {
      return { type: 'INVALID' };
    }

    if (suffixLength >= totalSize) {
      start = 0;
      end = Math.max(0, totalSize - 1);
    } else {
      start = totalSize - suffixLength;
      end = totalSize - 1;
    }
  } else if (rawEnd === '') {
    // Open range: bytes=500- (from offset 500 to the end)
    start = parseInt(rawStart, 10);
    if (isNaN(start) || start < 0 || start >= totalSize) {
      return { type: 'INVALID' };
    }
    end = totalSize - 1;
  } else {
    // Closed range: bytes=0-499
    start = parseInt(rawStart, 10);
    end = parseInt(rawEnd, 10);

    if (isNaN(start) || isNaN(end) || start < 0 || start > end || start >= totalSize) {
      return { type: 'INVALID' };
    }

    // RFC 7233 Section 4.1: If end is >= total length, clamp to totalSize - 1
    if (end >= totalSize) {
      end = totalSize - 1;
    }
  }

  return {
    type: 'VALID',
    range: {
      start,
      end,
      contentLength: end - start + 1,
    },
  };
}
