import fs from 'fs';
import path from 'path';
import { AppConfig, ActivityLog, TelegramMessageRecord, PersonaAnalysis } from './types';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const CONFIG_FILE = path.join(DATA_DIR, 'trading_config.json');
const LOGS_FILE = path.join(DATA_DIR, 'activity_logs.json');
const TELEGRAM_HISTORY_FILE = path.join(DATA_DIR, 'telegram_history.json');
const LAST_ANALYSIS_FILE = path.join(DATA_DIR, 'last_analysis.json');
const LAST_ANALYSES_FILE = path.join(DATA_DIR, 'last_analyses_by_symbol.json');

const DEFAULT_CONFIG: AppConfig = {
  derivToken: '',
  tgBotToken: '',
  tgChatId: '',
  geminiKeyOverride: '',
  activeSymbol: 'R_75',
  selectedSymbols: ['R_75', 'R_100'],
  cron30mEnabled: true,
  cron1hEnabled: false,
  cron4hEnabled: false,
  cronDailyResearchEnabled: true,
  lastRunStatus: 'idle',
};

class ConfigStore {
  private config: AppConfig;
  private logs: ActivityLog[] = [];
  private telegramHistory: TelegramMessageRecord[] = [];
  private lastAnalysis: PersonaAnalysis | null = null;
  private lastAnalysesBySymbol: Record<string, PersonaAnalysis> = {};

  constructor() {
    this.ensureDirExists();
    this.config = this.loadConfig();
    this.logs = this.loadLogs();
    this.telegramHistory = this.loadTelegramHistory();
    this.lastAnalysis = this.loadLastAnalysis();
    this.lastAnalysesBySymbol = this.loadLastAnalysesBySymbol();

    if (this.logs.length === 0) {
      this.addLog('SYSTEM', 'info', 'Trading Analyst Engine initialized. Ready for Deriv & Telegram integration.');
    }
  }

