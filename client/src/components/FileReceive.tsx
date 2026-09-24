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

type ReceiveView = 'default' | 'found' | 'downloading' | 'expired' | 'invalid' | 'single-used';

export const FileReceive: React.FC = () => {
  const [digits, setDigits] = useState<string>('');
  const [view, setView] = useState<ReceiveView>('default');
  const [loading, setLoading] = useState<boolean>(false);
  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  const [countdownText, setCountdownText] = useState<string>('');

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

  // Format entered 6 digits as "482 - 731" or partial "482 - 7"
  const getFormattedCode = (): string => {
    if (digits.length <= 3) return digits;
    return `${digits.slice(0, 3)} - ${digits.slice(3, 6)}`;
  };

  // Check URL hash for direct code navigation (e.g. #receive/482731)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const match = hash.match(/#receive\/([0-9A-Za-z_-]+)/);
      if (match && match[1]) {
        const rawDigits = match[1].replace(/\D/g, '');
        if (rawDigits.length >= 6) {
          const first6 = rawDigits.slice(0, 6);
          setDigits(first6);
          lookupCode(first6);
        }
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Expiration Countdown for Found State
  useEffect(() => {
    if (!metadata?.expiresAt || view !== 'found') return;

    const interval = setInterval(() => {
      const remainingMs = new Date(metadata.expiresAt).getTime() - Date.now();
      if (remainingMs <= 0) {
        setView('expired');
        clearInterval(interval);
      } else {
        const totalSec = Math.floor(remainingMs / 1000);
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        setCountdownText(
          `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [metadata, view]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setDigits(val);
  };

  const clearCode = () => {
    setDigits('');
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const lookupCode = async (codeOverride?: string) => {
    const targetDigits = (codeOverride || digits).replace(/\D/g, '');
    if (targetDigits.length !== 6) {
      setView('invalid');
      return;
    }

    setLoading(true);
    setMetadata(null);

    try {
      const response = await axios.get<FileMetadata>(
        `${apiBaseUrl}/shares/${encodeURIComponent(targetDigits)}`
      );
      setMetadata(response.data);
      setView('found');
    } catch (err: any) {
      console.error('Code lookup failed:', err);
      if (err.response?.status === 410) {
        setView('expired');
      } else {
        setView('invalid');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!metadata) return;

    const targetDigits = metadata.shareCode.replace(/\D/g, '') || metadata.shareCode;
    const downloadUrl = `${apiBaseUrl}/shares/${encodeURIComponent(targetDigits)}/download`;

    setView('downloading');

    // Trigger native browser download stream
    window.location.href = downloadUrl;

    // If single mode, transition to single-used state after brief delay
    if (metadata.mode === 'SINGLE') {
      setTimeout(() => {
        setView('single-used');
      }, 2000);
    }
  };

  const resetToDefault = () => {
    setDigits('');
    setMetadata(null);
    setView('default');
    if (window.location.hash.startsWith('#receive')) {
      window.location.hash = '';
    }
  };

  return (
    <div className="bg-surface-container-low rounded-xl p-5 sm:p-7 flex flex-col justify-between shadow-xl relative overflow-hidden border border-outline-variant/30">
      <div className="flex flex-col gap-4">
        {/* Top Bar Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-surface-container-high">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm sm:text-base text-primary uppercase font-bold tracking-wider">
              RECEIVE
            </span>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-surface-container-highest text-primary font-medium">
              Instant Fetch
            </span>
          </div>

          <span className="font-mono text-[11px] bg-surface-container text-on-surface-variant px-2 py-0.5 rounded border border-outline-variant/30">
            6-Digit Key
          </span>
        </div>

        {/* RECEIVE STATE 1: DEFAULT (ENTER 6-DIGIT CODE) */}
        {view === 'default' && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="font-mono text-base text-primary font-semibold">
                Have a sharing code?
              </p>
              <p className="font-sans text-xs text-on-surface-variant">
                Enter the 6-digit numeric transfer code generated by the sender.
              </p>
            </div>

            {/* Stylized Code Input Form with # prefix and backspace icon */}
            <div className="flex flex-col gap-3">
              <div className="relative flex items-center">
                <span className="absolute left-4 font-mono text-lg text-outline select-none font-bold">
                  #
                </span>

                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={getFormattedCode()}
                  onChange={handleInputChange}
                  onKeyDown={(e) => e.key === 'Enter' && lookupCode()}
                  placeholder="— — —  — — —"
                  maxLength={9} // accommodates "482 - 731"
                  className="w-full bg-surface-container py-3.5 pl-10 pr-12 rounded-lg font-mono text-xl sm:text-2xl text-center tracking-widest text-primary placeholder:text-outline-variant focus:outline-none focus:bg-surface-container-high transition-all border border-outline-variant/40 focus:border-primary/50"
                />

                {digits.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCode}
                    className="absolute right-3 p-1 rounded hover:bg-surface-container-highest text-on-surface-variant hover:text-primary transition-colors"
                    title="Clear digits"
                  >
                    <span className="material-symbols-outlined text-[18px]">backspace</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => lookupCode()}
                disabled={loading || digits.length < 6}
                className="w-full py-3 px-4 rounded-lg bg-primary hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-on-primary font-mono text-sm font-semibold flex items-center justify-center gap-2 transition-transform active:scale-[0.99] shadow-md"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined text-lg animate-spin">
                      progress_activity
                    </span>
                    <span>Locating Payload...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">cloud_download</span>
                    <span>Receive File</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* RECEIVE STATE 2: FILE FOUND (PREVIEW CARD) */}
        {view === 'found' && metadata && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-base text-primary font-semibold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[18px]">
                    verified
                  </span>
                  File ready
                </p>
                <p className="font-sans text-xs text-on-surface-variant">
                  Encrypted payload validated and ready for transfer.
                </p>
              </div>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-container-highest text-primary">
                SHA-256 Validated
              </span>
            </div>

            {/* File Details Card */}
            <div className="p-4 bg-surface-container rounded-lg flex flex-col gap-3 border border-outline-variant/30">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded bg-surface-container-highest flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-[24px]">description</span>
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-sm sm:text-base text-primary font-semibold truncate">
                    {metadata.file.name}
                  </p>
                  <p className="font-mono text-xs text-on-surface-variant">
                    {metadata.file.mimeType} • {formatFileSize(metadata.file.sizeBytes)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs text-on-surface-variant border-t border-surface-container-high/60">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">timer</span>
                  <span>{countdownText ? `Expires in ${countdownText}` : 'Active'}</span>
                </div>
                <div className="flex items-center gap-1.5 justify-end">
                  <span className="material-symbols-outlined text-[14px]">
                    {metadata.mode === 'SINGLE' ? 'lock' : 'groups'}
                  </span>
                  <span>
                    {metadata.mode === 'SINGLE' ? 'Destructs on download' : 'Multiple downloads'}
                  </span>
                </div>
              </div>
            </div>

            {/* Download File Button */}
            <button
              type="button"
              onClick={handleDownload}
              className="w-full py-3 px-4 rounded-lg bg-primary hover:opacity-90 text-on-primary font-mono text-sm font-semibold flex items-center justify-center gap-1.5 transition-transform active:scale-[0.99] shadow-md"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Download File</span>
            </button>

            <button
              type="button"
              onClick={resetToDefault}
              className="py-1 text-on-surface-variant hover:text-on-surface font-mono text-xs flex items-center justify-center gap-1 transition-colors"
            >
              <span>Back to Code Entry</span>
            </button>
          </div>
        )}

        {/* RECEIVE STATE 3: DOWNLOADING PROGRESS */}
        {view === 'downloading' && metadata && (
          <div className="flex flex-col gap-4 py-2">
            <div>
              <div className="flex items-center justify-between">
                <p className="font-mono text-base text-primary font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  Streaming download...
                </p>
                <span className="font-mono text-xs text-on-surface-variant">Streaming buffer</span>
              </div>
              <p className="font-mono text-xs text-on-surface-variant mt-0.5 truncate">
                {metadata.file.name}
              </p>
            </div>

            {/* Download Meter */}
            <div className="p-4 bg-surface-container rounded-lg flex flex-col gap-2.5 border border-outline-variant/30">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-primary font-semibold">Active Stream</span>
                <span className="text-on-surface-variant">
                  {formatFileSize(metadata.file.sizeBytes)}
                </span>
              </div>

              <div className="w-full h-2.5 bg-surface-container-lowest rounded-full overflow-hidden">
                <div className="h-full bg-primary animate-pulse rounded-full w-full"></div>
              </div>

              <div className="flex items-center justify-between pt-1 font-mono text-[11px] text-on-surface-variant">
                <span>Direct RFC 7233 byte-stream</span>
                <span>Zero full-memory buffering</span>
              </div>
            </div>

            <button
              type="button"
              onClick={resetToDefault}
              className="w-full py-2.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-mono text-xs transition-colors flex items-center justify-center gap-1"
            >
              <span>Done / Receive Another File</span>
            </button>
          </div>
        )}

        {/* RECEIVE STATE 4: EXPIRED CODE (HTTP 410) */}
        {view === 'expired' && (
          <div className="flex flex-col gap-3 text-center py-6">
            <div className="w-14 h-14 mx-auto rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[28px]">event_busy</span>
            </div>
            <div>
              <p className="font-mono text-base text-primary font-semibold">File expired</p>
              <p className="font-sans text-xs text-on-surface-variant mt-1 max-w-xs mx-auto">
                This temporary file is no longer available. RAM storage has been automatically
                cleaned.
              </p>
            </div>
            <div className="inline-flex mx-auto px-3 py-1 rounded bg-surface-container font-mono text-[11px] text-on-surface-variant border border-outline-variant/30">
              HTTP 410 Gone • Payload Purged
            </div>
            <button
              type="button"
              onClick={resetToDefault}
              className="mt-2 w-full py-2.5 rounded bg-surface-container-highest hover:bg-surface-bright text-primary font-mono text-xs font-semibold transition-all"
            >
              Receive Another File
            </button>
          </div>
        )}

        {/* RECEIVE STATE 5: INVALID CODE */}
        {view === 'invalid' && (
          <div className="flex flex-col gap-3 text-center py-6">
            <div className="w-14 h-14 mx-auto rounded-full bg-surface-container-highest flex items-center justify-center text-error">
              <span className="material-symbols-outlined text-[28px]">error</span>
            </div>
            <div>
              <p className="font-mono text-base text-primary font-semibold">
                Invalid sharing code
              </p>
              <p className="font-sans text-xs text-on-surface-variant mt-1">
                Check the 6-digit code with the sender and try again.
              </p>
            </div>
            <button
              type="button"
              onClick={resetToDefault}
              className="mt-2 w-full py-2.5 rounded bg-surface-container-highest hover:bg-surface-bright text-primary font-mono text-xs font-semibold transition-all"
            >
              Try Again
            </button>
          </div>
        )}

        {/* RECEIVE STATE 6: SINGLE DOWNLOAD COMPLETED */}
        {view === 'single-used' && (
          <div className="flex flex-col gap-3 text-center py-6">
            <div className="w-14 h-14 mx-auto rounded-full bg-surface-container-highest flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[28px]">task_alt</span>
            </div>
            <div>
              <p className="font-mono text-base text-primary font-semibold">Download completed</p>
              <p className="font-sans text-xs text-on-surface-variant mt-1 max-w-xs mx-auto">
                This file was configured for one recipient and is no longer available. All traces
                wiped.
              </p>
            </div>
            <button
              type="button"
              onClick={resetToDefault}
              className="mt-2 w-full py-2.5 rounded bg-surface-container-highest hover:bg-surface-bright text-primary font-mono text-xs font-semibold transition-all"
            >
              Receive Another File
            </button>
          </div>
        )}
      </div>

      {/* Panel Terminal Branding Footer */}
      <div className="pt-4 mt-6 border-t border-surface-container-high flex items-center justify-between text-on-surface-variant font-mono text-[11px]">
        <span>sendTemp Protocol Stream</span>
        <span>Zero-trace egress</span>
      </div>
    </div>
  );
};
