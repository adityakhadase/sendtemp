import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface FileMetadata {
  shareCode: string;
  mode: 'SINGLE' | 'MULTI';
  status: 'ACTIVE' | 'IN_PROGRESS' | 'CONSUMED' | 'EXPIRED';
  expiresAt: string;
  file: {
    name: string;
    sizeBytes: number;
    mimeType: string;
  };
}

export const FileReceive: React.FC = () => {
  const [inputCode, setInputCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isClaimedOrExpired, setIsClaimedOrExpired] = useState<boolean>(false);
  const [downloadTriggered, setDownloadTriggered] = useState<boolean>(false);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

  // Check URL hash for direct code navigation (e.g. #receive/ABC123xyz789)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const match = hash.match(/#receive\/([A-Za-z0-9_-]+)/);
      if (match && match[1]) {
        setInputCode(match[1]);
        lookupCode(match[1]);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const lookupCode = async (codeToLookup?: string) => {
    const code = (codeToLookup || inputCode).trim();
    if (!code) {
      setErrorMessage('Please enter a valid share code.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setMetadata(null);
    setIsClaimedOrExpired(false);
    setDownloadTriggered(false);

    try {
      const response = await axios.get<FileMetadata>(`${apiBaseUrl}/shares/${encodeURIComponent(code)}`);
      setMetadata(response.data);
    } catch (err: any) {
      console.error('Metadata lookup failed:', err);
      if (err.response?.status === 410) {
        setIsClaimedOrExpired(true);
        setErrorMessage('This file has expired or was already claimed.');
      } else if (err.response?.status === 404) {
        setErrorMessage('Invalid share code. No active share found.');
      } else {
        setErrorMessage(err.response?.data?.error?.message || 'Failed to locate share.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!metadata) return;

    const downloadUrl = `${apiBaseUrl}/shares/${encodeURIComponent(metadata.shareCode)}/download`;
    setDownloadTriggered(true);

    // Trigger download stream in browser
    window.location.href = downloadUrl;

    // If single mode, update metadata status indicator after short delay
    if (metadata.mode === 'SINGLE') {
      setTimeout(() => {
        setIsClaimedOrExpired(true);
      }, 1500);
    }
  };

  const resetReceive = () => {
    setInputCode('');
    setMetadata(null);
    setErrorMessage(null);
    setIsClaimedOrExpired(false);
    setDownloadTriggered(false);
    if (window.location.hash.startsWith('#receive')) {
      window.location.hash = '';
    }
  };

  return (
    <div className="w-full bg-surface-container-low rounded-xl p-4 sm:p-6 shadow-xl border border-outline-variant/30 flex flex-col gap-4">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-secondary"></span>
          <h2 className="font-mono text-sm sm:text-base text-primary uppercase tracking-wider font-semibold">
            02. Receive File
          </h2>
        </div>
        <span className="font-mono text-xs bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded">
          Instant Stream
        </span>
      </div>

      {/* Code Input Section */}
      <div className="flex flex-col gap-3">
        <div className="relative w-full">
          <input
            type="text"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.trim())}
            onKeyDown={(e) => e.key === 'Enter' && lookupCode()}
            placeholder="Enter 12-char code"
            maxLength={16}
            className="w-full h-11 bg-surface-container-lowest text-primary text-center font-mono text-base tracking-widest rounded-lg border border-outline-variant/40 focus:border-primary/60 focus:bg-surface-container-highest px-4 transition-colors placeholder:text-outline-variant focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={() => lookupCode()}
          disabled={loading || !inputCode}
          className="w-full h-11 rounded-lg bg-surface-container-highest hover:bg-primary hover:text-on-primary text-primary font-mono text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
              <span>Locating Share...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-lg">cloud_download</span>
              <span>Find File</span>
            </>
          )}
        </button>
      </div>

      {/* Error / Alert Display */}
      {errorMessage && (
        <div className="p-3 bg-error-container/40 border border-error/50 rounded-lg text-error text-xs font-mono flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">warning</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* STATE: FILE PREVIEW CARD */}
      {metadata && !isClaimedOrExpired && (
        <div className="bg-surface-container p-4 rounded-xl flex flex-col gap-3 border border-outline-variant/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded bg-surface-container-high flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-xl">inventory_2</span>
              </div>
              <div className="min-w-0 flex flex-col">
                <span className="font-sans text-sm text-primary truncate font-semibold">
                  {metadata.file.name}
                </span>
                <span className="font-mono text-xs text-on-surface-variant">
                  {formatFileSize(metadata.file.sizeBytes)} • {metadata.file.mimeType}
                </span>
              </div>
            </div>
            <span className="font-mono text-xs bg-surface-container-high text-primary px-2 py-0.5 rounded shrink-0">
              {metadata.mode === 'SINGLE' ? 'Single Claim' : 'Multi Access'}
            </span>
          </div>

          <div className="p-2.5 bg-surface-container-lowest rounded font-mono text-[11px] text-on-surface-variant flex items-center justify-between border border-outline-variant/30">
            <span>Expires: {new Date(metadata.expiresAt).toLocaleTimeString()}</span>
            <span className="text-primary font-medium">Ready to Stream</span>
          </div>

          <button
            type="button"
            onClick={handleDownload}
            className="w-full h-11 rounded-lg bg-primary hover:opacity-90 text-on-primary font-mono text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.99] transition-all shadow-md mt-1"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            <span>{downloadTriggered ? 'Downloading File...' : 'Download File'}</span>
          </button>
        </div>
      )}

      {/* STATE: CLAIMED OR EXPIRED */}
      {isClaimedOrExpired && (
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/40 flex flex-col items-center justify-center gap-2 text-center">
          <span className="material-symbols-outlined text-3xl text-outline-variant">lock</span>
          <span className="font-mono text-sm text-primary font-semibold">
            File Claimed or Expired
          </span>
          <p className="font-sans text-xs text-on-surface-variant max-w-xs">
            This transfer was configured for single-use consumption or has reached its retention deadline.
          </p>
          <button
            type="button"
            onClick={resetReceive}
            className="mt-2 px-4 py-2 rounded bg-surface-container-high text-primary font-mono text-xs hover:bg-surface-bright transition-all"
          >
            Receive Another File
          </button>
        </div>
      )}
    </div>
  );
};
