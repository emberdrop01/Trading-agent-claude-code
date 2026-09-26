import React, { useState } from 'react';
import { Key, Eye, EyeOff, Save, CheckCircle2, AlertCircle, Send, Check, HelpCircle, RefreshCw } from 'lucide-react';

interface CredentialsCardProps {
  initialConfig: {
    hasDerivToken: boolean;
    derivTokenMasked: string;
    hasTgBotToken: boolean;
    tgBotTokenMasked: string;
    tgChatId: string;
    hasTgChatId: boolean;
    geminiKeyOverrideMasked?: string;
    hasGeminiKeyOverride?: boolean;
    hasServerGeminiKey?: boolean;
  };
  onSave: (data: { derivToken?: string; tgBotToken?: string; tgChatId?: string; geminiKeyOverride?: string }) => Promise<void>;
  onTestDeriv: (token?: string) => Promise<{ valid: boolean; message: string }>;
  onTestTelegram: (botToken?: string, chatId?: string) => Promise<{ success: boolean; error?: string }>;
}

export const CredentialsCard: React.FC<CredentialsCardProps> = ({
  initialConfig,
  onSave,
  onTestDeriv,
  onTestTelegram,
}) => {
  const [derivToken, setDerivToken] = useState('');
  const [tgBotToken, setTgBotToken] = useState('');
  const [tgChatId, setTgChatId] = useState(initialConfig.tgChatId || '');
  const [geminiKeyOverride, setGeminiKeyOverride] = useState('');

  const [showDeriv, setShowDeriv] = useState(false);
  const [showTgBot, setShowTgBot] = useState(false);
  const [showGemini, setShowGemini] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTestingDeriv, setIsTestingDeriv] = useState(false);
  const [derivTestResult, setDerivTestResult] = useState<{ valid?: boolean; message?: string } | null>(null);

  const [isTestingTg, setIsTestingTg] = useState(false);
  const [tgTestResult, setTgTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

  const [showTgHelp, setShowTgHelp] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await onSave({
        derivToken: derivToken || undefined,
        tgBotToken: tgBotToken || undefined,
        tgChatId: tgChatId,
        geminiKeyOverride: geminiKeyOverride || undefined,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDerivTest = async () => {
    setIsTestingDeriv(true);
    setDerivTestResult(null);
    try {
      const res = await onTestDeriv(derivToken || undefined);
      setDerivTestResult(res);
    } catch (err: any) {
      setDerivTestResult({ valid: false, message: err.message || 'Deriv WebSocket test failed' });
    } finally {
      setIsTestingDeriv(false);
    }
  };

  const handleTelegramTest = async () => {
    setIsTestingTg(true);
    setTgTestResult(null);
    try {
      const res = await onTestTelegram(tgBotToken || undefined, tgChatId || undefined);
      if (res.success) {
        setTgTestResult({ success: true, message: 'Test message delivered to Telegram!' });
      } else {
        setTgTestResult({ success: false, message: res.error || 'Failed to send test ping' });
      }
    } catch (err: any) {
      setTgTestResult({ success: false, message: err.message || 'Telegram test error' });
    } finally {
      setIsTestingTg(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">API Credentials & Endpoints</h2>
            <p className="text-xs text-slate-400">Persisted securely in Node.js server storage</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowTgHelp(!showTgHelp)}
          className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors"
          title="Setup guide for Telegram"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Setup Help</span>
        </button>
      </div>

      {showTgHelp && (
        <div className="mb-5 p-3.5 rounded-xl bg-slate-950/70 border border-cyan-500/30 text-xs text-slate-300 space-y-2">
          <p className="font-semibold text-cyan-300">Quick Setup Instructions:</p>
          <ul className="list-disc pl-4 space-y-1 text-slate-300">
            <li>
              <strong>Deriv Read Token:</strong> Log in to Deriv → Settings → API Token → Create token with <span className="text-cyan-300 font-mono">Read</span> scope.
            </li>
            <li>
              <strong>Telegram Bot Token:</strong> Open Telegram, message <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-cyan-400 underline">@BotFather</a>, type <span className="font-mono">/newbot</span>, and copy the HTTP API token.
            </li>
            <li>
              <strong>Telegram Chat ID:</strong> Message <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-cyan-400 underline">@userinfobot</a> on Telegram to see your numeric ID (e.g. <span className="font-mono">123456789</span>). Remember to tap <em>/start</em> in your new bot!
            </li>
          </ul>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {/* 1. Deriv Read Token */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span>Deriv API Token</span>
              {initialConfig.hasDerivToken && (
                <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800">
                  Saved: {initialConfig.derivTokenMasked}
                </span>
              )}
            </label>
            <button
              type="button"
              onClick={handleDerivTest}
              disabled={isTestingDeriv}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors font-medium disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isTestingDeriv ? 'animate-spin' : ''}`} />
              <span>{isTestingDeriv ? 'Testing WS...' : 'Test Connection'}</span>
            </button>
          </div>
          <div className="relative">
            <input
              type={showDeriv ? 'text' : 'password'}
              value={derivToken}
              onChange={(e) => setDerivToken(e.target.value)}
              placeholder={initialConfig.hasDerivToken ? 'Leave blank to keep saved token' : 'Paste Deriv Read Token'}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono pr-10"
            />
            <button
              type="button"
              onClick={() => setShowDeriv(!showDeriv)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
            >
              {showDeriv ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {derivTestResult && (
            <div
              className={`mt-1.5 text-xs flex items-center gap-1.5 font-medium ${
                derivTestResult.valid ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {derivTestResult.valid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              <span>{derivTestResult.message}</span>
            </div>
          )}
        </div>

        {/* 2. Telegram Bot Token */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span>Telegram Bot Token</span>
              {initialConfig.hasTgBotToken && (
                <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800">
                  Saved: {initialConfig.tgBotTokenMasked}
                </span>
              )}
            </label>
          </div>
          <div className="relative">
            <input
              type={showTgBot ? 'text' : 'password'}
              value={tgBotToken}
              onChange={(e) => setTgBotToken(e.target.value)}
              placeholder={initialConfig.hasTgBotToken ? 'Leave blank to keep saved bot token' : 'e.g. 7123456789:AAH...'}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono pr-10"
            />
            <button
              type="button"
              onClick={() => setShowTgBot(!showTgBot)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
            >
              {showTgBot ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 3. Telegram Chat ID */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Telegram Chat ID
            </label>
            <button
              type="button"
              onClick={handleTelegramTest}
              disabled={isTestingTg || (!tgChatId && !initialConfig.hasTgChatId)}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors font-medium disabled:opacity-50"
            >
              <Send className={`w-3 h-3 ${isTestingTg ? 'animate-pulse' : ''}`} />
              <span>{isTestingTg ? 'Sending Ping...' : 'Send Test Ping'}</span>
            </button>
          </div>
          <input
            type="text"
            value={tgChatId}
            onChange={(e) => setTgChatId(e.target.value)}
            placeholder="e.g. 987654321 or -100123456789"
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
          />
          {tgTestResult && (
            <div
              className={`mt-1.5 text-xs flex items-center gap-1.5 font-medium ${
                tgTestResult.success ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {tgTestResult.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              <span>{tgTestResult.message}</span>
            </div>
          )}
        </div>

        {/* 4. Optional Gemini Override */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <span>Gemini API Key (Optional)</span>
              {initialConfig.hasServerGeminiKey && (
                <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/60">
                  Server Env Injected
                </span>
              )}
            </label>
          </div>
          <div className="relative">
            <input
              type={showGemini ? 'text' : 'password'}
              value={geminiKeyOverride}
              onChange={(e) => setGeminiKeyOverride(e.target.value)}
              placeholder="Leave blank to use default server key"
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono pr-10"
            />
            <button
              type="button"
              onClick={() => setShowGemini(!showGemini)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
            >
              {showGemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit Save Button */}
        <button
          type="submit"
          disabled={isSaving}
          className="w-full mt-2 bg-slate-800 hover:bg-slate-700/90 text-white font-medium py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-[0.99]"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              <span>Saving Securely...</span>
            </>
          ) : saveSuccess ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Settings Saved!</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5 text-cyan-400" />
              <span>Save & Update Server Credentials</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
