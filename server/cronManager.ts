import cron, { ScheduledTask } from 'node-cron';
import { configStore } from './configStore';
import { fetchDerivOHLCV } from './derivService';
import { runMultiAgentAnalysis } from './aiEngine';
import { formatTelegramTradeAlert, sendTelegramMessage } from './telegramService';
import { runMetaResearchPipeline } from './metaResearcher';

export interface PipelineExecutionOptions {
  triggerSource: 'CRON_30M' | 'CRON_1H' | 'CRON_4H' | 'MANUAL_RUN' | 'SYSTEM';
  symbolOverride?: string;
  symbolsOverride?: string[];
}

export interface SingleSymbolResult {
  symbol: string;
  success: boolean;
  analysis?: any;
  telegramResult?: any;
  error?: string;
}

export interface PipelineExecutionResult {
  success: boolean;
  symbols: string[];
  source: string;
  results: SingleSymbolResult[];
  analysis?: any; // primary or last analysis for backward compatibility
  telegramResult?: any;
  error?: string;
  timestamp: string;
}

class CronManager {
  private task30m: ScheduledTask | null = null;
  private task1h: ScheduledTask | null = null;
  private task4h: ScheduledTask | null = null;
  private taskDailyResearch: ScheduledTask | null = null;

  private stats = {
    totalRuns: 0,
    successfulRuns: 0,
    failedRuns: 0,
    lastRunSource: 'None',
    lastRunAt: null as string | null,
  };

  /**
   * Orchestrates the automated analysis pipeline across all selected synthetic indices
   */
  public async executePipeline(options: PipelineExecutionOptions): Promise<PipelineExecutionResult> {
    const config = configStore.getConfig();

    // Determine target symbols:
    // If symbolsOverride is provided, use that;
    // else if single symbolOverride is provided, use that;
    // else use config.selectedSymbols (or activeSymbol fallback)
    let targetSymbols: string[] = [];
    if (options.symbolsOverride && options.symbolsOverride.length > 0) {
      targetSymbols = options.symbolsOverride;
    } else if (options.symbolOverride) {
      targetSymbols = [options.symbolOverride];
    } else if (config.selectedSymbols && config.selectedSymbols.length > 0) {
      targetSymbols = config.selectedSymbols;
    } else {
      targetSymbols = [config.activeSymbol || 'R_75'];
    }

    configStore.addLog(
      'CRON',
      'info',
      `Executing Pipeline Trigger: [${options.triggerSource}] on ${targetSymbols.length} indices: ${targetSymbols.join(', ')}...`
    );

    this.stats.totalRuns++;
    this.stats.lastRunSource = options.triggerSource;
    this.stats.lastRunAt = new Date().toISOString();

    const results: SingleSymbolResult[] = [];
    let lastValidAnalysis: any = null;
    let anySuccess = false;
    let anyErrorMsg = '';

    for (const symbol of targetSymbols) {
      try {
        configStore.addLog('CRON', 'info', `Processing index ${symbol} (${results.length + 1}/${targetSymbols.length})...`);

        // 1. Fetch 50 OHLCV candles from Deriv WebSocket
        const derivResult = await fetchDerivOHLCV(config.derivToken, symbol, 50);

        // 2. Multi-Agent AI Analysis (Researcher -> Analyst -> Red Team -> Manager)
        const analysis = await runMultiAgentAnalysis(
          derivResult.candles,
          derivResult.indicators,
          symbol
        );

        // 3. Dispatch Manager verdict to Telegram for this index
        const alertText = formatTelegramTradeAlert(analysis);
        const telegramResult = await sendTelegramMessage(alertText);

        lastValidAnalysis = analysis;
        anySuccess = true;

        results.push({
          symbol,
          success: true,
          analysis,
          telegramResult,
        });

        configStore.addLog(
          'SYSTEM',
          'success',
          `Report sent for ${symbol}: ${analysis.manager.verdict} (${analysis.manager.confidenceScore}%). Telegram: ${
            telegramResult.success ? 'Delivered' : 'Pending/Failed'
          }`
        );
      } catch (err: any) {
        const errorMsg = err.message || `Failed to analyze ${symbol}`;
        anyErrorMsg = errorMsg;
        results.push({
          symbol,
          success: false,
          error: errorMsg,
        });
        configStore.addLog('SYSTEM', 'error', `Failed analysis on ${symbol}: ${errorMsg}`);
      }
    }

    if (anySuccess) {
      this.stats.successfulRuns++;
      configStore.updateConfig({
        lastRunTime: new Date().toISOString(),
        lastRunStatus: 'success',
        lastRunError: '',
      });
    } else {
      this.stats.failedRuns++;
      configStore.updateConfig({
        lastRunTime: new Date().toISOString(),
        lastRunStatus: 'error',
        lastRunError: anyErrorMsg,
      });
    }

    return {
      success: anySuccess,
      symbols: targetSymbols,
      source: options.triggerSource,
      results,
      analysis: lastValidAnalysis,
      timestamp: new Date().toISOString(),
      error: anySuccess ? undefined : anyErrorMsg,
    };
  }

