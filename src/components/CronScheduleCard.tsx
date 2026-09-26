import React, { useState } from 'react';
import { Clock, CheckCircle2, Play, Sparkles, RefreshCw } from 'lucide-react';

interface CronScheduleCardProps {
  config: {
    cron30mEnabled: boolean;
    cron1hEnabled: boolean;
    cron4hEnabled: boolean;
    cronDailyResearchEnabled: boolean;
    lastRunTime?: string;
    lastRunStatus?: 'success' | 'error' | 'idle';
  };
  cronStats?: {
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    lastRunSource: string;
    lastRunAt: string | null;
  };
  onToggleCron: (key: string, value: boolean) => Promise<void>;
  onRunMetaResearch: () => Promise<void>;
  isMetaResearching: boolean;
}

export const CronScheduleCard: React.FC<CronScheduleCardProps> = ({
  config,
  cronStats,
  onToggleCron,
  onRunMetaResearch,
  isMetaResearching,
}) => {
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  const schedules = [
    {
      key: 'cron30mEnabled',
      name: '30-Minute Cycle',
      desc: 'Rapid momentum & candle structure scan',
      cron: '*/30 * * * *',
      enabled: config.cron30mEnabled,
      badge: 'High Frequency',
    },
    {
      key: 'cron1hEnabled',
      name: '1-Hour Macro Thesis',
      desc: 'Hourly trend confirmation & key level shifts',
      cron: '0 * * * *',
      enabled: config.cron1hEnabled,
      badge: 'Balanced',
    },
    {
      key: 'cron4hEnabled',
      name: '4-Hour Swing Regime',
      desc: 'Institutional support/resistance & major breaks',
      cron: '0 */4 * * *',
      enabled: config.cron4hEnabled,
      badge: 'Swing Conviction',
    },
    {
      key: 'cronDailyResearchEnabled',
      name: 'Daily Meta-Research',
      desc: 'DuckDuckGo + Gemini AI strategy intelligence',
      cron: '0 0 * * *',
      enabled: config.cronDailyResearchEnabled,
      badge: 'R&D Upgrade',
    },
  ];

  const handleToggle = async (key: string, current: boolean) => {
    setUpdatingKey(key);
    try {
      await onToggleCron(key, !current);
    } finally {
      setUpdatingKey(null);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Cron Background Schedules</h2>
            <p className="text-xs text-slate-400">Autonomous node-cron triggers on server</p>
          </div>
        </div>

        <button
          onClick={onRunMetaResearch}
          disabled={isMetaResearching}
          className="text-xs px-3 py-1.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 flex items-center gap-1.5 transition-colors font-medium disabled:opacity-50"
          title="Run DuckDuckGo search & Gemini analysis right now"
        >
          {isMetaResearching ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          )}
          <span>{isMetaResearching ? 'Searching...' : 'Run Meta-Research'}</span>
        </button>
      </div>

      {/* Schedulers List */}
      <div className="space-y-2.5">
        {schedules.map((s) => (
          <div
            key={s.key}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all"
          >
            <div className="flex items-start gap-2.5">
              <div
                className={`w-2 h-2 rounded-full mt-1.5 ${
                  s.enabled ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-600'
                }`}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-200">{s.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-400 border border-slate-700">
                    {s.cron}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">{s.desc}</p>
              </div>
            </div>

            <button
              onClick={() => handleToggle(s.key, s.enabled)}
              disabled={updatingKey === s.key}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                s.enabled ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  s.enabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Stats summary */}
      {cronStats && (
        <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
            <span className="text-[10px] uppercase text-slate-500 font-mono block">Total Runs</span>
            <span className="text-xs font-bold text-slate-200 font-mono">{cronStats.totalRuns}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
            <span className="text-[10px] uppercase text-slate-500 font-mono block">Success</span>
            <span className="text-xs font-bold text-emerald-400 font-mono">{cronStats.successfulRuns}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
            <span className="text-[10px] uppercase text-slate-500 font-mono block">Last Trigger</span>
            <span className="text-xs font-bold text-cyan-400 font-mono truncate block" title={cronStats.lastRunSource}>
              {cronStats.lastRunSource || 'None'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
