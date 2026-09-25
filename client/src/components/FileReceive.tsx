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

  // Format entered digits/characters
  const getFormattedCode = (): string => {
    return digits;
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
    const val = e.target.value.replace(/[^0-9A-Za-z]/g, '').slice(0, 6);
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
    <div className="bg-white rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-xs border border-neutral-200/80 h-full">
      <div className="flex flex-col gap-4">
        {/* Top Header Row matching Antigravity Vault design */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-neutral-200/60">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs sm:text-sm font-bold tracking-wider text-neutral-900 uppercase">
              02. RECEIVE FILE
            </span>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 font-mono text-[11px]">
            <span
              className={`px-2 py-0.5 rounded font-medium transition-all ${
                view === 'default'
                  ? 'bg-neutral-950 text-white'
                  : 'text-neutral-400'
              }`}
            >
              Enter Code
            </span>
            <span
              className={`px-2 py-0.5 rounded font-medium transition-all ${
                view === 'found'
                  ? 'bg-neutral-950 text-white'
                  : 'text-neutral-400'
              }`}
            >
              Found
            </span>
            <span
              className={`px-2 py-0.5 rounded font-medium transition-all ${
                view === 'downloading' || view === 'single-used'
                  ? 'bg-neutral-950 text-white'
                  : 'text-neutral-400'
              }`}
            >
              Ready ✓
            </span>
          </div>
        </div>

        {/* RECEIVE STATE 1: DEFAULT (ENTER 6-DIGIT CODE) */}
        {view === 'default' && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="font-mono text-base font-bold text-neutral-950">
                Have a sharing code?
              </p>
              <p className="font-sans text-xs text-neutral-500 mt-0.5">
                Enter the 6-character key generated by the sender.
              </p>
            </div>

            {/* Stylized Code Input Area formatted as # — — — — — — */}
            <div className="flex flex-col gap-3">
              <div className="relative flex items-center">
                <span className="absolute left-4 font-mono text-lg text-neutral-400 select-none font-bold">
                  #
                </span>

                <input
                  type="text"
                  inputMode="numeric"
                  value={getFormattedCode()}
                  onChange={handleInputChange}
                  onKeyDown={(e) => e.key === 'Enter' && lookupCode()}
                  placeholder="— — — — — —"
                  maxLength={6}
                  className="w-full bg-white py-3.5 pl-10 pr-12 rounded-lg font-mono text-xl sm:text-2xl text-center tracking-widest text-neutral-950 placeholder:text-neutral-300 focus:outline-none focus:border-neutral-400 transition-all border border-neutral-200 shadow-2xs"
                />

                {digits.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCode}
                    className="absolute right-3 p-1 rounded hover:bg-neutral-200 text-neutral-400 hover:text-neutral-900 transition-colors"
                    title="Clear characters"
                  >
                    <span className="material-symbols-outlined text-[18px]">backspace</span>
                  </button>
                )}
              </div>

              {/* Receive File Action Button */}
              <button
                type="button"
                onClick={() => lookupCode()}
                disabled={loading || digits.length < 6}
                className="w-full py-3 px-4 rounded-lg bg-neutral-950 hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-mono text-sm font-semibold flex items-center justify-center gap-2 transition-transform active:scale-[0.99] shadow-sm"
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

              {/* Clean transmission note without outline box */}
              <div className="flex items-center justify-center gap-2 text-xs font-mono text-neutral-500 py-1 mt-0.5">
                <span className="material-symbols-outlined text-[16px] text-neutral-400">shield</span>
                <span>Encrypted, peer-buffered temporary transmission</span>
              </div>
            </div>
          </div>
        )}

        {/* RECEIVE STATE 2: FILE FOUND (PREVIEW CARD) */}
        {view === 'found' && metadata && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-base font-bold text-neutral-950 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-emerald-600 text-[18px]">
                    verified
                  </span>
                  File ready
                </p>
                <p className="font-sans text-xs text-neutral-500 mt-0.5">
                  Encrypted payload validated and ready for transfer.
                </p>
              </div>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-white border border-neutral-200 text-neutral-700 font-medium">
                SHA-256 Validated
              </span>
            </div>

            {/* File Details Card */}
            <div className="p-4 bg-white rounded-lg flex flex-col gap-3 border border-neutral-200 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-center text-neutral-900 shadow-2xs shrink-0">
                  <span className="material-symbols-outlined text-[22px]">description</span>
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-neutral-950 truncate">
                    {metadata.file.name}
                  </p>
                  <p className="font-mono text-xs text-neutral-500">
                    {metadata.file.mimeType} • {formatFileSize(metadata.file.sizeBytes)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 font-mono text-xs text-neutral-500 border-t border-neutral-200/70">
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
              className="w-full py-3 px-4 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-white font-mono text-sm font-semibold flex items-center justify-center gap-2 transition-transform active:scale-[0.99] shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Download File</span>
            </button>

            <button
              type="button"
              onClick={resetToDefault}
              className="py-1 text-neutral-500 hover:text-neutral-950 font-mono text-xs flex items-center justify-center gap-1 transition-colors"
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
                <p className="font-mono text-base font-bold text-neutral-950 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Streaming download...
                </p>
                <span className="font-mono text-xs text-neutral-500">Streaming buffer</span>
              </div>
              <p className="font-mono text-xs text-neutral-500 mt-0.5 truncate">
                {metadata.file.name}
              </p>
            </div>

            {/* Download Meter */}
            <div className="p-4 bg-white rounded-lg flex flex-col gap-2.5 border border-neutral-200 shadow-2xs">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-neutral-950 font-semibold">Active Stream</span>
                <span className="text-neutral-500">
                  {formatFileSize(metadata.file.sizeBytes)}
                </span>
              </div>

              <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                <div className="h-full bg-neutral-950 animate-pulse rounded-full w-full"></div>
              </div>

              <div className="flex items-center justify-between pt-1 font-mono text-[11px] text-neutral-500">
                <span>Direct RFC 7233 byte-stream</span>
                <span>Zero full-memory buffering</span>
              </div>
            </div>

            <button
              type="button"
              onClick={resetToDefault}
              className="w-full py-2.5 rounded-lg bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-900 font-mono text-xs font-semibold transition-colors flex items-center justify-center gap-1"
            >
              <span>Done / Receive Another File</span>
            </button>
          </div>
        )}

        {/* RECEIVE STATE 4: EXPIRED CODE (HTTP 410) */}
        {view === 'expired' && (
          <div className="flex flex-col gap-3 text-center py-6">
            <div className="w-12 h-12 mx-auto rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600">
              <span className="material-symbols-outlined text-[24px]">event_busy</span>
            </div>
            <div>
              <p className="font-mono text-base font-bold text-neutral-950">File expired</p>
              <p className="font-sans text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
                This temporary file is no longer available. RAM storage has been automatically
                cleaned.
              </p>
            </div>
            <div className="inline-flex mx-auto px-3 py-1 rounded bg-white font-mono text-[11px] text-neutral-600 border border-neutral-200">
              HTTP 410 Gone • Payload Purged
            </div>
            <button
              type="button"
              onClick={resetToDefault}
              className="mt-2 w-full py-2.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-white font-mono text-xs font-semibold transition-all shadow-sm"
            >
              Receive Another File
            </button>
          </div>
        )}

        {/* RECEIVE STATE 5: INVALID CODE */}
        {view === 'invalid' && (
          <div className="flex flex-col gap-3 text-center py-6">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-50 flex items-center justify-center text-red-600">
              <span className="material-symbols-outlined text-[24px]">error</span>
            </div>
            <div>
              <p className="font-mono text-base font-bold text-neutral-950">
                Invalid sharing code
              </p>
              <p className="font-sans text-xs text-neutral-500 mt-1">
                Check the 6-character code with the sender and try again.
              </p>
            </div>
            <button
              type="button"
              onClick={resetToDefault}
              className="mt-2 w-full py-2.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-white font-mono text-xs font-semibold transition-all shadow-sm"
            >
              Try Again
            </button>
          </div>
        )}

        {/* RECEIVE STATE 6: SINGLE DOWNLOAD COMPLETED */}
        {view === 'single-used' && (
          <div className="flex flex-col gap-3 text-center py-6">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <span className="material-symbols-outlined text-[24px]">task_alt</span>
            </div>
            <div>
              <p className="font-mono text-base font-bold text-neutral-950">Download completed</p>
              <p className="font-sans text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
                This file was configured for one recipient and is no longer available. All traces
                wiped.
              </p>
            </div>
            <button
              type="button"
              onClick={resetToDefault}
              className="mt-2 w-full py-2.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-white font-mono text-xs font-semibold transition-all shadow-sm"
            >
              Receive Another File
            </button>
          </div>
        )}
      </div>

      {/* Footer metadata */}
      <div className="pt-4 mt-6 border-t border-neutral-200/70 flex items-center justify-between text-neutral-400 font-mono text-[11px]">
        <span>sendTemp Protocol Stream</span>
        <span>Zero-trace egress</span>
      </div>
    </div>
  );
};
