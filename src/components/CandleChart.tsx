import React from 'react';
import { BarChart3, TrendingUp, TrendingDown, Layers, Activity } from 'lucide-react';

interface CandleChartProps {
  candles: {
    epoch: number;
    open: number;
    high: number;
    low: number;
    close: number;
  }[];
  indicators?: {
    currentPrice: number;
    sma9: number;
    sma21: number;
    rsi14: number;
    priceChangePercent: number;
    high50: number;
    low50: number;
    trend: 'BULLISH' | 'BEARISH' | 'RANGING';
  };
  symbol: string;
  source?: string;
  onRefresh: () => void;
  isLoading: boolean;
}

export const CandleChart: React.FC<CandleChartProps> = ({
  candles,
  indicators,
  symbol,
  source,
  onRefresh,
  isLoading,
}) => {
  if (!candles || candles.length === 0) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur flex items-center justify-center min-h-[220px]">
        <span className="text-xs text-slate-500">No candle data fetched yet</span>
      </div>
    );
  }

  // Calculate SVG coordinates for candles
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const minPrice = Math.min(...lows);
  const maxPrice = Math.max(...highs);
  const range = maxPrice - minPrice || 1;

  const svgWidth = 800;
  const svgHeight = 180;
  const candleWidth = Math.max(svgWidth / candles.length - 4, 3);

  const getY = (price: number) => {
    return svgHeight - ((price - minPrice) / range) * (svgHeight - 20) - 10;
  };

  const isUp = (indicators?.priceChangePercent || 0) >= 0;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">50 OHLCV Candles</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {symbol}
              </span>
              {source && (
                <span className="text-[10px] font-mono text-slate-400">
                  [{source.replace('_', ' ')}]
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">Real-time WebSocket tick aggregation</p>
          </div>
        </div>

        {/* Live Indicators Pill Bar */}
        {indicators && (
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <div className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center gap-1.5">
              <span className="text-slate-500">Price:</span>
              <strong className="text-white">{indicators.currentPrice}</strong>
              <span className={`text-[10px] flex items-center ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isUp ? '+' : ''}{indicators.priceChangePercent}%
              </span>
            </div>

            <div className="px-2 py-1 rounded-lg bg-slate-950/80 border border-slate-800 hidden sm:flex items-center gap-1">
              <span className="text-blue-400">SMA9:</span>
              <span className="text-slate-300">{indicators.sma9}</span>
            </div>

            <div className="px-2 py-1 rounded-lg bg-slate-950/80 border border-slate-800 hidden sm:flex items-center gap-1">
              <span className="text-purple-400">SMA21:</span>
              <span className="text-slate-300">{indicators.sma21}</span>
            </div>

            <div className="px-2 py-1 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center gap-1">
              <span className="text-amber-400">RSI14:</span>
              <span
                className={`font-semibold ${
                  indicators.rsi14 > 70 ? 'text-rose-400' : indicators.rsi14 < 30 ? 'text-emerald-400' : 'text-slate-300'
                }`}
              >
                {indicators.rsi14}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* SVG Candlestick View */}
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-36 min-w-[500px]">
          {/* Subtle grid lines */}
          <line x1="0" y1="30" x2={svgWidth} y2="30" stroke="#1e293b" strokeDasharray="3 3" />
          <line x1="0" y1="90" x2={svgWidth} y2="90" stroke="#1e293b" strokeDasharray="3 3" />
          <line x1="0" y1="150" x2={svgWidth} y2="150" stroke="#1e293b" strokeDasharray="3 3" />

          {/* Candlesticks */}
          {candles.map((candle, idx) => {
            const x = (idx * svgWidth) / candles.length + candleWidth / 2;
            const openY = getY(candle.open);
            const closeY = getY(candle.close);
            const highY = getY(candle.high);
            const lowY = getY(candle.low);
            const candleIsBull = candle.close >= candle.open;

            const topY = Math.min(openY, closeY);
            const height = Math.max(Math.abs(closeY - openY), 1.5);
            const color = candleIsBull ? '#34d399' : '#f87171'; // emerald-400 / rose-400

            return (
              <g key={candle.epoch || idx}>
                {/* Wick line */}
                <line
                  x1={x + candleWidth / 2}
                  y1={highY}
                  x2={x + candleWidth / 2}
                  y2={lowY}
                  stroke={color}
                  strokeWidth="1.2"
                />
                {/* Candle body */}
                <rect
                  x={x}
                  y={topY}
                  width={candleWidth}
                  height={height}
                  fill={candleIsBull ? color : color}
                  rx="1"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Chart Footer with Price Range */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono">
        <span>50-Candle Low: {minPrice.toFixed(2)}</span>
        <span className="flex items-center gap-1 text-slate-400">
          <Activity className="w-3 h-3 text-cyan-400" />
          <span>Deriv Synthetic Engine (Continuous 24/7)</span>
        </span>
        <span>50-Candle High: {maxPrice.toFixed(2)}</span>
      </div>
    </div>
  );
};