  private ensureDirExists() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch (err) {
      console.error('Error creating .data dir:', err);
    }
  }

  private loadConfig(): AppConfig {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
        return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
      }
    } catch (err) {
      console.warn('Could not read config file, using defaults:', err);
    }
    return { ...DEFAULT_CONFIG };
  }

  private saveConfigFile() {
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving config file:', err);
    }
  }

  private loadLogs(): ActivityLog[] {
    try {
      if (fs.existsSync(LOGS_FILE)) {
        const raw = fs.readFileSync(LOGS_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Could not read logs file:', err);
    }
    return [];
  }

  private saveLogsFile() {
    try {
      // Keep up to 200 logs
      const trimmed = this.logs.slice(-200);
      fs.writeFileSync(LOGS_FILE, JSON.stringify(trimmed, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving logs file:', err);
    }
  }

  private loadTelegramHistory(): TelegramMessageRecord[] {
    try {
      if (fs.existsSync(TELEGRAM_HISTORY_FILE)) {
        const raw = fs.readFileSync(TELEGRAM_HISTORY_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Could not read telegram history file:', err);
    }
    return [];
  }

  private saveTelegramHistoryFile() {
    try {
      const trimmed = this.telegramHistory.slice(-50);
      fs.writeFileSync(TELEGRAM_HISTORY_FILE, JSON.stringify(trimmed, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving telegram history file:', err);
    }
  }

  private loadLastAnalysis(): PersonaAnalysis | null {
    try {
      if (fs.existsSync(LAST_ANALYSIS_FILE)) {
        const raw = fs.readFileSync(LAST_ANALYSIS_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch {
      return null;
    }
    return null;
  }

  private loadLastAnalysesBySymbol(): Record<string, PersonaAnalysis> {
    try {
      if (fs.existsSync(LAST_ANALYSES_FILE)) {
        const raw = fs.readFileSync(LAST_ANALYSES_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch {
      return {};
    }
    return {};
  }

  private saveLastAnalysesFile() {
    try {
      fs.writeFileSync(LAST_ANALYSES_FILE, JSON.stringify(this.lastAnalysesBySymbol, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving last analyses by symbol file:', err);
    }
  }

  public saveLastAnalysis(analysis: PersonaAnalysis) {
    this.lastAnalysis = analysis;
    this.lastAnalysesBySymbol[analysis.symbol] = analysis;
    try {
      fs.writeFileSync(LAST_ANALYSIS_FILE, JSON.stringify(analysis, null, 2), 'utf-8');
      this.saveLastAnalysesFile();
    } catch (err) {
      console.error('Error saving last analysis file:', err);
    }
  }

  public getLastAnalysis(): PersonaAnalysis | null {
    return this.lastAnalysis;
  }

  public getLastAnalyses(): Record<string, PersonaAnalysis> {
    return { ...this.lastAnalysesBySymbol };
  }

  public getConfig(): AppConfig {
    return { ...this.config };
  }

  public getMaskedConfig() {
    const mask = (str: string) => {
      if (!str || str.length <= 6) return str ? '***' : '';
      return `${str.slice(0, 3)}...${str.slice(-3)}`;
    };

    return {
      derivTokenMasked: mask(this.config.derivToken),
      hasDerivToken: Boolean(this.config.derivToken),
      tgBotTokenMasked: mask(this.config.tgBotToken),
      hasTgBotToken: Boolean(this.config.tgBotToken),
      tgChatId: this.config.tgChatId,
      hasTgChatId: Boolean(this.config.tgChatId),
      geminiKeyOverrideMasked: mask(this.config.geminiKeyOverride || ''),
      hasGeminiKeyOverride: Boolean(this.config.geminiKeyOverride),
      hasServerGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      activeSymbol: this.config.activeSymbol || 'R_75',
      selectedSymbols: this.config.selectedSymbols && this.config.selectedSymbols.length > 0
        ? this.config.selectedSymbols
        : ['R_75', 'R_100'],
      cron30mEnabled: this.config.cron30mEnabled,
      cron1hEnabled: this.config.cron1hEnabled,
      cron4hEnabled: this.config.cron4hEnabled,
      cronDailyResearchEnabled: this.config.cronDailyResearchEnabled,
      lastRunTime: this.config.lastRunTime,
      lastRunStatus: this.config.lastRunStatus,
      lastRunError: this.config.lastRunError,
    };
  }

  public updateConfig(partial: Partial<AppConfig>) {
    // Only overwrite tokens if non-empty string is provided
    const updated: AppConfig = { ...this.config };

    if (partial.derivToken !== undefined && partial.derivToken.trim() !== '') {
      updated.derivToken = partial.derivToken.trim();
    }
    if (partial.tgBotToken !== undefined && partial.tgBotToken.trim() !== '') {
      updated.tgBotToken = partial.tgBotToken.trim();
    }
    if (partial.tgChatId !== undefined) {
      updated.tgChatId = partial.tgChatId.trim();
    }
    if (partial.geminiKeyOverride !== undefined) {
      updated.geminiKeyOverride = partial.geminiKeyOverride.trim();
    }
    if (partial.activeSymbol !== undefined) {
      updated.activeSymbol = partial.activeSymbol;
    }
    if (partial.selectedSymbols !== undefined && Array.isArray(partial.selectedSymbols)) {
      // Ensure at least one index is selected, or allow empty
      updated.selectedSymbols = partial.selectedSymbols;
      if (partial.selectedSymbols.length > 0 && !partial.selectedSymbols.includes(updated.activeSymbol)) {
        updated.activeSymbol = partial.selectedSymbols[0];
      }
    }
    if (partial.cron30mEnabled !== undefined) {
      updated.cron30mEnabled = partial.cron30mEnabled;
    }
    if (partial.cron1hEnabled !== undefined) {
      updated.cron1hEnabled = partial.cron1hEnabled;
    }
    if (partial.cron4hEnabled !== undefined) {
      updated.cron4hEnabled = partial.cron4hEnabled;
    }
    if (partial.cronDailyResearchEnabled !== undefined) {
      updated.cronDailyResearchEnabled = partial.cronDailyResearchEnabled;
    }
    if (partial.lastRunTime !== undefined) {
      updated.lastRunTime = partial.lastRunTime;
    }
    if (partial.lastRunStatus !== undefined) {
      updated.lastRunStatus = partial.lastRunStatus;
    }
    if (partial.lastRunError !== undefined) {
      updated.lastRunError = partial.lastRunError;
    }

    this.config = updated;
    this.saveConfigFile();
    this.addLog('SYSTEM', 'info', 'Configuration updated successfully.');
    return this.getMaskedConfig();
  }

  public addLog(
    category: ActivityLog['category'],
    level: ActivityLog['level'],
    message: string,
    metadata?: Record<string, unknown>
  ) {
    const log: ActivityLog = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      category,
      level,
      message,
      metadata,
    };
    this.logs.unshift(log); // Most recent first
    if (this.logs.length > 200) {
      this.logs.pop();
    }
    this.saveLogsFile();
    return log;
  }

  public getLogs(limit = 50): ActivityLog[] {
    return this.logs.slice(0, limit);
  }

  public clearLogs() {
    this.logs = [];
    this.addLog('SYSTEM', 'info', 'Activity logs cleared by user.');
    this.saveLogsFile();
  }

  public addTelegramMessage(record: Omit<TelegramMessageRecord, 'id' | 'timestamp'>) {
    const fullRecord: TelegramMessageRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...record,
    };
    this.telegramHistory.unshift(fullRecord);
    if (this.telegramHistory.length > 50) {
      this.telegramHistory.pop();
    }
    this.saveTelegramHistoryFile();
    return fullRecord;
  }

  public getTelegramHistory(limit = 10): TelegramMessageRecord[] {
    return this.telegramHistory.slice(0, limit);
  }
}

export const configStore = new ConfigStore();
