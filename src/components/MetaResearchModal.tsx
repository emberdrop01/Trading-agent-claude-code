import React from 'react';
import { Sparkles, X, Send, CheckCircle2, BookOpen } from 'lucide-react';

interface MetaResearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: string;
  telegramSent: boolean;
  findings?: { title: string; snippet: string; url?: string }[];
}

export const MetaResearchModal: React.FC<MetaResearchModalProps> = ({
  isOpen,
  onClose,
  summary,
  telegramSent,
  findings = [],
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Daily Meta-Research Intelligence</h3>
              <p className="text-xs text-slate-400">DuckDuckGo Strategy Search & Gemini Synthesis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300">
          {/* Telegram status banner */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between ${
              telegramSent
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 shrink-0" />
              <span>
                {telegramSent
                  ? 'Infrastructure Update successfully broadcasted to Telegram channel!'
                  : 'Report generated. Configure Telegram Bot to broadcast updates automatically.'}
              </span>
            </div>
          </div>

          {/* AI Executive Summary */}
          <div>
            <h4 className="text-xs uppercase font-mono text-cyan-400 font-semibold mb-1.5">
              Gemini Quantitative Strategy Synthesis:
            </h4>
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 whitespace-pre-line leading-relaxed text-slate-200">
              {summary || 'No summary available.'}
            </div>
          </div>

          {/* Source Findings */}
          {findings.length > 0 && (
            <div>
              <h4 className="text-xs uppercase font-mono text-slate-400 font-semibold mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Retrieved Market Intelligence Notes:
              </h4>
              <div className="space-y-2">
                {findings.map((f, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-1">
                    <strong className="text-slate-200 text-xs block">{f.title}</strong>
                    <p className="text-[11px] text-slate-400">{f.snippet}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 flex justify-end bg-slate-950/40">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
