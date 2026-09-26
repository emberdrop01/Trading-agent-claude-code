import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { CredentialsCard } from './components/CredentialsCard';
import { CronScheduleCard } from './components/CronScheduleCard';
import { AnalysisCard } from './components/AnalysisCard';
import { CandleChart } from './components/CandleChart';
import { IndexSelector } from './components/IndexSelector';
import { ActivityLogView } from './components/ActivityLogView';
import { MetaResearchModal } from './components/MetaResearchModal';
import { Shield, Sparkles, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [config, setConfig] = useState<any>({
    derivTokenMasked: '',
    hasDerivToken: false,
    tgBotTokenMasked: '',
    hasTgBotToken: false,
    tgChatId: '',
    hasTgChatId: false,
    geminiKeyOverrideMasked: '',
    hasGeminiKeyOverride: false,
    hasServerGeminiKey: true,
    activeSymbol: 'R_75',
    selectedSymbols: ['R_75', 'R_100'],
    cron30mEnabled: true,
    cron1hEnabled: false,
    cron4hEnabled: false,
    cronDailyResearchEnabled: true,
    lastRunStatus: 'idle',
  });

  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(['R_75', 'R_100']);

  const [symbols, setSymbols] = useState<{ id: string; name: string }[]>([
    { id: 'R_75', name: 'Volatility 75 Index' },
    { id: 'R_100', name: 'Volatility 100 Index' },
    { id: 'R_50', name: 'Volatility 50 Index' },
    { id: 'R_25', name: 'Volatility 25 Index' },
    { id: 'R_10', name: 'Volatility 10 Index' },
    { id: '1HZ75V', name: 'Volatility 75 (1s) Index' },
    { id: '1HZ100V', name: 'Volatility 100 (1s) Index' },
    { id: 'CRASH_500', name: 'Crash 500 Index' },
    { id: 'BOOM_500', name: 'Boom 500 Index' },
    { id: 'stpRNG', name: 'Step Index' },
  ]);

  const [lastAnalysis, setLastAnalysis] = useState<any>(null);
  const [analyses, setAnalyses] = useState<Record<string, any>>({});
  const [candleData, setCandleData] = useState<{ candles: any[]; indicators?: any; source?: string }>({
    candles: [],
  });

  const [logs, setLogs] = useState<any[]>([]);
  const [telegramHistory, setTelegramHistory] = useState<any[]>([]);
  const [cronStatus, setCronStatus] = useState<any>(null);

  const [isRunningManual, setIsRunningManual] = useState(false);
  const [isRefreshingCandles, setIsRefreshingCandles] = useState(false);
  const [isMetaResearching, setIsMetaResearching] = useState(false);

  const [metaResearchModal, setMetaResearchModal] = useState<{
    isOpen: boolean;
    summary: string;
    telegramSent: boolean;
    findings: any[];
  }>({
    isOpen: false,
    summary: '',
    telegramSent: false,
    findings: [],
  });

  const [bannerNotice, setBannerNotice] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // 1. Fetch Config & Symbols
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig(data.config);
          if (data.config.selectedSymbols && Array.isArray(data.config.selectedSymbols)) {
            setSelectedSymbols(data.config.selectedSymbols);
          }
        }
        if (data.symbols) setSymbols(data.symbols);
      }
    } catch (err) {
      console.error('Failed to fetch config:', err);
    }
  }, []);

  // 2. Fetch Last Analysis & Multi-Index Map
  const fetchLastAnalysis = useCallback(async () => {
    try {
      const res = await fetch('/api/last-analysis');
      if (res.ok) {
        const data = await res.json();
        if (data.analysis) setLastAnalysis(data.analysis);
        if (data.analyses) setAnalyses(data.analyses);
      }
    } catch (err) {
      console.error('Failed to fetch last analysis:', err);
    }
  }, []);

  // 3. Fetch Candles
  const fetchCandles = useCallback(async (symbol?: string) => {
    const targetSymbol = symbol || config.activeSymbol || 'R_75';
    setIsRefreshingCandles(true);
    try {
      const res = await fetch(`/api/candles?symbol=${encodeURIComponent(targetSymbol)}`);
      if (res.ok) {
        const data = await res.json();
        setCandleData({
          candles: data.candles || [],
          indicators: data.indicators,
          source: data.source,
        });
      }
    } catch (err) {
      console.error('Failed to fetch candles:', err);
    } finally {
      setIsRefreshingCandles(false);
    }
  }, [config.activeSymbol]);

  // 4. Fetch Logs & Telegram History
  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/logs');
      if (res.ok) {
        const data = await res.json();
        if (data.logs) setLogs(data.logs);
        if (data.telegramHistory) setTelegramHistory(data.telegramHistory);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  }, []);

  // 5. Fetch Cron Status
  const fetchCronStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/cron-status');
      if (res.ok) {
        const data = await res.json();
        setCronStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch cron status:', err);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    fetchConfig();
    fetchLastAnalysis();
    fetchCandles();
    fetchLogs();
    fetchCronStatus();
  }, [fetchConfig, fetchLastAnalysis, fetchCandles, fetchLogs, fetchCronStatus]);

  // Polling for logs and cron updates
  useEffect(() => {
    const timer = setInterval(() => {
      fetchLogs();
      fetchCronStatus();
      fetchLastAnalysis();
    }, 6000);
    return () => clearInterval(timer);
  }, [fetchLogs, fetchCronStatus, fetchLastAnalysis]);

  // Trigger Manual Run for all selected indices
  const handleManualRun = async () => {
    if (isRunningManual) return;
    if (selectedSymbols.length === 0) {
      setBannerNotice({
        type: 'error',
        message: 'Please check at least one index to run analysis.',
      });
      return;
    }

    setIsRunningManual(true);
    setBannerNotice(null);

    try {
      const res = await fetch('/api/run-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: selectedSymbols }),
      });

      const data = await res.json();

      if (data.success) {
        if (data.analysis) setLastAnalysis(data.analysis);
        if (data.results && Array.isArray(data.results)) {
          setAnalyses((prev) => {
            const updated = { ...prev };
            data.results.forEach((r: any) => {
              if (r.analysis) updated[r.symbol] = r.analysis;
            });
            return updated;
          });
        }

        const deliveredCount = (data.results || []).filter((r: any) => r.telegramResult?.success).length;

        setBannerNotice({
          type: 'success',
          message: `Multi-Index Run Complete! Analyzed ${selectedSymbols.length} indices (${selectedSymbols.join(
            ', '
          )}). Telegram Alerts: ${deliveredCount} of ${selectedSymbols.length} delivered.`,
        });
      } else {
        setBannerNotice({
          type: 'error',
          message: data.error || 'Manual execution returned an error.',
        });
      }

      await fetchCandles(config.activeSymbol);
      await fetchLogs();
      await fetchCronStatus();
    } catch (err: any) {
      setBannerNotice({
        type: 'error',
        message: err.message || 'Network error triggering manual run.',
      });
    } finally {
      setIsRunningManual(false);
    }
  };

  // Checkbox Selection Toggled
  const handleSelectedSymbolsChange = async (newSelected: string[]) => {
    setSelectedSymbols(newSelected);
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedSymbols: newSelected }),
      });
      fetchLogs();
    } catch (err) {
      console.error('Failed to save selected symbols:', err);
    }
  };

  // Change Active Preview Chart Symbol
  const handleSymbolChange = async (newSymbol: string) => {
    setConfig((prev: any) => ({ ...prev, activeSymbol: newSymbol }));
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeSymbol: newSymbol }),
      });
      fetchCandles(newSymbol);
      fetchLogs();
    } catch (err) {
      console.error('Failed to change symbol:', err);
    }
  };

  // Save Credentials
  const handleSaveCredentials = async (data: any) => {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const resData = await res.json();
      if (resData.config) setConfig(resData.config);
      await fetchLogs();
    }
  };

  // Test Deriv Token
  const handleTestDeriv = async (token?: string) => {
    const res = await fetch('/api/test-deriv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    await fetchLogs();
    return data;
  };

  // Test Telegram
  const handleTestTelegram = async (botToken?: string, chatId?: string) => {
    const res = await fetch('/api/test-telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botToken, chatId }),
    });
    const data = await res.json();
    await fetchLogs();
    return data;
  };

  // Toggle Cron Schedulers
  const handleToggleCron = async (key: string, value: boolean) => {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.config) setConfig(data.config);
      await fetchCronStatus();
      await fetchLogs();
    }
  };

  // Run Meta-Research
  const handleRunMetaResearch = async () => {
    setIsMetaResearching(true);
    try {
      const res = await fetch('/api/run-meta-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        setMetaResearchModal({
          isOpen: true,
          summary: data.summary,
          telegramSent: data.telegramSent,
          findings: data.findings || [],
        });
      }
      await fetchLogs();
    } catch (err: any) {
      alert(`Meta-Research failed: ${err.message}`);
    } finally {
      setIsMetaResearching(false);
    }
  };

  // Clear Logs
  const handleClearLogs = async () => {
    await fetch('/api/clear-logs', { method: 'POST' });
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Sticky Header with Multi-Index Count and Quick Trigger */}
      <Header
        onManualRun={handleManualRun}
        isRunning={isRunningManual}
        activeSymbol={config.activeSymbol || 'R_75'}
        onSymbolChange={handleSymbolChange}
        symbols={symbols}
        selectedSymbolsCount={selectedSymbols.length}
        lastRunStatus={config.lastRunStatus}
        lastRunTime={config.lastRunTime}
        hasTgBot={config.hasTgBotToken && config.hasTgChatId}
        hasDerivToken={config.hasDerivToken}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full px-4 lg:px-8 py-6 space-y-6 flex-1">
        {/* Optional Notification Banner */}
        {bannerNotice && (
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium animate-in fade-in ${
              bannerNotice.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : bannerNotice.type === 'error'
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {bannerNotice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{bannerNotice.message}</span>
            </div>
            <button
              onClick={() => setBannerNotice(null)}
              className="text-xs opacity-70 hover:opacity-100 underline ml-3"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 1. Interactive Multi-Index Clickbox / Checkbox Selection */}
        <IndexSelector
          symbols={symbols}
          selectedSymbols={selectedSymbols}
          onChange={handleSelectedSymbolsChange}
          disabled={isRunningManual}
        />

        {/* 2. Candles Chart for active inspected index */}
        <CandleChart
          candles={candleData.candles}
          indicators={candleData.indicators}
          symbol={config.activeSymbol || 'R_75'}
          source={candleData.source}
          onRefresh={() => fetchCandles(config.activeSymbol)}
          isLoading={isRefreshingCandles}
        />

        {/* 3. Middle Two-Column Grid: Config & Schedules vs Multi-Agent Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (5 cols): Credentials & Cron Automation */}
          <div className="lg:col-span-5 space-y-6">
            <CredentialsCard
              initialConfig={config}
              onSave={handleSaveCredentials}
              onTestDeriv={handleTestDeriv}
              onTestTelegram={handleTestTelegram}
            />

            <CronScheduleCard
              config={config}
              cronStats={cronStatus?.stats}
              onToggleCron={handleToggleCron}
              onRunMetaResearch={handleRunMetaResearch}
              isMetaResearching={isMetaResearching}
            />
          </div>

          {/* Right Column (7 cols): Multi-Agent Consensus & Execution Plan */}
          <div className="lg:col-span-7 space-y-6">
            <AnalysisCard
              analysis={lastAnalysis}
              analyses={analyses}
              isRunning={isRunningManual}
              activeSymbol={config.activeSymbol || 'R_75'}
              onSymbolSelect={(sym) => {
                handleSymbolChange(sym);
              }}
            />
          </div>
        </div>

        {/* 4. Bottom Section: Live Activity Log & Telegram Dispatch History */}
        <ActivityLogView
          logs={logs}
          telegramHistory={telegramHistory}
          onClearLogs={handleClearLogs}
        />
      </main>

      {/* Meta-Research Modal */}
      <MetaResearchModal
        isOpen={metaResearchModal.isOpen}
        onClose={() => setMetaResearchModal((prev) => ({ ...prev, isOpen: false }))}
        summary={metaResearchModal.summary}
        telegramSent={metaResearchModal.telegramSent}
        findings={metaResearchModal.findings}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-4 text-center text-xs text-slate-500 font-mono">
        <p>
          Deriv Multi-Index Synthetic Intelligence Desk • Node.js WebSocket Engine • Telegram Alert System
        </p>
      </footer>
    </div>
  );
}