  /**
   * Initializes and schedules all node-cron jobs
   */
  public initialize() {
    configStore.addLog('CRON', 'info', 'Initializing node-cron background schedulers...');

    // 1. Every 30 minutes ('*/30 * * * *')
    this.task30m = cron.schedule('*/30 * * * *', async () => {
      const config = configStore.getConfig();
      if (!config.cron30mEnabled) {
        configStore.addLog('CRON', 'info', '30m Cron triggered but disabled in settings. Skipping.');
        return;
      }
      await this.executePipeline({ triggerSource: 'CRON_30M' });
    });

    // 2. Every 1 hour ('0 * * * *')
    this.task1h = cron.schedule('0 * * * *', async () => {
      const config = configStore.getConfig();
      if (!config.cron1hEnabled) return;
      await this.executePipeline({ triggerSource: 'CRON_1H' });
    });

    // 3. Every 4 hours ('0 */4 * * *')
    this.task4h = cron.schedule('0 */4 * * *', async () => {
      const config = configStore.getConfig();
      if (!config.cron4hEnabled) return;
      await this.executePipeline({ triggerSource: 'CRON_4H' });
    });

    // 4. Daily Meta-Research ('0 0 * * *' - midnight daily)
    this.taskDailyResearch = cron.schedule('0 0 * * *', async () => {
      const config = configStore.getConfig();
      if (!config.cronDailyResearchEnabled) return;
      configStore.addLog('CRON', 'info', 'Daily Meta-Research Cron triggered.');
      await runMetaResearchPipeline();
    });

    configStore.addLog(
      'CRON',
      'success',
      'All 4 node-cron background tasks scheduled (30m, 1h, 4h, Daily Meta-Research).'
    );
  }

  public getStatus() {
    const config = configStore.getConfig();
    return {
      stats: this.stats,
      schedules: [
        {
          id: 'cron30m',
          name: '30-Minute Analyst Pipeline',
          expression: '*/30 * * * *',
          interval: 'Every 30 minutes',
          enabled: config.cron30mEnabled,
          active: Boolean(this.task30m),
        },
        {
          id: 'cron1h',
          name: '1-Hour Macro Thesis',
          expression: '0 * * * *',
          interval: 'Every 1 hour',
          enabled: config.cron1hEnabled,
          active: Boolean(this.task1h),
        },
        {
          id: 'cron4h',
          name: '4-Hour Regime Shift Scanner',
          expression: '0 */4 * * *',
          interval: 'Every 4 hours',
          enabled: config.cron4hEnabled,
          active: Boolean(this.task4h),
        },
        {
          id: 'cronDailyResearch',
          name: 'Daily Meta-Research Intelligence',
          expression: '0 0 * * *',
          interval: 'Daily at 00:00 UTC',
          enabled: config.cronDailyResearchEnabled,
          active: Boolean(this.taskDailyResearch),
        },
      ],
    };
  }
}

export const cronManager = new CronManager();
