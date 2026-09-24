import React, { useState } from 'react';
import { Logo } from './components/Logo';
import { FileUpload } from './components/FileUpload';
import { FileReceive } from './components/FileReceive';

export const App: React.FC = () => {
  const [activeMobileTab, setActiveMobileTab] = useState<'send' | 'receive'>('send');

  return (
    <div className="min-h-screen bg-dot-grid py-6 sm:py-10 px-3 sm:px-6 lg:px-8 flex flex-col items-center justify-center selection:bg-neutral-900 selection:text-white">
      {/* Top Title Tag (from 60-30-10 Minimalist design) */}
      <div className="w-full max-w-5xl flex items-center gap-2 text-xs font-mono text-neutral-400 mb-2 px-1">
        <span className="material-symbols-outlined text-[16px]">desktop_windows</span>
        <span>sendTemp - 60-30-10 Minimalist (Desktop)</span>
      </div>

      {/* Main 60-30-10 Card Container */}
      <div className="w-full max-w-5xl bg-[#f8f9fa] rounded-2xl border border-neutral-700/30 shadow-2xl p-5 sm:p-8 flex flex-col gap-6">
        {/* Header */}
        <header className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-3">
            <Logo size={30} />
            <span className="font-mono text-lg sm:text-xl font-bold tracking-tight text-neutral-950">
              sendTemp
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-xs text-neutral-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>P2P Ephemeral Network</span>
          </div>
        </header>

        {/* Mobile View Switcher */}
        <div className="w-full lg:hidden flex bg-neutral-200/70 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveMobileTab('send')}
            className={`flex-1 py-1.5 rounded-md font-mono text-xs font-semibold transition-all ${
              activeMobileTab === 'send'
                ? 'bg-white text-neutral-950 shadow-xs'
                : 'text-neutral-600'
            }`}
          >
            SEND
          </button>
          <button
            type="button"
            onClick={() => setActiveMobileTab('receive')}
            className={`flex-1 py-1.5 rounded-md font-mono text-xs font-semibold transition-all ${
              activeMobileTab === 'receive'
                ? 'bg-white text-neutral-950 shadow-xs'
                : 'text-neutral-600'
            }`}
          >
            RECEIVE
          </button>
        </div>

        {/* Dual Panel Grid (60% Light Container, 30% Pure White Cards, 10% Black & Emerald Accents) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <div className={`w-full ${activeMobileTab === 'receive' ? 'hidden lg:block' : 'block'}`}>
            <FileUpload />
          </div>

          <div className={`w-full ${activeMobileTab === 'send' ? 'hidden lg:block' : 'block'}`}>
            <FileReceive />
          </div>
        </div>

        {/* Card Footer */}
        <footer className="pt-2 text-center">
          <p className="font-mono text-xs text-neutral-400">
            sendTemp &bull; Created for personal work
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
