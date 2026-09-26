import WebSocket from 'ws';

export const SYNTHETIC_INDICES = [
  { id: 'R_75', name: 'Volatility 75 Index', basePrice: 485230.5, pipSize: 0.01 },
  { id: 'R_100', name: 'Volatility 100 Index', basePrice: 2150.2, pipSize: 0.01 },
  { id: 'R_50', name: 'Volatility 50 Index', basePrice: 185.4, pipSize: 0.001 },
  { id: 'R_25', name: 'Volatility 25 Index', basePrice: 1620.8, pipSize: 0.01 },
  { id: 'R_10', name: 'Volatility 10 Index', basePrice: 6540.0, pipSize: 0.001 },
  { id: '1HZ75V', name: 'Volatility 75 (1s) Index', basePrice: 945000.0, pipSize: 0.01 },
  { id: '1HZ100V', name: 'Volatility 100 (1s) Index', basePrice: 3400.0, pipSize: 0.01 },
  { id: 'CRASH_500', name: 'Crash 500 Index', basePrice: 4200.0, pipSize: 0.01 },
  { id: 'BOOM_500', name: 'Boom 500 Index', basePrice: 3900.0, pipSize: 0.01 },
  { id: 'stpRNG', name: 'Step Index', basePrice: 8520.1, pipSize: 0.1 },
];

/**
 * Calculates technical indicators from OHLCV candles (SMA9/21, RSI14, trend).
 */
