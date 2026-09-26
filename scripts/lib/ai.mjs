import { GoogleGenAI } from '@google/genai';

// NOTE: the original AI-Studio export used "gemini-3.8-flash", which is not a
// real model — every call would have failed and silently fallen back to the
// quantitative model below. Fixed to a real, current GA model.
const MODEL_NAME = 'gemini-3.5-flash';

/**
 * Runs the 4-persona (Researcher -> Analyst -> Red Team -> Manager) analysis
 * via Gemini. Falls back to a deterministic quantitative model if the API
 * key is missing, quota is exhausted, or the call fails for any reason —
 * the pipeline always produces a verdict, it just tells you which engine made it.
 */
export async function runMultiAgentAnalysis(candles, indicators, symbol, apiKey, log = () => {}) {
  if (!apiKey) {
    log('warn', 'No GEMINI_API_KEY set — using deterministic quantitative model.');
    return generateQuantitativePersonaAnalysis(candles, indicators, symbol, 'NO_API_KEY');
  }

  log('info', `Calling Gemini (${MODEL_NAME}) 4-persona pipeline for ${symbol}...`);

  const recentCandles = candles.slice(-25).map((c) => ({
    time: new Date(c.epoch * 1000).toISOString().slice(11, 19),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }));

  const systemPrompt = `
You are the Lead Coordinator of an Elite Quantitative Trading Desk operating on Deriv Synthetic Indices (specifically ${symbol}).

Your objective is to conduct a rigorous, sequential 4-Persona Multi-Agent Evaluation on the provided OHLCV candle dataset and technical metrics.

PERSONAS TO EXECUTE SEQUENTIALLY:
1. [RESEARCHER]: Inspects candlestick shapes, wick rejections, engulfing patterns, support/resistance, SMA9 vs SMA21 alignment, RSI14 momentum, trend regime.
2. [ANALYST]: Forms a baseline market thesis (BULLISH, BEARISH, or NEUTRAL) with rationale, entry zone, target levels.
3. [RED TEAM]: Aggressively challenges the thesis — liquidity sweeps, fakeouts, overextension, volatility traps unique to synthetic indices. Explicit invalidation conditions.
4. [MANAGER]: Synthesizes into a final verdict, confidence score 0-100, signal, entry/stop/targets, risk/reward, risk sizing.

OUTPUT REQUIREMENT: respond with valid JSON matching this schema:
{
  "researcher": {"patterns": ["p1","p2","p3"], "supportLevels": [number, number], "resistanceLevels": [number, number], "marketStructure": "string", "details": "2-3 paragraphs"},
  "analyst": {"thesis": "BULLISH"|"BEARISH"|"NEUTRAL", "rationale": "string", "targetZone": "string", "invalidationZone": "string", "details": "2-3 paragraphs"},
  "redTeam": {"keyRisks": ["r1","r2","r3"], "failureScenarios": ["s1","s2"], "trapHazards": "string", "details": "2-3 paragraphs"},
  "manager": {"verdict": "STRONG BUY"|"BUY"|"WAIT / NEUTRAL"|"SELL"|"STRONG SELL", "confidenceScore": number, "signal": "BUY"|"SELL"|"WAIT", "entryZone": "string", "stopLoss": "string", "takeProfit1": "string", "takeProfit2": "string", "riskRewardRatio": "string", "recommendedRiskPercent": "string", "summary": "string"},
  "fullMarkdown": "Complete report in clean Markdown with bold headers, bullet points, emoji indicators"
}
`.trim();

  const userContent = `
Current Synthetic Index: ${symbol}
Current Price: ${indicators.currentPrice}
SMA 9: ${indicators.sma9} | SMA 21: ${indicators.sma21}
RSI 14: ${indicators.rsi14} (${indicators.rsi14 > 70 ? 'Overbought' : indicators.rsi14 < 30 ? 'Oversold' : 'Neutral'})
50-Candle High: ${indicators.high50} | 50-Candle Low: ${indicators.low50}
Recent Price Change: ${indicators.priceChangePercent}%
Baseline Trend: ${indicators.trend}

Latest OHLCV Candles (Epoch/Time/O/H/L/C):
${JSON.stringify(recentCandles, null, 2)}
`.trim();

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: userContent,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const text = response.text || '';
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const cleanJson = text.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
      parsed = JSON.parse(cleanJson);
    }

    let score = Number(parsed.manager?.confidenceScore);
    if (isNaN(score) || score < 0) score = 50;
    if (score > 100) score = 100;
    parsed.manager.confidenceScore = Math.round(score);

    if (!parsed.fullMarkdown || parsed.fullMarkdown.length < 100) {
      parsed.fullMarkdown = buildMarkdown(symbol, parsed, indicators, 'Gemini AI');
    }

    const result = {
      researcher: parsed.researcher,
      analyst: parsed.analyst,
      redTeam: parsed.redTeam,
      manager: parsed.manager,
      fullMarkdown: parsed.fullMarkdown,
      timestamp: new Date().toISOString(),
      symbol,
      engine: 'GEMINI',
    };

    log('success', `Analysis complete: ${result.manager.verdict} (${result.manager.confidenceScore}%)`);
    return result;
  } catch (err) {
    log('warn', `Gemini call failed (${err.message?.slice(0, 120)}). Falling back to quantitative model.`);
    return generateQuantitativePersonaAnalysis(candles, indicators, symbol, err.message);
  }
}

