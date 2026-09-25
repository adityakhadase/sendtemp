import React, { useState } from 'react';
import { Logo } from './components/Logo';
import { FileUpload } from './components/FileUpload';
import { FileReceive } from './components/FileReceive';

export const App: React.FC = () => {
  const [activeMobileTab, setActiveMobileTab] = useState<'send' | 'receive'>('send');

  return (
    <main className="min-h-screen w-full bg-[#0a0b0e] bg-vault-canvas flex flex-col items-center justify-center p-3 sm:p-6 lg:p-10 selection:bg-neutral-900 selection:text-white">
      {/* Central Super Vault Container */}
      <div className="w-full max-w-6xl bg-white rounded-2xl border border-neutral-200/90 shadow-2xl p-6 sm:p-8 flex flex-col gap-6">
        {/* Top Bar Header Inside Card */}
        <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <Logo size={32} />
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-neutral-950">
                sendTemp
              </span>
              <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200/80 font-medium">
                v1.0 &bull; zero-retention
              </span>
            </div>
          </div>

          {/* Active Status Pill */}
          <div className="flex items-center gap-2 font-mono text-xs text-neutral-600 bg-neutral-50 px-3 py-1.5 rounded-full border border-neutral-200/80">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-neutral-800">P2P Ephemeral Network</span>
          </div>
        </header>

        {/* Mobile View Switcher (Hidden on Desktop) */}
        <div className="w-full lg:hidden flex bg-neutral-100 p-1 rounded-xl border border-neutral-200">
          <button
            type="button"
            onClick={() => setActiveMobileTab('send')}
            className={`flex-1 py-2 rounded-lg font-mono text-xs font-semibold transition-all ${
              activeMobileTab === 'send'
                ? 'bg-white text-neutral-950 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900'
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
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            02. RECEIVE FILE
          </button>
        </div>

        {/* Symmetrical Dual-Module Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <section className={`w-full ${activeMobileTab === 'receive' ? 'hidden lg:block' : 'block'}`}>
            <FileUpload />
          </section>

          <section className={`w-full ${activeMobileTab === 'send' ? 'hidden lg:block' : 'block'}`}>
            <FileReceive />
          </section>
        </div>

        {/* Central Vault Footer */}
        <footer className="pt-2 flex flex-wrap items-center justify-between text-neutral-400 font-mono text-xs border-t border-neutral-100">
          <span>Antigravity Super Vault &bull; SendTemp</span>
          <span>End-to-end memory isolation &bull; Instant wipe</span>
        </footer>
      </div>
    </main>
  );
};

export default App;
