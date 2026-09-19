import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { FileReceive } from './components/FileReceive';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'send' | 'receive' | 'both'>('both');

  return (
    <div className="min-h-screen bg-background font-sans text-on-surface flex flex-col selection:bg-surface-container-highest selection:text-primary">
      {/* Header */}
      <header className="sticky top-0 w-full z-50 bg-surface-container-lowest/90 backdrop-blur-xl border-b border-surface-container-high">
        <div className="h-14 max-w-7xl mx-auto px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary text-on-primary flex items-center justify-center font-mono font-bold text-base shadow">
              ST
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-base sm:text-lg text-primary tracking-tight font-semibold">
                sendTemp
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-mono text-[11px] border border-outline-variant/40">
                v1.0 • zero-retention
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded bg-surface-container-lowest border border-outline-variant/60 text-secondary font-mono text-xs">
              <span className="text-outline">$</span>
              <span>sendtemp --stream</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full flex-1 max-w-7xl mx-auto px-4 sm:px-8 py-8 flex flex-col items-center">
        {/* Mobile View Toggle */}
        <div className="w-full max-w-md lg:hidden flex bg-surface-container-lowest p-1 rounded-lg mb-6 border border-outline-variant/30">
          <button
            type="button"
            onClick={() => setActiveTab('send')}
            className={`flex-1 py-2 rounded-md font-mono text-xs font-medium transition-all ${
              activeTab === 'send' || activeTab === 'both'
                ? 'bg-surface-container-highest text-primary'
                : 'text-on-surface-variant'
            }`}
          >
            01. Send File
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('receive')}
            className={`flex-1 py-2 rounded-md font-mono text-xs font-medium transition-all ${
              activeTab === 'receive'
                ? 'bg-surface-container-highest text-primary'
                : 'text-on-surface-variant'
            }`}
          >
            02. Receive File
          </button>
        </div>

        {/* Dual Panel Grid */}
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className={`w-full ${activeTab === 'receive' ? 'hidden lg:block' : 'block'}`}>
            <FileUpload />
          </div>

          <div className={`w-full ${activeTab === 'send' ? 'hidden lg:block' : 'block'}`}>
            <FileReceive />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-surface-container-high py-4 px-4 bg-surface-container-lowest/50 text-center">
        <p className="font-mono text-xs text-on-surface-variant">
          SendTemp Architecture &bull; End-to-End Ephemeral Streaming &bull; Constant RAM Footprint
        </p>
      </footer>
    </div>
  );
};

export default App;
