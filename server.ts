import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { configStore } from './server/configStore';
import { cronManager } from './server/cronManager';
import { fetchDerivOHLCV, testDerivToken, SYNTHETIC_INDICES } from './server/derivService';
import { sendTestTelegramPing } from './server/telegramService';
import { runMetaResearchPipeline } from './server/metaResearcher';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize node-cron background tasks
cronManager.initialize();

// API Routes

// 1. Get Configuration & Status
app.get('/api/config', (req, res) => {
  res.json({
    config: configStore.getMaskedConfig(),
    symbols: SYNTHETIC_INDICES,
  });
});

// 2. Save Configuration
app.post('/api/config', (req, res) => {
  try {
    const updated = configStore.updateConfig(req.body);
    res.json({ success: true, config: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Trigger Manual Run
app.post('/api/run-manual', async (req, res) => {
  try {
    const { symbol, symbols } = req.body || {};
    const result = await cronManager.executePipeline({
      triggerSource: 'MANUAL_RUN',
      symbolOverride: symbol,
      symbolsOverride: symbols,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Trigger Meta-Research Now
app.post('/api/run-meta-research', async (req, res) => {
  try {
    const result = await runMetaResearchPipeline();
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Test Deriv Token WebSocket Connection
app.post('/api/test-deriv', async (req, res) => {
  try {
    const { token } = req.body;
    const activeToken = token || configStore.getConfig().derivToken;
    const result = await testDerivToken(activeToken);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ valid: false, message: err.message });
  }
});

// 6. Test Telegram Bot Connection
app.post('/api/test-telegram', async (req, res) => {
  try {
    const { botToken, chatId } = req.body || {};
    const token = botToken || configStore.getConfig().tgBotToken;
    const chat = chatId || configStore.getConfig().tgChatId;

    if (!token || !chat) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both Telegram Bot Token and Chat ID to test.',
      });
    }

    const result = await sendTestTelegramPing(token, chat);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Get Activity Logs & Dispatched Telegram Messages
app.get('/api/logs', (req, res) => {
  res.json({
    logs: configStore.getLogs(60),
    telegramHistory: configStore.getTelegramHistory(10),
  });
});

// 8. Clear Activity Logs
app.post('/api/clear-logs', (req, res) => {
  configStore.clearLogs();
  res.json({ success: true });
});

// 9. Get Last Analysis & Multi-Index Map
app.get('/api/last-analysis', (req, res) => {
  res.json({
    analysis: configStore.getLastAnalysis(),
    analyses: configStore.getLastAnalyses(),
  });
});

// 10. Get Cron Schedulers Status
app.get('/api/cron-status', (req, res) => {
  res.json(cronManager.getStatus());
});

// 11. Fetch Live Candles & Indicators for any symbol
app.get('/api/candles', async (req, res) => {
  try {
    const symbol = (req.query.symbol as string) || configStore.getConfig().activeSymbol || 'R_75';
    const count = Math.min(Number(req.query.count) || 50, 100);
    const result = await fetchDerivOHLCV(configStore.getConfig().derivToken, symbol, count);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Mount Vite or serve static assets
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