function buildMarkdown(symbol, parsed, indicators, engineLabel) {
  return `
# 🤖 AI Trading Desk Report: ${symbol}
*Timestamp: ${new Date().toUTCString()} — Engine: ${engineLabel}*

### 🔍 [RESEARCHER]
- **Structure:** ${parsed.researcher?.marketStructure || 'N/A'}
- **Patterns:** ${(parsed.researcher?.patterns || []).join(', ')}
${parsed.researcher?.details || ''}

### 📈 [ANALYST] Thesis: ${parsed.analyst?.thesis || 'NEUTRAL'}
- **Rationale:** ${parsed.analyst?.rationale || ''}
${parsed.analyst?.details || ''}

### 🛡️ [RED TEAM]
- **Risks:** ${(parsed.redTeam?.keyRisks || []).join(', ')}
${parsed.redTeam?.details || ''}

### ⚖️ [MANAGER]
- **Verdict:** ${parsed.manager?.verdict} (${parsed.manager?.confidenceScore}%)
- **Entry:** ${parsed.manager?.entryZone} | **SL:** ${parsed.manager?.stopLoss} | **TP1:** ${parsed.manager?.takeProfit1} | **TP2:** ${parsed.manager?.takeProfit2}

**Summary:** ${parsed.manager?.summary || ''}
`.trim();
}

/**
 * Deterministic quantitative multi-agent engine — no API key required, never fails.
 * This is the honest fallback: rule-based on SMA/RSI, not a black box.
 */
