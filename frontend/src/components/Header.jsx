import { useState } from 'react';
import useTradingStore from '../store/tradingStore';

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT'];

function fmt(n, d = 2) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }
function fmtVol(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
  return String(n);
}

export default function Header() {
  const { symbol, ticker, balance, setSymbol, resetAccount } = useTradingStore();
  const [showSymbols, setShowSymbols] = useState(false);

  const up = ticker.changePercent >= 0;
  const priceColor = up ? 'text-tr-green' : 'text-tr-red';
  const decimals = ticker.price > 1000 ? 2 : ticker.price > 1 ? 4 : 6;

  return (
    <header className="h-14 bg-tr-panel border-b border-tr-border flex items-center px-4 gap-4 flex-shrink-0 z-10 select-none">
      {/* Logo */}
      <div className="flex items-center gap-1.5 font-bold text-sm">
        <span className="text-tr-yellow text-base">▲</span>
        <span className="text-tr-text tracking-wider">TradeX</span>
        <span className="text-[10px] text-tr-muted border border-tr-border rounded px-1 py-0.5 ml-1">DEMO</span>
      </div>

      <div className="w-px h-6 bg-tr-border" />

      {/* Symbol selector */}
      <div className="relative">
        <button
          onClick={() => setShowSymbols(v => !v)}
          className="flex items-center gap-2 hover:bg-tr-card px-2 py-1.5 rounded transition-colors"
        >
          <span className="font-bold text-sm">{symbol}</span>
          <span className="text-tr-muted text-[10px] bg-tr-input px-1.5 py-0.5 rounded">PERP</span>
          <span className="text-tr-muted text-[10px]">▼</span>
        </button>

        {showSymbols && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowSymbols(false)} />
            <div className="absolute top-full left-0 mt-1 bg-tr-card border border-tr-border rounded-lg shadow-2xl z-50 w-44 overflow-hidden">
              {SYMBOLS.map(s => (
                <button
                  key={s}
                  onClick={() => { setSymbol(s); setShowSymbols(false); }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-tr-input transition-colors ${s === symbol ? 'text-tr-yellow font-bold' : 'text-tr-text'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Price */}
      <div className={`font-bold text-xl min-w-[110px] ${priceColor}`}>
        {ticker.price > 0 ? fmt(ticker.price, decimals) : '—'}
      </div>

      {/* 24h stats */}
      <div className="hidden lg:flex items-center gap-5">
        <Stat label="24h Change" value={`${up ? '+' : ''}${fmt(ticker.changePercent, 2)}%`} color={priceColor} />
        <Stat label="24h High" value={ticker.high > 0 ? fmt(ticker.high, decimals) : '—'} />
        <Stat label="24h Low" value={ticker.low > 0 ? fmt(ticker.low, decimals) : '—'} />
        <Stat label="24h Volume" value={fmtVol(ticker.volume)} />
        <Stat label="Turnover" value={'$' + fmtVol(ticker.quoteVolume)} />
      </div>

      <div className="flex-1" />

      {/* Paper balance */}
      <div className="flex items-center gap-3 bg-tr-card border border-tr-border rounded-lg px-3 py-2">
        <div className="flex flex-col">
          <span className="text-[10px] text-tr-muted leading-none">Paper Balance</span>
          <span className="text-sm font-bold text-tr-text leading-tight">
            ${fmt(balance, 2)}
            <span className="text-tr-muted text-[10px] ml-1">USDT</span>
          </span>
        </div>
        <button
          onClick={resetAccount}
          title="Reset to $10,000"
          className="text-[10px] text-tr-muted hover:text-tr-yellow transition-colors border border-tr-border rounded px-1.5 py-0.5"
        >
          Reset
        </button>
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-tr-green animate-pulse" />
        <span className="text-[10px] text-tr-muted">Live</span>
      </div>
    </header>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-tr-muted">{label}</span>
      <span className={`text-xs ${color || 'text-tr-text'}`}>{value}</span>
    </div>
  );
}
