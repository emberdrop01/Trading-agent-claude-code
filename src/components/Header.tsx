import React from 'react';
import { Activity, ShieldCheck, Cpu, Send, RefreshCw, Zap } from 'lucide-react';

interface HeaderProps {
  onManualRun: () => void;
  isRunning: boolean;
  activeSymbol: string;
  onSymbolChange: (symbol: string) => void;
  symbols: { id: string; name: string }[];
  selectedSymbolsCount: number;
  lastRunStatus?: 'success' | 'error' | 'idle';
  lastRunTime?: string;
  hasTgBot: boolean;
  hasDerivToken: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onManualRun,
  isRunning,
  activeSymbol,
  onSymbolChange,
  symbols,
  selectedSymbolsCount,
  lastRunStatus,
  lastRunTime,
  hasTgBot,
  hasDerivToken,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-30 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Brand & Status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                DERIV <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">AI ANALYST</span>
              </h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Node.js
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Multi-Agent Synthetic Index Intelligence • Cron Automated
            </p>
          </div>
        </div>

        {/* Integration Badges & Quick Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
          {/* Quick status pills */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
                hasDerivToken
                  ? 'border-emerald-500/20 bg-emerald-950/30 text-emerald-400'
                  : 'border-amber-500/20 bg-amber-950/30 text-amber-400'
              }`}
              title={hasDerivToken ? 'Deriv Token Configured' : 'Public / Simulation Mode'}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Deriv WS: {hasDerivToken ? 'Auth' : 'Public'}</span>
            </div>

            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
                hasTgBot
                  ? 'border-cyan-500/20 bg-cyan-950/30 text-cyan-400'
                  : 'border-slate-800 bg-slate-900/50 text-slate-400'
              }`}
              title={hasTgBot ? 'Telegram Bot Connected' : 'Telegram Not Configured'}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Telegram: {hasTgBot ? 'Ready' : 'Off'}</span>
            </div>
          </div>

          {/* Quick Active Chart Switcher */}
          <div className="relative flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs">
            <span className="text-slate-400 text-[11px] font-mono">Chart:</span>
            <select
              value={activeSymbol}
              onChange={(e) => onSymbolChange(e.target.value)}
              className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              {symbols.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-900 text-slate-200">
                  {s.id}
                </option>
              ))}
            </select>
          </div>

          {/* Trigger Manual Run Button */}
          <button
            onClick={onManualRun}
            disabled={isRunning || selectedSymbolsCount === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-md active:scale-95 ${
              isRunning || selectedSymbolsCount === 0
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 cursor-not-allowed opacity-80'
                : 'bg-gradient-to-r from-cyan-500 hover:from-cyan-400 to-blue-600 hover:to-blue-500 text-slate-950 font-bold shadow-cyan-500/20 hover:shadow-cyan-500/30'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin text-cyan-400' : 'text-slate-950'}`} />
            <span>
              {isRunning
                ? 'Analyzing Selected Indices...'
                : `Trigger Run (${selectedSymbolsCount} ${selectedSymbolsCount === 1 ? 'Index' : 'Indices'})`}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
