import React, { useState, useRef } from 'react';
import axios from 'axios';

interface UploadResponse {
  shareCode: string;
  mode: 'SINGLE' | 'MULTI';
  expiresAt: string;
  file: {
    name: string;
    sizeBytes: number;
    mimeType: string;
  };
  downloadUrl: string;
}

export const FileUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'SINGLE' | 'MULTI'>('SINGLE');
  const [ttlMinutes, setTtlMinutes] = useState<number>(10);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [shareData, setShareData] = useState<UploadResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string>('Copy Code');
  const [linkCopyStatus, setLinkCopyStatus] = useState<string>('Copy Link');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setErrorMessage(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      setErrorMessage(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage('Please select a file to upload.');
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', mode);
      formData.append('ttlMinutes', ttlMinutes.toString());

      const response = await axios.post<UploadResponse>(`${apiBaseUrl}/shares`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        },
      });

      if (response.status === 201) {
        setShareData(response.data);
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
      const serverMsg = err.response?.data?.error?.message || err.message || 'Failed to upload file.';
      setErrorMessage(serverMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const copyToClipboard = (text: string, isLink = false) => {
    navigator.clipboard.writeText(text);
    if (isLink) {
      setLinkCopyStatus('Copied!');
      setTimeout(() => setLinkCopyStatus('Copy Link'), 2000);
    } else {
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus('Copy Code'), 2000);
    }
  };

  const resetFlow = () => {
    setFile(null);
    setShareData(null);
    setErrorMessage(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const shareLink = shareData
    ? `${window.location.origin}/#receive/${shareData.shareCode}`
    : '';

  return (
    <div className="w-full bg-surface-container-low rounded-xl p-4 sm:p-6 shadow-xl border border-outline-variant/30 flex flex-col gap-4">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          <h2 className="font-mono text-sm sm:text-base text-primary uppercase tracking-wider font-semibold">
            01. Send File
          </h2>
        </div>
        <span className="font-mono text-xs bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded">
          AES-256 • Ephemeral
        </span>
      </div>

      {errorMessage && (
        <div className="p-3 bg-error-container/40 border border-error/50 rounded-lg text-error text-xs font-mono flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">error</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* STATE 1: IDLE / CONFIG */}
      {!isUploading && !shareData && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Drag & Drop Zone */}
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex flex-col items-center justify-center p-6 rounded-lg bg-surface-container-lowest hover:bg-surface-container-high border-2 border-dashed border-outline-variant/50 hover:border-primary/60 transition-all cursor-pointer text-center min-h-[140px]"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-primary text-xl">upload_file</span>
              </div>
              <span className="font-sans text-sm text-primary font-medium">
                Drop file here or click to browse
              </span>
              <span className="font-mono text-[11px] text-on-surface-variant mt-1">
                Max file size: 100 MB
              </span>
            </div>
          ) : (
            /* Staged File Card */
            <div className="bg-surface-container p-3 rounded-lg flex items-center justify-between border border-outline-variant/40">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded bg-surface-container-highest flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-xl">description</span>
                </div>
                <div className="min-w-0 flex flex-col">
                  <span className="font-sans text-sm text-primary truncate font-semibold">
                    {file.name}
                  </span>
                  <span className="font-mono text-xs text-on-surface-variant">
                    {formatFileSize(file.size)} • ready to stream
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={clearFile}
                className="p-1.5 text-on-surface-variant hover:text-error transition-colors shrink-0 rounded hover:bg-surface-container-high"
                title="Remove file"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          )}

          {/* TTL Configuration */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-on-surface-variant uppercase tracking-wider">
                Time To Live (TTL)
              </span>
              <span className="font-mono text-xs text-secondary">
                {ttlMinutes >= 60 ? `${ttlMinutes / 60} Hour(s)` : `${ttlMinutes} Minutes`}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '10 min', val: 10 },
                { label: '30 min', val: 30 },
                { label: '1 hour', val: 60 },
                { label: '6 hours', val: 360 },
              ].map((item) => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => setTtlMinutes(item.val)}
                  className={`h-9 rounded font-mono text-xs font-medium transition-all flex items-center justify-center ${
                    ttlMinutes === item.val
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'bg-surface-container-high text-on-surface hover:bg-surface-bright'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Access Policy Toggle */}
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-xs text-on-surface-variant uppercase tracking-wider">
              Access Policy
            </span>
            <div className="grid grid-cols-2 gap-2 p-1 bg-surface-container-lowest rounded-lg border border-outline-variant/30">
              <button
                type="button"
                onClick={() => setMode('SINGLE')}
                className={`h-9 rounded font-mono text-xs flex items-center justify-center gap-1.5 transition-all ${
                  mode === 'SINGLE'
                    ? 'bg-surface-container-highest text-primary font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-sm">lock_person</span>
                <span>Single Person</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('MULTI')}
                className={`h-9 rounded font-mono text-xs flex items-center justify-center gap-1.5 transition-all ${
                  mode === 'MULTI'
                    ? 'bg-surface-container-highest text-primary font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-sm">group</span>
                <span>Multiple People</span>
              </button>
            </div>
            <p className="font-sans text-[11px] text-on-surface-variant px-1">
              {mode === 'SINGLE'
                ? 'File self-destructs immediately after 1st successful download.'
                : 'Unlimited downloads permitted until the TTL expiration timestamp.'}
            </p>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={!file}
            className="w-full h-11 rounded-lg bg-primary hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-on-primary font-mono text-sm font-semibold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] mt-2"
          >
            <span className="material-symbols-outlined text-lg">bolt</span>
            <span>Send File</span>
          </button>
        </form>
      )}

      {/* STATE 2: UPLOADING PROGRESS */}
      {isUploading && (
        <div className="flex flex-col gap-3 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary animate-spin text-lg">
                progress_activity
              </span>
              <span className="font-sans text-sm text-primary">Encrypting & Streaming to Storage...</span>
            </div>
            <span className="font-mono text-sm text-primary font-semibold">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <div className="p-3 bg-surface-container-lowest rounded font-mono text-xs text-on-surface-variant flex items-center gap-2 border border-outline-variant/30">
            <span className="material-symbols-outlined text-base text-primary">memory</span>
            <span>Streaming pipeline active • Zero full-file buffering</span>
          </div>
        </div>
      )}

      {/* STATE 3: READY CARD (SHARE CODE & LINK) */}
      {shareData && (
        <div className="flex flex-col gap-4 py-2">
          <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/40 flex flex-col items-center justify-center gap-2 text-center">
            <span className="font-mono text-xs text-on-surface-variant uppercase tracking-widest">
              Share this 12-Character Code
            </span>
            <div className="my-1 py-2.5 px-4 rounded-lg bg-surface-container-high w-full flex items-center justify-center border border-outline-variant/30">
              <span className="font-mono text-xl sm:text-2xl text-primary tracking-widest font-bold select-all">
                {shareData.shareCode}
              </span>
            </div>
            <div className="flex flex-col gap-1 text-on-surface-variant font-sans text-xs">
              <span className="font-medium text-primary">{shareData.file.name}</span>
              <span>
                {formatFileSize(shareData.file.sizeBytes)} • Expires:{' '}
                {new Date(shareData.expiresAt).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Generated Share Link Card */}
          <div className="bg-surface-container p-3 rounded-lg flex flex-col gap-1.5 border border-outline-variant/40">
            <span className="font-mono text-[11px] text-on-surface-variant uppercase tracking-wider">
              Direct Download URL
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareLink}
                className="flex-1 bg-surface-container-lowest px-3 py-1.5 rounded font-mono text-xs text-primary truncate border border-outline-variant/40 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(shareLink, true)}
                className="px-3 py-1.5 rounded bg-surface-container-high hover:bg-surface-bright text-primary font-mono text-xs flex items-center gap-1 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">link</span>
                <span>{linkCopyStatus}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => copyToClipboard(shareData.shareCode, false)}
              className="h-10 rounded-lg bg-primary hover:opacity-90 text-on-primary font-mono text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow"
            >
              <span className="material-symbols-outlined text-base">content_copy</span>
              <span>{copyStatus}</span>
            </button>
            <button
              type="button"
              onClick={() => copyToClipboard(shareLink, true)}
              className="h-10 rounded-lg bg-surface-container-high hover:bg-surface-bright text-primary font-mono text-xs font-medium flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-base">share</span>
              <span>Share Link</span>
            </button>
          </div>

          <button
            type="button"
            onClick={resetFlow}
            className="h-9 text-on-surface-variant hover:text-primary font-mono text-xs transition-colors flex items-center justify-center gap-1 mt-1"
          >
            <span className="material-symbols-outlined text-sm">restart_alt</span>
            <span>Send another file</span>
          </button>
        </div>
      )}
    </div>
  );
};
