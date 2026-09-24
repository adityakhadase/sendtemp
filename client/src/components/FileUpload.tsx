import React, { useState, useRef, useEffect } from 'react';
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
  const [uploadSpeed, setUploadSpeed] = useState<string>('0 MB/s');
  const [timeRemaining, setTimeRemaining] = useState<string>('estimating...');
  const [shareData, setShareData] = useState<UploadResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copyCodeLabel, setCopyCodeLabel] = useState<string>('Copy Code');
  const [copyLinkLabel, setCopyLinkLabel] = useState<string>('Copy Link');
  const [countdownText, setCountdownText] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadStartTimeRef = useRef<number>(0);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

  // Format 6-digit code with standard middle dash: "482 - 731"
  const format6DigitCode = (code: string): string => {
    const digits = code.replace(/\D/g, '');
    if (digits.length === 6) {
      return `${digits.slice(0, 3)} - ${digits.slice(3, 6)}`;
    }
    return code;
  };

  // Expiration Countdown Timer for the Sealed card
  useEffect(() => {
    if (!shareData?.expiresAt) return;

    const interval = setInterval(() => {
      const remainingMs = new Date(shareData.expiresAt).getTime() - Date.now();
      if (remainingMs <= 0) {
        setCountdownText('Expired');
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
  }, [shareData]);

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
      setErrorMessage('Please select a file to dispatch.');
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);
    setUploadProgress(0);
    uploadStartTimeRef.current = Date.now();

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

            const elapsedSec = (Date.now() - uploadStartTimeRef.current) / 1000;
            if (elapsedSec > 0.5) {
              const speedBytesPerSec = progressEvent.loaded / elapsedSec;
              const speedMbPerSec = (speedBytesPerSec / (1024 * 1024)).toFixed(1);
              setUploadSpeed(`${speedMbPerSec} MB/s`);

              const remainingBytes = progressEvent.total - progressEvent.loaded;
              const secLeft = Math.max(1, Math.round(remainingBytes / speedBytesPerSec));
              setTimeRemaining(`${secLeft} seconds remaining`);
            }
          }
        },
      });

      if (response.status === 201) {
        setShareData(response.data);
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
      const serverMsg =
        err.response?.data?.error?.message || err.message || 'Failed to dispatch file.';
      setErrorMessage(serverMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const copyCode = () => {
    if (!shareData) return;
    const digitsOnly = shareData.shareCode.replace(/\D/g, '');
    navigator.clipboard.writeText(digitsOnly);
    setCopyCodeLabel('Copied!');
    setTimeout(() => setCopyCodeLabel('Copy Code'), 2000);
  };

  const copyLink = () => {
    if (!shareData) return;
    const digitsOnly = shareData.shareCode.replace(/\D/g, '');
    const url = `${window.location.origin}/#receive/${digitsOnly}`;
    navigator.clipboard.writeText(url);
    setCopyLinkLabel('Copied!');
    setTimeout(() => setCopyLinkLabel('Copy Link'), 2000);
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

  return (
    <div className="bg-surface-container-low rounded-xl p-5 sm:p-7 flex flex-col justify-between shadow-xl relative overflow-hidden border border-outline-variant/30">
      <div className="flex flex-col gap-4">
        {/* Top Bar Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-surface-container-high">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm sm:text-base text-primary uppercase font-bold tracking-wider">
              SEND
            </span>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-surface-container-highest text-primary font-medium">
              Max 100 MB
            </span>
          </div>

          <span className="font-mono text-[11px] bg-surface-container text-on-surface-variant px-2 py-0.5 rounded border border-outline-variant/30">
            RAM Encrypted
          </span>
        </div>

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="p-3 bg-error-container/30 border border-error/50 rounded-lg text-error text-xs font-mono flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STATE 1: DEFAULT / DROP ZONE (NO FILE SELECTED YET) */}
        {!file && !isUploading && !shareData && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="font-mono text-base text-primary font-semibold">Share a file</p>
              <p className="font-sans text-xs text-on-surface-variant">
                Encrypted in-memory transfer with instant auto-purge.
              </p>
            </div>

            {/* Large Interactive Drop Area */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer group flex flex-col items-center justify-center p-8 sm:p-12 rounded-lg bg-surface-container hover:bg-surface-container-high transition-all text-center gap-3 relative border border-dashed border-outline-variant/50 hover:border-primary/50"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[24px]">upload_file</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="font-mono text-sm sm:text-base text-primary font-medium">
                  Drop your file here
                </p>
                <p className="font-sans text-xs text-on-surface-variant">
                  or click to browse from system
                </p>
              </div>
              <button
                type="button"
                className="mt-1 font-mono text-xs px-4 py-2 rounded bg-surface-container-highest hover:bg-surface-bright text-primary flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                <span>Choose File</span>
              </button>
            </div>

            {/* 3 Feature Checklist Pills at Bottom of Dropzone */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-on-surface-variant font-mono text-[11px]">
              <div className="p-2 bg-surface-container-lowest rounded flex items-center gap-1.5 border border-outline-variant/20">
                <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                <span>Max: 100 MB</span>
              </div>
              <div className="p-2 bg-surface-container-lowest rounded flex items-center gap-1.5 border border-outline-variant/20">
                <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                <span>No registration</span>
              </div>
              <div className="p-2 bg-surface-container-lowest rounded flex items-center gap-1.5 border border-outline-variant/20">
                <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                <span>Auto-expiring RAM</span>
              </div>
            </div>
          </div>
        )}

        {/* STATE 2: CONFIGURE FILE DISPATCH (FILE SELECTED) */}
        {file && !isUploading && !shareData && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <p className="font-mono text-base text-primary font-semibold">
                Configure file dispatch
              </p>
              <p className="font-sans text-xs text-on-surface-variant">
                Set recipient permission and auto-destruct window.
              </p>
            </div>

            {/* Staged File Card */}
            <div className="flex items-center justify-between p-3.5 bg-surface-container rounded-lg border border-outline-variant/30">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded bg-surface-container-highest flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-[20px]">description</span>
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-xs sm:text-sm text-primary font-semibold truncate">
                    {file.name}
                  </p>
                  <p className="font-mono text-[11px] text-on-surface-variant">
                    {formatFileSize(file.size)} • {file.type || 'application/octet-stream'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="font-mono text-xs px-2.5 py-1 rounded bg-surface-container-highest hover:bg-surface-bright text-on-surface transition-colors"
                >
                  Change File
                </button>
                <button
                  type="button"
                  onClick={resetFlow}
                  className="p-1 rounded hover:bg-surface-container-highest text-error transition-colors"
                  title="Remove file"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Who can download? Recipient Scope Toggles */}
            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
                Who can download?
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Option 1: Single Person */}
                <div
                  onClick={() => setMode('SINGLE')}
                  className={`cursor-pointer p-3 rounded-lg flex flex-col gap-1 transition-all border ${
                    mode === 'SINGLE'
                      ? 'bg-surface-container-high border-primary/40 text-primary shadow-sm'
                      : 'bg-surface-container border-outline-variant/30 hover:bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">lock_person</span>
                      Single Person
                    </span>
                    <span
                      className={`material-symbols-outlined text-base ${
                        mode === 'SINGLE' ? 'text-primary' : 'text-outline-variant/40'
                      }`}
                    >
                      {mode === 'SINGLE' ? 'check_circle' : 'circle'}
                    </span>
                  </div>
                  <p className="font-sans text-[11px] text-on-surface-variant">
                    Destructs after 1 download.
                  </p>
                </div>

                {/* Option 2: Multiple People */}
                <div
                  onClick={() => setMode('MULTI')}
                  className={`cursor-pointer p-3 rounded-lg flex flex-col gap-1 transition-all border ${
                    mode === 'MULTI'
                      ? 'bg-surface-container-high border-primary/40 text-primary shadow-sm'
                      : 'bg-surface-container border-outline-variant/30 hover:bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs sm:text-sm font-semibold flex items-center gap-1.5 text-on-surface">
                      <span className="material-symbols-outlined text-[16px]">group</span>
                      Multiple People
                    </span>
                    <span
                      className={`material-symbols-outlined text-base ${
                        mode === 'MULTI' ? 'text-primary' : 'text-outline-variant/40'
                      }`}
                    >
                      {mode === 'MULTI' ? 'check_circle' : 'circle'}
                    </span>
                  </div>
                  <p className="font-sans text-[11px] text-on-surface-variant">
                    Valid until expiration timer.
                  </p>
                </div>
              </div>
            </div>

            {/* Available for: Expiration Grid with 6 pills */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
                  Available for
                </span>
                <span className="font-mono text-[11px] text-primary">Auto-destruct timer</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {[
                  { label: '10 min', val: 10 },
                  { label: '30 min', val: 30 },
                  { label: '1 hour', val: 60 },
                  { label: '2 hours', val: 120 },
                  { label: '6 hours', val: 360 },
                  { label: '12 hours', val: 720 },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setTtlMinutes(item.val)}
                    className={`px-2 py-1.5 rounded font-mono text-xs text-center transition-all ${
                      ttlMinutes === item.val
                        ? 'bg-primary text-on-primary font-semibold shadow-sm'
                        : 'bg-surface-container hover:bg-surface-container-highest text-on-surface'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="font-sans text-[11px] text-on-surface-variant">
                Your file will be automatically removed after expiry.
              </p>
            </div>

            {/* Send File Action Button */}
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg bg-primary hover:opacity-90 text-on-primary font-mono text-sm font-semibold flex items-center justify-center gap-1.5 transition-transform active:scale-[0.99] shadow-md mt-1"
            >
              <span>Send File</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </form>
        )}

        {/* STATE 3: UPLOADING PROGRESS */}
        {isUploading && file && (
          <div className="flex flex-col gap-4 py-2">
            <div>
              <div className="flex items-center justify-between">
                <p className="font-mono text-base text-primary font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                  Uploading...
                </p>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-container-highest text-primary">
                  AES-GCM Stream
                </span>
              </div>
              <p className="font-mono text-xs text-on-surface-variant mt-0.5 truncate">
                {file.name} • {formatFileSize(file.size)}
              </p>
            </div>

            {/* Progress Module */}
            <div className="p-4 bg-surface-container rounded-lg flex flex-col gap-2.5 border border-outline-variant/30">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-primary font-semibold">{uploadProgress}%</span>
                <span className="text-on-surface-variant">
                  {formatFileSize((file.size * uploadProgress) / 100)} / {formatFileSize(file.size)}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-surface-container-lowest rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px] text-on-surface-variant">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">speed</span>
                  <span>Speed: {uploadSpeed}</span>
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">timelapse</span>
                  <span>{timeRemaining}</span>
                </div>
              </div>
            </div>

            {/* Safe-to-close Reassurance Notice */}
            <div className="p-3.5 rounded-lg bg-surface-container-high flex items-start gap-3 border border-outline-variant/30">
              <span className="material-symbols-outlined text-primary text-[18px] mt-0.5 shrink-0">
                verified
              </span>
              <div className="flex flex-col gap-0.5">
                <p className="font-mono text-xs text-primary font-semibold">Sender invariant</p>
                <p className="font-sans text-xs text-on-surface-variant leading-relaxed">
                  Safe to close window once uploaded. File streams directly from ephemeral RAM.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STATE 4: FILE READY (SEALED 6-DIGIT CODE GENERATED) */}
        {shareData && (
          <div className="flex flex-col gap-4 py-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                <p className="font-mono text-base text-primary font-semibold">File ready ✓</p>
              </div>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-container-highest text-primary">
                Status: Sealed
              </span>
            </div>

            {/* Monospaced 6-Digit Code Card */}
            <div className="p-6 bg-surface-container rounded-lg flex flex-col items-center justify-center gap-2 text-center relative overflow-hidden border border-outline-variant/30">
              <span className="font-mono text-[11px] uppercase tracking-widest text-on-surface-variant font-semibold">
                One-Time 6-Digit Code
              </span>

              {/* Displayed as 6 digits with clean spacing: 482 - 731 */}
              <div className="font-mono text-2xl sm:text-3xl tracking-widest font-bold text-primary select-all py-2 px-6 rounded bg-surface-container-lowest shadow-inner border border-outline-variant/40">
                {format6DigitCode(shareData.shareCode)}
              </div>

              <div className="flex items-center gap-1.5 mt-1">
                <span className="material-symbols-outlined text-primary text-[14px] animate-pulse">
                  timer
                </span>
                <span className="font-mono text-xs text-on-surface-variant">
                  {countdownText ? `Expires in ${countdownText}` : 'Active ephemeral window'}
                </span>
              </div>
            </div>

            {/* Action Buttons: Copy Code & Copy Link */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={copyCode}
                className="py-2.5 px-4 rounded bg-primary hover:opacity-90 text-on-primary font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow"
              >
                <span className="material-symbols-outlined text-[16px]">content_copy</span>
                <span>{copyCodeLabel}</span>
              </button>
              <button
                type="button"
                onClick={copyLink}
                className="py-2.5 px-4 rounded bg-surface-container-highest hover:bg-surface-bright text-primary font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">link</span>
                <span>{copyLinkLabel}</span>
              </button>
            </div>

            {/* Policy Details Pill */}
            <div className="p-2.5 rounded bg-surface-container-lowest flex items-center justify-between text-on-surface-variant font-mono text-xs border border-outline-variant/30">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-primary">lock</span>
                <span>
                  {shareData.mode === 'SINGLE'
                    ? 'One recipient can download this file.'
                    : 'Multiple recipients allowed until expiry.'}
                </span>
              </span>
              <span className="text-secondary font-medium">
                {shareData.mode === 'SINGLE' ? 'Single-use' : 'Multi-use'}
              </span>
            </div>

            {/* Send Another File Reset */}
            <button
              type="button"
              onClick={resetFlow}
              className="w-full py-2 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-mono text-xs transition-colors flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span>
              <span>Send Another File</span>
            </button>
          </div>
        )}
      </div>

      {/* Panel Terminal Branding Footer */}
      <div className="pt-4 mt-6 border-t border-surface-container-high flex items-center justify-between text-on-surface-variant font-mono text-[11px]">
        <span>sendTemp Payload Gateway</span>
        <span>Zero-retention node</span>
      </div>
    </div>
  );
};
