import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Search,
  CheckCircle,
  Clock,
  Compass,
  FileText,
  AlertTriangle,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  MinusCircle,
  Copy,
  Check,
} from 'lucide-react';

interface AnalysisCardProps {
  analysis: any | null;
  analyses?: Record<string, any>;
  isRunning: boolean;
  activeSymbol: string;
  onSymbolSelect?: (symbol: string) => void;
}

export const AnalysisCard: React.FC<AnalysisCardProps> = ({
  analysis,
  analyses = {},
  isRunning,
  activeSymbol,
  onSymbolSelect,
}) => {
  const [activeTab, setActiveTab] = useState<'manager' | 'researcher' | 'analyst' | 'redTeam' | 'markdown'>('manager');
  const [copied, setCopied] = useState(false);
  const [selectedReportSymbol, setSelectedReportSymbol] = useState<string>(activeSymbol);

  // Available analysis symbols
  const availableSymbols = Object.keys(analyses);
  const currentAnalysis =
    analyses[selectedReportSymbol] ||
    (analysis?.symbol === selectedReportSymbol ? analysis : null) ||
    analysis ||
    (availableSymbols.length > 0 ? analyses[availableSymbols[0]] : null);

  // Sync with active symbol changes if available
  React.useEffect(() => {
    if (activeSymbol && (analyses[activeSymbol] || analysis?.symbol === activeSymbol)) {
      setSelectedReportSymbol(activeSymbol);
    }
  }, [activeSymbol, analyses, analysis]);

  if (isRunning) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-xl backdrop-blur flex flex-col items-center justify-center min-h-[360px] text-center space-y-4">
        <div className="relative w-16 h-16">
          <div className="w-16 h-16 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-cyan-400">
            <Compass className="w-6 h-6 animate-pulse" />
          </div>
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Multi-Agent Debate In Progress</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Ingesting WebSocket OHLCV candles → [RESEARCHER] pattern extraction → [ANALYST] thesis → [RED TEAM] invalidation → [MANAGER] synthesis...
          </p>
        </div>
        <div className="flex gap-2">
          {['RESEARCHER', 'ANALYST', 'RED TEAM', 'MANAGER'].map((p, idx) => (
            <span
              key={p}
              className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-cyan-300 animate-pulse"
              style={{ animationDelay: `${idx * 200}ms` }}
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (!currentAnalysis) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-xl backdrop-blur flex flex-col items-center justify-center min-h-[360px] text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
          <Compass className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-200">No Analysis Dispatched Yet</h3>
        <p className="text-xs text-slate-400 max-w-md">
          Trigger a Manual Run or wait for the next 30m / 1h / 4h cron cycle. The AI engine will connect to Deriv WebSocket, debate with 4 personas, and deliver the execution plan.
        </p>
      </div>
    );
  }

  const { manager, researcher, analyst, redTeam } = currentAnalysis;

  const isBuy = manager.verdict.includes('BUY');
  const isSell = manager.verdict.includes('SELL');

  const verdictColor = isBuy
    ? 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40'
    : isSell
    ? 'text-rose-400 border-rose-500/40 bg-rose-950/40'
    : 'text-amber-400 border-amber-500/40 bg-amber-950/40';

  const copyMarkdown = () => {
    if (currentAnalysis.fullMarkdown) {
      navigator.clipboard.writeText(currentAnalysis.fullMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur flex flex-col">
      {/* Multi-Index Report Switcher Bar (if multiple reports exist) */}
      {availableSymbols.length > 1 && (
        <div className="mb-4 pb-3 border-b border-slate-800 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-mono text-slate-400 mr-1 flex items-center gap-1">
            <Target className="w-3 h-3 text-cyan-400" />
            <span>Reports ({availableSymbols.length}):</span>
          </span>
          {availableSymbols.map((sym) => {
            const symAnalysis = analyses[sym];
            const isSymBuy = symAnalysis?.manager?.verdict?.includes('BUY');
            const isSymSell = symAnalysis?.manager?.verdict?.includes('SELL');
            const isActive = sym === selectedReportSymbol;

            return (
              <button
                key={sym}
                onClick={() => {
                  setSelectedReportSymbol(sym);
                  if (onSymbolSelect) onSymbolSelect(sym);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSymBuy ? 'bg-emerald-400' : isSymSell ? 'bg-rose-400' : 'bg-amber-400'
                  }`}
                />
                <span>{sym}</span>
                {symAnalysis?.manager && (
                  <span className="text-[10px] text-slate-400 font-normal">
                    {symAnalysis.manager.confidenceScore}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Top Header & Verdict Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-cyan-400 font-semibold">{currentAnalysis.symbol}</span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3" />
              {new Date(currentAnalysis.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
          <h2 className="text-base font-bold text-white mt-0.5">Automated Multi-Agent Verdict</h2>
        </div>

        {/* Verdict Badge & Confidence */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold tracking-wide flex items-center gap-1.5 shadow-sm ${verdictColor}`}>
              {isBuy ? <ArrowUpRight className="w-4 h-4" /> : isSell ? <ArrowDownRight className="w-4 h-4" /> : <MinusCircle className="w-4 h-4" />}
              <span>{manager.verdict}</span>
            </div>

            {/* Confidence Score Pill */}
            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Confidence:</span>
              <span
                className={`text-xs font-mono font-bold ${
                  manager.confidenceScore >= 70
                    ? 'text-emerald-400'
                    : manager.confidenceScore >= 45
                    ? 'text-cyan-400'
                    : 'text-amber-400'
                }`}
              >
                {manager.confidenceScore}%
              </span>
            </div>
          </div>

          <button
            onClick={copyMarkdown}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Copy Full Report Markdown"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Key Execution Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 my-4">
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <span className="text-[10px] uppercase font-mono text-slate-500 block mb-0.5">Entry Zone</span>
          <span className="text-xs font-bold font-mono text-slate-200 truncate block" title={manager.entryZone}>
            {manager.entryZone || 'Market'}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-rose-950/50">
          <span className="text-[10px] uppercase font-mono text-rose-400/80 block mb-0.5">Stop Loss</span>
          <span className="text-xs font-bold font-mono text-rose-400 truncate block" title={manager.stopLoss}>
            {manager.stopLoss}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-emerald-950/50">
          <span className="text-[10px] uppercase font-mono text-emerald-400/80 block mb-0.5">Target TP1</span>
          <span className="text-xs font-bold font-mono text-emerald-400 truncate block" title={manager.takeProfit1}>
            {manager.takeProfit1}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-emerald-950/50">
          <span className="text-[10px] uppercase font-mono text-emerald-400/80 block mb-0.5">Target TP2</span>
          <span className="text-xs font-bold font-mono text-emerald-300 truncate block" title={manager.takeProfit2}>
            {manager.takeProfit2}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase font-mono text-slate-500 block mb-0.5">Risk / Reward</span>
          <span className="text-xs font-bold font-mono text-cyan-400 truncate block">
            {manager.riskRewardRatio} ({manager.recommendedRiskPercent})
          </span>
        </div>
      </div>

      {/* Persona Tab Navigation */}
      <div className="flex items-center gap-1.5 border-b border-slate-800/80 pb-2 mb-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('manager')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
            activeTab === 'manager'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>[MANAGER] Final Synthesis</span>
        </button>

        <button
          onClick={() => setActiveTab('researcher')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
            activeTab === 'researcher'
              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>[RESEARCHER] Patterns</span>
        </button>

        <button
          onClick={() => setActiveTab('analyst')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
            activeTab === 'analyst'
              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>[ANALYST] Baseline Thesis</span>
        </button>

        <button
          onClick={() => setActiveTab('redTeam')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
            activeTab === 'redTeam'
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>[RED TEAM] Invalidation</span>
        </button>

        <button
          onClick={() => setActiveTab('markdown')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
            activeTab === 'markdown'
              ? 'bg-slate-800 text-slate-200 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Full Markdown</span>
        </button>
      </div>

      {/* Tab Content Display */}
      <div className="flex-1 text-xs text-slate-300 leading-relaxed min-h-[140px]">
        {activeTab === 'manager' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <h4 className="font-semibold text-cyan-300 mb-1 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" /> Executive Trading Plan
              </h4>
              <p className="text-slate-200 text-xs">{manager.summary}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80">
                <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">Risk Allocation</span>
                <p className="text-slate-300">
                  Recommended size: <strong className="text-cyan-300">{manager.recommendedRiskPercent}</strong> per trade to safeguard capital during high-volatility tick cycles.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80">
                <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">Telegram Transmission</span>
                <p className="text-slate-300">
                  Transmitted to Telegram channel with structured execution levels, verified confidence score, and persona notes.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'researcher' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Identified Structure</span>
                <span className="font-semibold text-slate-200">{researcher.marketStructure || 'Consolidation'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Support Levels</span>
                <span className="font-mono text-emerald-400">{(researcher.supportLevels || []).join(', ') || 'N/A'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Resistance Levels</span>
                <span className="font-mono text-rose-400">{(researcher.resistanceLevels || []).join(', ') || 'N/A'}</span>
              </div>
            </div>

            {researcher.patterns && researcher.patterns.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {researcher.patterns.map((p: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 rounded-full bg-blue-950/50 border border-blue-800/50 text-blue-300 text-[11px] font-medium">
                    {p}
                  </span>
                ))}
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 whitespace-pre-line">
              {researcher.details}
            </div>
          </div>
        )}

        {activeTab === 'analyst' && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-purple-900/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono text-purple-400">Baseline Bias</span>
                <h4 className="text-sm font-bold text-white">{analyst.thesis}</h4>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Target Expansion</span>
                <span className="text-xs font-mono font-bold text-cyan-400">{analyst.targetZone}</span>
              </div>
            </div>

            <p className="text-slate-300 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
              <strong>Thesis Rationale:</strong> {analyst.rationale}
            </p>

            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 whitespace-pre-line">
              {analyst.details}
            </div>
          </div>
        )}

        {activeTab === 'redTeam' && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/40 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-rose-300 text-xs">Trap Hazards & Invalidation Triggers</h4>
                <p className="text-rose-200/90 text-xs mt-0.5">{redTeam.trapHazards || 'Spike volatility risk.'}</p>
              </div>
            </div>

            {redTeam.keyRisks && redTeam.keyRisks.length > 0 && (
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1.5">Identified Risk Vectors:</span>
                <div className="space-y-1.5">
                  {redTeam.keyRisks.map((risk: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                      <span>{risk}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 whitespace-pre-line">
              {redTeam.details}
            </div>
          </div>
        )}

        {activeTab === 'markdown' && (
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 whitespace-pre-wrap max-h-72 overflow-y-auto">
            {analysis.fullMarkdown}
          </div>
        )}
      </div>
    </div>
  );
};
