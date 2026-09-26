import fs from 'fs';
import path from 'path';
import { fetchDerivOHLCV } from './lib/deriv.mjs';
import { runMultiAgentAnalysis } from './lib/ai.mjs';
import { formatTelegramTradeAlert, sendTelegramMessage } from './lib/telegram.mjs';

function log(category, level, message) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${category}] ${message}`);
}

function readEnvList(name, fallback) {
  const raw = process.env[name];
  if (!raw || !raw.trim()) return fallback;
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  const derivToken = process.env.DERIV_TOKEN || '';
  const tgBotToken = process.env.TG_BOT_TOKEN || '';
  const tgChatId = process.env.TG_CHAT_ID || '';
  const geminiApiKey = process.env.GEMINI_API_KEY || '';
  const symbols = readEnvList('SYMBOLS', ['R_75', 'R_100']);
  const candleCount = Number(process.env.CANDLE_COUNT) || 50;
  const triggerSource = process.env.TRIGGER_SOURCE || 'GITHUB_ACTIONS_CRON';

  log('SYSTEM', 'info', `Pipeline start. Trigger=${triggerSource} Symbols=[${symbols.join(', ')}]`);

  if (!tgBotToken || !tgChatId) {
    log('SYSTEM', 'warn', 'TG_BOT_TOKEN / TG_CHAT_ID not set — alerts will be computed but NOT delivered.');
  }
  if (!geminiApiKey) {
    log('SYSTEM', 'warn', 'GEMINI_API_KEY not set — using deterministic quantitative model for all symbols.');
  }

  const results = [];
  let anySuccess = false;

  for (const symbol of symbols) {
    const symLog = (level, message) => log(symbol, level, message);
    try {
      symLog('info', `Processing ${symbol} (${results.length + 1}/${symbols.length})...`);

      const derivResult = await fetchDerivOHLCV(derivToken, symbol, candleCount, symLog);
      const analysis = await runMultiAgentAnalysis(
        derivResult.candles,
        derivResult.indicators,
        symbol,
        geminiApiKey,
        symLog
      );

      const alertText = formatTelegramTradeAlert(analysis);
      const telegramResult = await sendTelegramMessage(alertText, tgBotToken, tgChatId, symLog);

      anySuccess = true;
      results.push({
        symbol,
        success: true,
        verdict: analysis.manager.verdict,
        confidence: analysis.manager.confidenceScore,
        engine: analysis.engine,
        dataSource: derivResult.source,
        telegramSent: telegramResult.success,
      });

      symLog(
        'success',
        `Done: ${analysis.manager.verdict} (${analysis.manager.confidenceScore}%) via ${analysis.engine}. Telegram: ${
          telegramResult.success ? 'sent' : 'not sent'
        }`
      );
    } catch (err) {
      symLog('error', `Failed: ${err.message}`);
      results.push({ symbol, success: false, error: err.message });
    }
  }

  // Write a small status file. The workflow commits this back to the repo so
  // (a) you have a visible history of runs without needing a dashboard, and
  // (b) the commit itself counts as repo activity, which keeps GitHub from
  // auto-disabling the schedule after 60 days of silence.
  const statusPath = path.resolve(process.cwd(), 'status.json');
  const status = {
    lastRunAt: new Date().toISOString(),
    triggerSource,
    results,
  };
  try {
    fs.writeFileSync(statusPath, JSON.stringify(status, null, 2) + '\n', 'utf-8');
    log('SYSTEM', 'info', `Wrote ${statusPath}`);
  } catch (err) {
    log('SYSTEM', 'warn', `Could not write status.json: ${err.message}`);
  }

  if (!anySuccess) {
    log('SYSTEM', 'error', 'All symbols failed this run.');
    process.exitCode = 1;
  } else {
    log('SYSTEM', 'success', `Pipeline finished. ${results.filter((r) => r.success).length}/${symbols.length} succeeded.`);
  }
}

main().catch((err) => {
  log('SYSTEM', 'error', `Fatal error: ${err.stack || err.message}`);
  process.exitCode = 1;
});