export function calculateIndicators(candles) {
  if (!candles || candles.length === 0) {
    return {
      currentPrice: 0,
      sma9: 0,
      sma21: 0,
      rsi14: 50,
      priceChangePercent: 0,
      high50: 0,
      low50: 0,
      trend: 'RANGING',
    };
  }

  const closes = candles.map((c) => c.close);
  const currentPrice = closes[closes.length - 1];
  const firstPrice = closes[0];
  const priceChangePercent = ((currentPrice - firstPrice) / firstPrice) * 100;

  const last9 = closes.slice(-9);
  const sma9 = last9.reduce((a, b) => a + b, 0) / last9.length;

  const last21 = closes.slice(-21);
  const sma21 = last21.reduce((a, b) => a + b, 0) / last21.length;

  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const high50 = Math.max(...highs);
  const low50 = Math.min(...lows);

  let gains = 0;
  let losses = 0;
  const period = 14;
  const rsiCloses = closes.slice(-period - 1);
  for (let i = 1; i < rsiCloses.length; i++) {
    const diff = rsiCloses[i] - rsiCloses[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  let rsi14 = 50;
  if (avgLoss === 0) {
    rsi14 = 100;
  } else {
    const rs = avgGain / avgLoss;
    rsi14 = 100 - 100 / (1 + rs);
  }

  let trend = 'RANGING';
  if (currentPrice > sma9 && sma9 > sma21 && rsi14 > 52) trend = 'BULLISH';
  else if (currentPrice < sma9 && sma9 < sma21 && rsi14 < 48) trend = 'BEARISH';

  return {
    currentPrice: Number(currentPrice.toFixed(4)),
    sma9: Number(sma9.toFixed(4)),
    sma21: Number(sma21.toFixed(4)),
    rsi14: Number(rsi14.toFixed(2)),
    priceChangePercent: Number(priceChangePercent.toFixed(2)),
    high50: Number(high50.toFixed(4)),
    low50: Number(low50.toFixed(4)),
    trend,
  };
}

/**
 * Calibrated synthetic fallback candles, used only if Deriv WS is unreachable
 * (e.g. outbound network blocked). Clearly marked as fallback in the output.
 */
export function generateCalibratedCandles(symbol = 'R_75', count = 50) {
  const indexMeta = SYNTHETIC_INDICES.find((i) => i.id === symbol) || SYNTHETIC_INDICES[0];
  let price = indexMeta.basePrice;
  const volatilityPercent = symbol.includes('100') ? 0.008 : symbol.includes('75') ? 0.005 : 0.003;
  const now = Math.floor(Date.now() / 1000);
  const intervalSeconds = 1800;
  const candles = [];

  for (let i = count - 1; i >= 0; i--) {
    const epoch = now - i * intervalSeconds;
    const deltaPercent = (Math.random() - 0.49) * volatilityPercent;
    const open = price;
    const close = open * (1 + deltaPercent);
    const wickHigh = Math.max(open, close) * (1 + Math.random() * (volatilityPercent * 0.5));
    const wickLow = Math.min(open, close) * (1 - Math.random() * (volatilityPercent * 0.5));
    candles.push({
      epoch,
      open: Number(open.toFixed(4)),
      high: Number(wickHigh.toFixed(4)),
      low: Number(wickLow.toFixed(4)),
      close: Number(close.toFixed(4)),
    });
    price = close;
  }
  return candles;
}

function fetchFromDerivWebSocket(wsUrl, token, symbol, count, log) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      try {
        ws.terminate();
      } catch {}
      reject(new Error(`Deriv WebSocket connection timed out after 8000ms on ${wsUrl}`));
    }, 8000);

    let ws;
    try {
      ws = new WebSocket(wsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36',
          Origin: 'https://app.deriv.com',
        },
      });
    } catch (e) {
      clearTimeout(timeout);
      return reject(e);
    }

    const requestCandles = () => {
      ws.send(
        JSON.stringify({
          ticks_history: symbol,
          adjust_start_time: 1,
          count,
          end: 'latest',
          style: 'candles',
        })
      );
    };

    ws.on('open', () => {
      log('info', `WebSocket opened to Deriv (${wsUrl}) for ${symbol}`);
      if (token && token.trim().length > 0) {
        ws.send(JSON.stringify({ authorize: token.trim() }));
      } else {
        requestCandles();
      }
    });

    ws.on('message', (raw) => {
      try {
        const response = JSON.parse(raw.toString());

        if (response.msg_type === 'authorize') {
          log('success', 'Deriv token authorized successfully.');
          requestCandles();
        }

        if (response.msg_type === 'candles' && Array.isArray(response.candles)) {
          clearTimeout(timeout);
          ws.close();
          log('success', `Received ${response.candles.length} OHLCV candles for ${symbol}`);
          resolve(response.candles);
        }

        if (response.error) {
          clearTimeout(timeout);
          ws.close();
          reject(new Error(response.error.message || 'Deriv API returned error'));
        }
      } catch (err) {
        clearTimeout(timeout);
        ws.close();
        reject(err);
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

/**
 * Fetches live OHLCV candles + indicators for a symbol. Falls back to calibrated
 * synthetic candles only if both live endpoints fail (network/outage) so the
 * pipeline never crashes the whole run over one bad connection.
 */
export async function fetchDerivOHLCV(token, symbol = 'R_75', count = 50, log = () => {}) {
  const wsEndpoints = [
    'wss://ws.derivws.com/websockets/v3?app_id=1089',
    'wss://api.derivws.com/trading/v1/options/ws/public',
  ];

  for (const endpoint of wsEndpoints) {
    try {
      log('info', `Attempting Deriv connection on ${endpoint}...`);
      const candles = await fetchFromDerivWebSocket(endpoint, token, symbol, count, log);
      if (candles && candles.length > 0) {
        const indicators = calculateIndicators(candles);
        return {
          candles,
          indicators,
          source: token ? 'DERIV_WS_LIVE' : 'DERIV_WS_PUBLIC',
          symbol,
        };
      }
    } catch (err) {
      log('warn', `Endpoint ${endpoint} failed: ${err.message}`);
    }
  }

  log(
    'warn',
    `Deriv live stream unavailable for ${symbol}. Using calibrated fallback candles (NOT real market data).`
  );
  const fallbackCandles = generateCalibratedCandles(symbol, count);
  const indicators = calculateIndicators(fallbackCandles);
  return { candles: fallbackCandles, indicators, source: 'FALLBACK_CALIBRATED', symbol };
}
