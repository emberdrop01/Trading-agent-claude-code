export interface DerivCandle {
  epoch: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface TechnicalIndicators {
  currentPrice: number;
  sma9: number;
  sma21: number;
  rsi14: number;
  priceChangePercent: number;
  high50: number;
  low50: number;
  trend: 'BULLISH' | 'BEARISH' | 'RANGING';
}

export interface PersonaAnalysis {
  researcher: {
    patterns: string[];
    supportLevels: number[];
    resistanceLevels: number[];
    marketStructure: string;
    details: string;
  };
  analyst: {
    thesis: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    rationale: string;
    targetZone: string;
    invalidationZone: string;
    details: string;
  };
  redTeam: {
    keyRisks: string[];
    failureScenarios: string[];
    trapHazards: string;
    details: string;
  };
  manager: {
    verdict: 'STRONG BUY' | 'BUY' | 'WAIT / NEUTRAL' | 'SELL' | 'STRONG SELL';
    confidenceScore: number; // 0 - 100
    signal: 'BUY' | 'SELL' | 'WAIT';
    entryZone: string;
    stopLoss: string;
    takeProfit1: string;
    takeProfit2: string;
    riskRewardRatio: string;
    recommendedRiskPercent: string;
    summary: string;
  };
  fullMarkdown: string;
  timestamp: string;
  symbol: string;
}

export interface AppConfig {
  derivToken: string;
  tgBotToken: string;
  tgChatId: string;
  geminiKeyOverride?: string;
  activeSymbol: string;
  selectedSymbols: string[];
  cron30mEnabled: boolean;
  cron1hEnabled: boolean;
  cron4hEnabled: boolean;
  cronDailyResearchEnabled: boolean;
  lastRunTime?: string;
  lastRunStatus?: 'success' | 'error' | 'idle';
  lastRunError?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  category: 'DERIV_WS' | 'AI_ENGINE' | 'TELEGRAM' | 'CRON' | 'RESEARCH' | 'SYSTEM';
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
  metadata?: Record<string, unknown>;
}

export interface TelegramMessageRecord {
  id: string;
  timestamp: string;
  chatId: string;
  preview: string;
  fullText: string;
  status: 'sent' | 'failed';
  error?: string;
}
