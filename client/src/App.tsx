import React, { useState } from 'react';
import { Logo } from './components/Logo';
import { FileUpload } from './components/FileUpload';
import { FileReceive } from './components/FileReceive';

export const App: React.FC = () => {
  const [activeMobileTab, setActiveMobileTab] = useState<'send' | 'receive'>('send');

  return (
    <main className="min-h-screen w-full bg-[#f4f4f5] flex flex-col justify-between p-4 sm:p-6 lg:p-8 selection:bg-neutral-900 selection:text-white">
      <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col justify-between gap-6">
        {/* Redesigned Header: Status on Top Left, Logo on Top Right */}
        <header className="flex items-center justify-between pb-4 border-b border-neutral-200/60">
          {/* Top Left: Active Status Indicator */}
          <div className="flex items-center gap-2 font-mono text-xs text-neutral-600 bg-white px-3 py-1.5 rounded-full border border-neutral-200/80 shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-neutral-800">P2P Ephemeral Network</span>
          </div>

          {/* Top Right: Brand Logo & Icon (v1.0 badge removed) */}
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-neutral-950">
              sendTemp
            </span>
            <Logo size={30} />
          </div>
        </header>

        {/* Mobile View Switcher (Hidden on Desktop) */}
        <div className="w-full lg:hidden flex bg-neutral-200/70 p-1 rounded-xl border border-neutral-300/60">
          <button
            type="button"
            onClick={() => setActiveMobileTab('send')}
            className={`flex-1 py-2 rounded-lg font-mono text-xs font-semibold transition-all ${
              activeMobileTab === 'send'
                ? 'bg-white text-neutral-950 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            01. SEND FILE
          </button>
          <button
            type="button"
            onClick={() => setActiveMobileTab('receive')}
            className={`flex-1 py-2 rounded-lg font-mono text-xs font-semibold transition-all ${
              activeMobileTab === 'receive'
                ? 'bg-white text-neutral-950 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            02. RECEIVE FILE
          </button>
        </div>

        {/* Edge-to-Edge Symmetrical Dual-Module Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch flex-1">
          <section className={`w-full h-full ${activeMobileTab === 'receive' ? 'hidden lg:block' : 'block'}`}>
            <FileUpload />
          </section>

          <section className={`w-full h-full ${activeMobileTab === 'send' ? 'hidden lg:block' : 'block'}`}>
            <FileReceive />
          </section>
        </div>

        {/* Footer with Creator Note and Memory Isolation Metadata */}
        <footer className="pt-4 flex flex-wrap items-center justify-between text-neutral-400 font-mono text-xs border-t border-neutral-200/60">
          <span>sendTemp &bull; Created for personal work</span>
          <span>End-to-end memory isolation &bull; Instant wipe</span>
        </footer>
      </div>
    </main>
  );
};

export default App;
