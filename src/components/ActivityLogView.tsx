import React, { useState } from 'react';
import { Terminal, Send, Trash2, CheckCircle2, AlertTriangle, AlertCircle, Info, ExternalLink } from 'lucide-react';

interface ActivityLog {
  id: string;
  timestamp: string;
  category: 'DERIV_WS' | 'AI_ENGINE' | 'TELEGRAM' | 'CRON' | 'RESEARCH' | 'SYSTEM';
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

interface TelegramMessageRecord {
  id: string;
  timestamp: string;
  chatId: string;
  preview: string;
  fullText: string;
  status: 'sent' | 'failed';
  error?: string;
}

interface ActivityLogViewProps {
  logs: ActivityLog[];
  telegramHistory: TelegramMessageRecord[];
  onClearLogs: () => void;
}

export const ActivityLogView: React.FC<ActivityLogViewProps> = ({
  logs,
  telegramHistory,
  onClearLogs,
}) => {
  const [tab, setTab] = useState<'logs' | 'telegram'>('logs');
  const [selectedTgMsg, setSelectedTgMsg] = useState<TelegramMessageRecord | null>(null);

  const getCategoryColor = (category: ActivityLog['category']) => {
    switch (category) {
      case 'DERIV_WS':
        return 'text-blue-400 bg-blue-950/60 border-blue-900';
      case 'AI_ENGINE':
        return 'text-purple-400 bg-purple-950/60 border-purple-900';
      case 'TELEGRAM':
        return 'text-cyan-400 bg-cyan-950/60 border-cyan-900';
      case 'CRON':
        return 'text-emerald-400 bg-emerald-950/60 border-emerald-900';
      case 'RESEARCH':
        return 'text-amber-400 bg-amber-950/60 border-amber-900';
      default:
        return 'text-slate-400 bg-slate-900 border-slate-800';
    }
  };

  const getLevelIcon = (level: ActivityLog['level']) => {
    switch (level) {
      case 'success':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'warn':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
      default:
        return <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur flex flex-col">
      {/* Header with Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('logs')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              tab === 'logs'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Activity Log ({logs.length})</span>
          </button>

          <button
            onClick={() => setTab('telegram')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              tab === 'telegram'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Last 5 Telegram Alerts ({telegramHistory.length})</span>
          </button>
        </div>

        {tab === 'logs' && (
          <button
            onClick={onClearLogs}
            className="text-[11px] text-slate-500 hover:text-rose-400 flex items-center gap-1 transition-colors"
            title="Clear all logs"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Tab 1: Terminal Activity Logs */}
      {tab === 'logs' && (
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 font-mono text-[11px] overflow-y-auto max-h-[320px] space-y-2">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No activity logged yet.</div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2.5 p-1.5 rounded hover:bg-slate-900/60 transition-colors border-l-2 border-slate-700/60"
              >
                {getLevelIcon(log.level)}
                <span className="text-slate-500 shrink-0">
                  [{new Date(log.timestamp).toLocaleTimeString()}]
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded border text-[9px] uppercase font-bold shrink-0 ${getCategoryColor(
                    log.category
                  )}`}
                >
                  {log.category}
                </span>
                <span
                  className={`flex-1 break-words ${
                    log.level === 'error'
                      ? 'text-rose-300'
                      : log.level === 'warn'
                      ? 'text-amber-300'
                      : log.level === 'success'
                      ? 'text-emerald-300'
                      : 'text-slate-300'
                  }`}
                >
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Last 5 Telegram Messages */}
      {tab === 'telegram' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2.5 max-h-[320px] overflow-y-auto">
            {telegramHistory.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/50 rounded-xl border border-slate-800 text-slate-500 text-xs">
                No Telegram messages have been dispatched yet. Add your bot credentials and trigger a run or test ping.
              </div>
            ) : (
              telegramHistory.slice(0, 5).map((msg, index) => (
                <div
                  key={msg.id || index}
                  onClick={() => setSelectedTgMsg(msg)}
                  className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-cyan-500/40 cursor-pointer transition-all flex items-start justify-between gap-3 group"
                >
                  <div className="space-y-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        Chat: {msg.chatId}
                      </span>
                      <span className="text-slate-600 text-xs">•</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(msg.timestamp).toLocaleString()}
                      </span>
                      <span
                        className={`text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded font-mono ${
                          msg.status === 'sent'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}
                      >
                        {msg.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 truncate font-mono">{msg.preview}</p>
                    {msg.error && <p className="text-[11px] text-rose-400">{msg.error}</p>}
                  </div>

                  <span className="text-xs text-cyan-400 group-hover:translate-x-0.5 transition-transform shrink-0 font-medium flex items-center gap-1">
                    View
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Expanded Telegram Message Modal / Drawer */}
          {selectedTgMsg && (
            <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/30 text-xs space-y-2 mt-3 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-semibold text-cyan-300">
                  Telegram Dispatched Payload ({new Date(selectedTgMsg.timestamp).toLocaleString()})
                </span>
                <button
                  onClick={() => setSelectedTgMsg(null)}
                  className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded bg-slate-800"
                >
                  Close
                </button>
              </div>
              <pre className="font-mono text-[11px] text-slate-300 whitespace-pre-wrap max-h-56 overflow-y-auto bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                {selectedTgMsg.fullText}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