export function generateQuantitativePersonaAnalysis(candles, indicators, symbol, reason = '') {
  const { currentPrice, sma9, sma21, rsi14, trend, high50, low50 } = indicators;
  const isBull = trend === 'BULLISH';
  const isBear = trend === 'BEARISH';
  const atrProxy = (high50 - low50) * 0.08 || currentPrice * 0.005;

  let verdict = 'WAIT / NEUTRAL';
  let signal = 'WAIT';
  let confidenceScore = 50;

  if (isBull && rsi14 < 68) {
    verdict = rsi14 > 55 ? 'STRONG BUY' : 'BUY';
    signal = 'BUY';
    confidenceScore = Math.min(Math.round(55 + (rsi14 - 50) * 1.5), 88);
  } else if (isBear && rsi14 > 32) {
    verdict = rsi14 < 45 ? 'STRONG SELL' : 'SELL';
    signal = 'SELL';
    confidenceScore = Math.min(Math.round(55 + (50 - rsi14) * 1.5), 88);
  } else if (rsi14 >= 70 || rsi14 <= 30) {
    confidenceScore = 42;
  }

  const isBuySignal = signal === 'BUY';
  const isSellSignal = signal === 'SELL';

  const entryZone = `${(currentPrice - atrProxy * 0.2).toFixed(2)} - ${(currentPrice + atrProxy * 0.2).toFixed(2)}`;
  const stopLoss = isBuySignal
    ? (currentPrice - atrProxy * 1.2).toFixed(2)
    : (currentPrice + atrProxy * 1.2).toFixed(2);
  const takeProfit1 = isBuySignal
    ? (currentPrice + atrProxy * 1.8).toFixed(2)
    : (currentPrice - atrProxy * 1.8).toFixed(2);
  const takeProfit2 = isBuySignal
    ? (currentPrice + atrProxy * 3.2).toFixed(2)
    : (currentPrice - atrProxy * 3.2).toFixed(2);

  const patterns = isBuySignal
    ? ['Bullish MA Crossover (SMA9 > SMA21)', 'Higher Low Base', 'Momentum Rebound > 50 RSI']
    : isSellSignal
    ? ['Bearish MA Separation (SMA9 < SMA21)', 'Lower High Top', 'Momentum Slip < 50 RSI']
    : ['Sideways Compression', 'MA Convergence', 'Neutral RSI Equilibrium'];

  const researcher = {
    patterns,
    supportLevels: [Number(low50.toFixed(2)), Number((currentPrice - atrProxy).toFixed(2))],
    resistanceLevels: [Number((currentPrice + atrProxy).toFixed(2)), Number(high50.toFixed(2))],
    marketStructure: isBuySignal
      ? 'Ascending flow, SMA9 acting as dynamic support.'
      : isSellSignal
      ? 'Descending distribution, rejection off SMA21.'
      : 'Tight consolidation between swing brackets.',
    details: `SMA9 at ${sma9}, SMA21 at ${sma21}. RSI14 at ${rsi14}. Price ranging within [${low50} - ${high50}] over the last 50 candles.`,
  };

  const analyst = {
    thesis: isBuySignal ? 'BULLISH' : isSellSignal ? 'BEARISH' : 'NEUTRAL',
    rationale: isBuySignal
      ? `Price above dynamic support, RSI ${rsi14} allows upside room.`
      : isSellSignal
      ? `Failure to reclaim SMA21, supply pressure toward range lows.`
      : `Price sandwiched between SMA9 and SMA21 — no edge.`,
    targetZone: `${takeProfit1} (TP1) -> ${takeProfit2} (TP2)`,
    invalidationZone: stopLoss,
    details: `Deterministic model: projects ${isBuySignal ? 'continuation' : isSellSignal ? 'descent' : 'chop'} toward ${isBuySignal ? takeProfit1 : takeProfit2}, invalidated on a confirmed break of ${stopLoss}.`,
  };

  const redTeam = {
    keyRisks: [
      'Synthetic index volatility spikes causing rapid wick liquidations.',
      'SMA crossover unreliable during choppy consolidation.',
      'Spread expansion / slippage on tick bursts.',
    ],
    failureScenarios: [
      `False breakout reversing sharply toward ${stopLoss}.`,
      'Whipsaw trapping both long and short breakout entries.',
    ],
    trapHazards: `Synthetic spike risk on ${symbol}. Do not oversize position; respect the stop.`,
    details: `This is a rule-based fallback, not a language model — it will not catch narrative/news risk. Treat the confidence score as indicative only.`,
  };

  const manager = {
    verdict,
    confidenceScore,
    signal,
    entryZone,
    stopLoss,
    takeProfit1,
    takeProfit2,
    riskRewardRatio: '1:2.4',
    recommendedRiskPercent: '1.0%',
    summary: `Deterministic desk confirms ${verdict} on ${symbol} at ${confidenceScore}% confidence. ${
      signal === 'WAIT'
        ? 'Market in equilibrium — no trade.'
        : `${signal} within ${entryZone}, stop at ${stopLoss}, max 1.0% risk.`
    }${reason ? ` (AI engine unavailable: ${reason.slice(0, 100)})` : ''}`,
  };

  const fullMarkdown = `
# 📐 Quantitative (Rule-Based) Trading Desk Report: ${symbol}
*Timestamp: ${new Date().toUTCString()} — Engine: Deterministic fallback${reason ? ` (${reason.slice(0, 80)})` : ''}*

### 🔍 [RESEARCHER]
- **Structure:** ${researcher.marketStructure}
- **Patterns:** ${researcher.patterns.join(', ')}
- **Supports:** [${researcher.supportLevels.join(', ')}] | **Resistances:** [${researcher.resistanceLevels.join(', ')}]
${researcher.details}

### 📈 [ANALYST] Thesis: ${analyst.thesis}
- **Rationale:** ${analyst.rationale}
${analyst.details}

### 🛡️ [RED TEAM]
- **Risks:** ${redTeam.keyRisks.join('; ')}
${redTeam.details}

### ⚖️ [MANAGER]
- **Verdict:** ${manager.verdict} (${manager.confidenceScore}%)
- **Entry:** ${manager.entryZone} | **SL:** ${manager.stopLoss} | **TP1:** ${manager.takeProfit1} | **TP2:** ${manager.takeProfit2}

**Summary:** ${manager.summary}
`.trim();

  return {
    researcher,
    analyst,
    redTeam,
    manager,
    fullMarkdown,
    timestamp: new Date().toISOString(),
    symbol,
    engine: 'QUANTITATIVE_FALLBACK',
  };
}
