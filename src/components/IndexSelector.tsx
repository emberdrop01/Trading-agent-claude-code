import React from 'react';
import { CheckSquare, Square, Layers, Check, Zap } from 'lucide-react';

export interface SyntheticIndexMeta {
  id: string;
  name: string;
  category?: string;
  description?: string;
}

interface IndexSelectorProps {
  symbols: SyntheticIndexMeta[];
  selectedSymbols: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
}

export const IndexSelector: React.FC<IndexSelectorProps> = ({
  symbols,
  selectedSymbols,
  onChange,
  disabled = false,
}) => {
  const toggleSymbol = (id: string) => {
    if (disabled) return;
    if (selectedSymbols.includes(id)) {
      // Don't allow unchecking if it's the last one, or allow it with a minimum of 1
      if (selectedSymbols.length > 1) {
        onChange(selectedSymbols.filter((s) => s !== id));
      }
    } else {
      onChange([...selectedSymbols, id]);
    }
  };

  const selectAll = () => {
    if (disabled) return;
    onChange(symbols.map((s) => s.id));
  };

  const selectCore = () => {
    if (disabled) return;
    const core = ['R_75', 'R_100', 'R_50', 'R_25'];
    onChange(symbols.filter((s) => core.includes(s.id)).map((s) => s.id));
  };

  const select1s = () => {
    if (disabled) return;
    const hf = ['1HZ75V', '1HZ100V', 'R_75'];
    onChange(symbols.filter((s) => hf.includes(s.id)).map((s) => s.id));
  };

  const selectCrashBoom = () => {
    if (disabled) return;
    const cb = ['CRASH_500', 'BOOM_500', 'stpRNG'];
    onChange(symbols.filter((s) => cb.includes(s.id)).map((s) => s.id));
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">Target Indices (Multi-Index Reporting)</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-800 text-cyan-300 font-bold">
                {selectedSymbols.length} Selected
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Select which indices the AI Analyst will inspect and report to Telegram each run
            </p>
          </div>
        </div>

        {/* Quick presets */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <button
            type="button"
            onClick={selectCore}
            disabled={disabled}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
          >
            Core (V75/100/50)
          </button>
          <button
            type="button"
            onClick={select1s}
            disabled={disabled}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
          >
            1s Series
          </button>
          <button
            type="button"
            onClick={selectCrashBoom}
            disabled={disabled}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
          >
            Crash / Boom
          </button>
          <button
            type="button"
            onClick={selectAll}
            disabled={disabled}
            className="px-2.5 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800 transition-colors font-medium"
          >
            Select All
          </button>
        </div>
      </div>

      {/* Clickbox / Checkbox Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        {symbols.map((symbol) => {
          const isSelected = selectedSymbols.includes(symbol.id);

          return (
            <div
              key={symbol.id}
              onClick={() => toggleSymbol(symbol.id)}
              className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between select-none relative group ${
                isSelected
                  ? 'bg-gradient-to-b from-cyan-950/40 to-slate-900/90 border-cyan-500/50 shadow-md shadow-cyan-950/30'
                  : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40 text-slate-400'
              }`}
            >
              <div className="flex items-start justify-between gap-1.5 mb-2">
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {symbol.id}
                </span>

                {/* Clickbox Indicator */}
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950'
                      : 'border border-slate-700 bg-slate-900 group-hover:border-slate-500'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>

              <div>
                <strong
                  className={`text-xs block leading-tight ${
                    isSelected ? 'text-white font-semibold' : 'text-slate-300'
                  }`}
                >
                  {symbol.name}
                </strong>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {symbol.id.startsWith('1HZ')
                    ? '1s Tick Frequency'
                    : symbol.id.startsWith('CRASH') || symbol.id.startsWith('BOOM')
                    ? 'Spike Action'
                    : 'Continuous Volatility'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <span>Click any index to toggle. Background cron jobs will automatically analyze all checked indices.</span>
        <span className="font-mono text-cyan-400 font-medium">
          {selectedSymbols.length} of {symbols.length} Active
        </span>
      </div>
    </div>
  );
};
