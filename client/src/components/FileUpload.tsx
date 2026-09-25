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

  // Expiration Countdown for the Sealed card
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
    <div className="bg-[#f9fafb] rounded-xl p-5 sm:p-6 flex flex-col justify-between shadow-xs border border-neutral-200/90 h-full">
      <div className="flex flex-col gap-4">
        {/* Top Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-neutral-200/60">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs sm:text-sm font-bold tracking-wider text-neutral-900 uppercase">
              01. SEND FILE
            </span>
          </div>

          {/* Simulator status tabs */}
          <div className="flex items-center gap-1 font-mono text-[11px]">
            <span
              className={`px-2 py-0.5 rounded font-medium transition-all ${
                !file && !isUploading && !shareData
                  ? 'bg-neutral-950 text-white'
                  : 'text-neutral-400'
              }`}
            >
              Drop
            </span>
            <span
              className={`px-2 py-0.5 rounded font-medium transition-all ${
                file && !isUploading && !shareData
                  ? 'bg-neutral-950 text-white'
                  : 'text-neutral-400'
              }`}
            >
              Selected
            </span>
            <span
              className={`px-2 py-0.5 rounded font-medium transition-all ${
                isUploading ? 'bg-neutral-950 text-white' : 'text-neutral-400'
              }`}
            >
              Uploading
            </span>
            <span
              className={`px-2 py-0.5 rounded font-medium transition-all ${
                shareData ? 'bg-neutral-950 text-white' : 'text-neutral-400'
              }`}
            >
              Ready ✓
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-mono flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STATE 1: DEFAULT / DROP ZONE (ANTIGRAVITY / SUPER VAULT) */}
        {!file && !isUploading && !shareData && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="font-mono text-base font-bold text-neutral-950">Share a file</p>
              <p className="font-sans text-xs text-neutral-500 mt-0.5">
                Encrypted in-memory transfer with instant auto-purge.
              </p>
            </div>

            {/* Drop Zone Box with + Choose File button */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer group flex flex-col items-center justify-center py-10 px-6 rounded-xl bg-white hover:bg-neutral-50/80 border border-dashed border-neutral-300 hover:border-neutral-400 transition-all text-center gap-2 relative shadow-2xs"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-12 h-12 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-center text-neutral-900 shadow-2xs group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[24px]">cloud_upload</span>
              </div>
              <p className="font-mono text-sm font-semibold text-neutral-950 mt-1">
                Drag and drop your file here
              </p>
              <p className="font-sans text-xs text-neutral-500">
                or select a payload from your device
              </p>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="mt-2 font-mono text-xs px-4 py-2 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-white font-semibold shadow-sm flex items-center gap-1.5 transition-all"
              >
                <span>+</span>
                <span>Choose File</span>
              </button>
            </div>

            {/* 3 Feature Tags matching prompt */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-neutral-600 font-mono text-[11px]">
              <div className="py-2 px-2 bg-white rounded-lg flex items-center justify-center gap-1.5 border border-neutral-200 shadow-2xs font-medium">
                <span className="material-symbols-outlined text-neutral-900 text-sm">storage</span>
                <span>Max 100 MB</span>
              </div>
              <div className="py-2 px-2 bg-white rounded-lg flex items-center justify-center gap-1.5 border border-neutral-200 shadow-2xs font-medium">
                <span className="material-symbols-outlined text-neutral-900 text-sm">no_accounts</span>
                <span>No reg</span>
              </div>
              <div className="py-2 px-2 bg-white rounded-lg flex items-center justify-center gap-1.5 border border-neutral-200 shadow-2xs font-medium">
                <span className="material-symbols-outlined text-neutral-900 text-sm">memory</span>
                <span>Auto-RAM</span>
              </div>
            </div>
          </div>
        )}

        {/* STATE 2: CONFIGURE FILE DISPATCH (FILE SELECTED) */}
        {file && !isUploading && !shareData && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <p className="font-mono text-base font-bold text-neutral-950">
                Configure file dispatch
              </p>
              <p className="font-sans text-xs text-neutral-500 mt-0.5">
                Set recipient permission and auto-destruct window.
              </p>
            </div>

            {/* Staged File Card */}
            <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-lg border border-neutral-200">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-neutral-900 shrink-0">
                  <span className="material-symbols-outlined text-[20px]">description</span>
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-xs sm:text-sm text-neutral-950 font-semibold truncate">
                    {file.name}
                  </p>
                  <p className="font-mono text-[11px] text-neutral-500">
                    {formatFileSize(file.size)} • {file.type || 'application/octet-stream'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="font-mono text-xs px-2.5 py-1 rounded bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-900 transition-colors"
                >
                  Change File
                </button>
                <button
                  type="button"
                  onClick={resetFlow}
                  className="p-1 rounded hover:bg-neutral-100 text-neutral-400 hover:text-red-600 transition-colors"
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

            {/* Recipient Scope Cards */}
            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-xs text-neutral-600 uppercase tracking-wider font-semibold">
                Who can download?
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Single Person */}
                <div
                  onClick={() => setMode('SINGLE')}
                  className={`cursor-pointer p-3 rounded-lg flex flex-col gap-1 transition-all border ${
                    mode === 'SINGLE'
                      ? 'bg-neutral-950 text-white border-neutral-950 shadow-xs'
                      : 'bg-white border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">lock_person</span>
                      Single Person
                    </span>
                    <span
                      className={`material-symbols-outlined text-base ${
                        mode === 'SINGLE' ? 'text-white' : 'text-neutral-300'
                      }`}
                    >
                      {mode === 'SINGLE' ? 'check_circle' : 'circle'}
                    </span>
                  </div>
                  <p
                    className={`font-sans text-[11px] ${
                      mode === 'SINGLE' ? 'text-neutral-300' : 'text-neutral-500'
                    }`}
                  >
                    Destructs after 1 download.
                  </p>
                </div>

                {/* Multiple People */}
                <div
                  onClick={() => setMode('MULTI')}
                  className={`cursor-pointer p-3 rounded-lg flex flex-col gap-1 transition-all border ${
                    mode === 'MULTI'
                      ? 'bg-neutral-950 text-white border-neutral-950 shadow-xs'
                      : 'bg-white border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">group</span>
                      Multiple People
                    </span>
                    <span
                      className={`material-symbols-outlined text-base ${
                        mode === 'MULTI' ? 'text-white' : 'text-neutral-300'
                      }`}
                    >
                      {mode === 'MULTI' ? 'check_circle' : 'circle'}
                    </span>
                  </div>
                  <p
                    className={`font-sans text-[11px] ${
                      mode === 'MULTI' ? 'text-neutral-300' : 'text-neutral-500'
                    }`}
                  >
                    Valid until expiration timer.
                  </p>
                </div>
              </div>
            </div>

            {/* Available for Expiration Pills */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-neutral-600 uppercase tracking-wider font-semibold">
                  Available for
                </span>
                <span className="font-mono text-[11px] text-neutral-900 font-medium">
                  Auto-destruct timer
                </span>
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
                        ? 'bg-neutral-950 text-white font-semibold shadow-xs'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="font-sans text-[11px] text-neutral-500">
                Your file will be automatically removed after expiry.
              </p>
            </div>

            {/* Send Action Button */}
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-white font-mono text-sm font-semibold flex items-center justify-center gap-1.5 transition-transform active:scale-[0.99] shadow-sm mt-1"
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
                <p className="font-mono text-base font-bold text-neutral-950 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  Uploading...
                </p>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-neutral-100 text-neutral-700">
                  AES-GCM Stream
                </span>
              </div>
              <p className="font-mono text-xs text-neutral-500 mt-0.5 truncate">
                {file.name} • {formatFileSize(file.size)}
              </p>
            </div>

            <div className="p-4 bg-neutral-50 rounded-lg flex flex-col gap-2.5 border border-neutral-200">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-neutral-950 font-semibold">{uploadProgress}%</span>
                <span className="text-neutral-500">
                  {formatFileSize((file.size * uploadProgress) / 100)} / {formatFileSize(file.size)}
                </span>
              </div>

              <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-neutral-950 transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px] text-neutral-500">
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

            <div className="p-3.5 rounded-lg bg-neutral-50 flex items-start gap-3 border border-neutral-200">
              <span className="material-symbols-outlined text-neutral-900 text-[18px] mt-0.5 shrink-0">
                verified
              </span>
              <div className="flex flex-col gap-0.5">
                <p className="font-mono text-xs font-semibold text-neutral-950">Sender invariant</p>
                <p className="font-sans text-xs text-neutral-500 leading-relaxed">
                  Safe to close window once uploaded. File streams directly from ephemeral RAM.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STATE 4: FILE READY (SEALED CARD WITH 6-DIGIT CODE) */}
        {shareData && (
          <div className="flex flex-col gap-4 py-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <p className="font-mono text-base font-bold text-neutral-950">File ready ✓</p>
              </div>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-neutral-100 text-neutral-700">
                Status: Sealed
              </span>
            </div>

            {/* Code Box */}
            <div className="p-6 bg-neutral-50 rounded-xl flex flex-col items-center justify-center gap-2 text-center border border-neutral-200">
              <span className="font-mono text-[11px] uppercase tracking-widest text-neutral-500 font-semibold">
                One-Time 6-Digit Code
              </span>

              <div className="font-mono text-2xl sm:text-3xl tracking-widest font-bold text-neutral-950 select-all py-2 px-6 rounded-lg bg-white border border-neutral-200 shadow-2xs">
                {format6DigitCode(shareData.shareCode)}
              </div>

              <div className="flex items-center gap-1.5 mt-1 text-neutral-500 font-mono text-xs">
                <span className="material-symbols-outlined text-neutral-800 text-[14px]">
                  timer
                </span>
                <span>
                  {countdownText ? `Expires in ${countdownText}` : 'Active ephemeral window'}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={copyCode}
                className="py-2.5 px-4 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-white font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">content_copy</span>
                <span>{copyCodeLabel}</span>
              </button>
              <button
                type="button"
                onClick={copyLink}
                className="py-2.5 px-4 rounded-lg bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-900 font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">link</span>
                <span>{copyLinkLabel}</span>
              </button>
            </div>

            {/* Policy Info */}
            <div className="p-2.5 rounded-lg bg-neutral-50 flex items-center justify-between text-neutral-600 font-mono text-xs border border-neutral-200">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-neutral-900">lock</span>
                <span>
                  {shareData.mode === 'SINGLE'
                    ? 'One recipient can download this file.'
                    : 'Multiple recipients allowed until expiry.'}
                </span>
              </span>
              <span className="text-neutral-900 font-medium">
                {shareData.mode === 'SINGLE' ? 'Single-use' : 'Multi-use'}
              </span>
            </div>

            <button
              type="button"
              onClick={resetFlow}
              className="w-full py-2 rounded-lg bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-800 font-mono text-xs transition-colors flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span>
              <span>Send Another File</span>
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
