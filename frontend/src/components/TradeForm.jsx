import { useState } from 'react';
import useTradingStore from '../store/tradingStore';

const LEVERAGE_MARKS = [1, 2, 3, 5, 10, 20, 25, 50, 75, 100, 125];

function fmt(n, d = 2) { return Number(n).toFixed(d); }

export default function TradeForm() {
  const { side, setSide, orderType, setOrderType, leverage, setLeverage, ticker, balance, symbol, placeOrder } = useTradingStore();
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [pct, setPct] = useState(0);
  const [showLev, setShowLev] = useState(false);

  const isLong = side === 'buy';
  const currentPrice = ticker.price || 0;
  const execPrice = orderType === 'LIMIT' ? (parseFloat(price) || 0) : currentPrice;
  const notional = (parseFloat(qty) || 0) * execPrice;
  const margin = notional / leverage;
  const decimals = currentPrice > 1000 ? 2 : currentPrice > 1 ? 4 : 6;

  const handlePct = (p) => {
    setPct(p);
    if (execPrice > 0 && balance > 0) {
      const usableMargin = balance * (p / 100);
      const coins = (usableMargin * leverage) / execPrice;
      setQty(fmt(coins, currentPrice > 1000 ? 3 : 4));
    }
  };

  const handleSubmit = () => {
    const ok = placeOrder({ quantity: qty, price });
    if (ok) { setQty(''); setPrice(''); setPct(0); }
  };

  const btnClass = isLong
    ? 'bg-tr-green text-[#0b0e11] hover:opacity-90'
    : 'bg-tr-red text-white hover:opacity-90';

  return (
    <div className="flex flex-col h-full bg-tr-panel">
      {/* Long / Short tabs */}
      <div className="flex">
        <button
          onClick={() => setSide('buy')}
          className={`flex-1 py-3 text-xs font-bold transition-colors border-b-2 ${isLong ? 'text-tr-green border-tr-green' : 'text-tr-muted border-transparent hover:text-tr-text'}`}
        >
          Buy / Long
        </button>
        <button
          onClick={() => setSide('sell')}
          className={`flex-1 py-3 text-xs font-bold transition-colors border-b-2 ${!isLong ? 'text-tr-red border-tr-red' : 'text-tr-muted border-transparent hover:text-tr-text'}`}
        >
          Sell / Short
        </button>
      </div>

      <div className="flex-1 p-3 flex flex-col gap-3 overflow-y-auto scrollbar-thin">
        {/* Order type */}
        <div className="flex gap-0.5 bg-tr-bg rounded p-0.5">
          {['MARKET', 'LIMIT'].map(t => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              className={`flex-1 py-1.5 text-[11px] rounded font-semibold transition-colors ${orderType === t ? 'bg-tr-input text-tr-text' : 'text-tr-muted hover:text-tr-text'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Leverage */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-tr-muted">Cross Margin</span>
          <button
            onClick={() => setShowLev(v => !v)}
            className="text-[11px] text-tr-yellow font-bold border border-tr-yellow/40 px-2 py-0.5 rounded hover:bg-tr-yellow/10 transition-colors"
          >
            {leverage}x
          </button>
        </div>

        {showLev && (
          <div className="bg-tr-bg rounded-lg p-3 border border-tr-border">
            <div className="flex justify-between text-[11px] mb-2">
              <span className="text-tr-muted">Leverage</span>
              <span className="text-tr-yellow font-bold">{leverage}x</span>
            </div>
            <input
              type="range" min="1" max="125" value={leverage}
              onChange={e => setLeverage(Number(e.target.value))}
              className={`w-full ${isLong ? 'green-thumb' : 'red-thumb'}`}
            />
            <div className="flex flex-wrap gap-1 mt-2">
              {LEVERAGE_MARKS.map(l => (
                <button
                  key={l}
                  onClick={() => setLeverage(l)}
                  className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${leverage === l ? 'border-tr-yellow text-tr-yellow' : 'border-tr-border text-tr-muted hover:text-tr-text'}`}
                >
                  {l}x
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Limit price */}
        {orderType === 'LIMIT' && (
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-tr-muted">Price (USDT)</span>
            <div className="flex items-center bg-tr-input border border-tr-border rounded px-2 focus-within:border-tr-muted">
              <input
                type="number" value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder={currentPrice > 0 ? fmt(currentPrice, decimals) : '0.00'}
                className="flex-1 bg-transparent text-xs text-tr-text outline-none py-2"
              />
              <span className="text-[10px] text-tr-muted">USDT</span>
            </div>
          </label>
        )}

        {/* Quantity */}
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-tr-muted">Amount ({symbol.replace('USDT', '')})</span>
          <div className={`flex items-center bg-tr-input border rounded px-2 focus-within:border-tr-muted ${isLong ? 'border-tr-green/40' : 'border-tr-red/40'}`}>
            <input
              type="number" value={qty}
              onChange={e => { setQty(e.target.value); setPct(0); }}
              placeholder="0.000"
              className="flex-1 bg-transparent text-xs text-tr-text outline-none py-2"
            />
            <span className="text-[10px] text-tr-muted">{symbol.replace('USDT', '')}</span>
          </div>
        </label>

        {/* % buttons */}
        <div className="flex gap-1">
          {[25, 50, 75, 100].map(p => (
            <button
              key={p}
              onClick={() => handlePct(p)}
              className={`flex-1 py-1 text-[10px] rounded border transition-colors ${
                pct === p
                  ? isLong ? 'bg-tr-green text-[#0b0e11] border-tr-green' : 'bg-tr-red text-white border-tr-red'
                  : 'border-tr-border text-tr-muted hover:text-tr-text'
              }`}
            >
              {p}%
            </button>
          ))}
        </div>

        {/* Order summary */}
        <div className="bg-tr-bg rounded-lg p-2.5 flex flex-col gap-2 text-[11px]">
          <Row label="Available" value={`$${fmt(balance)}`} />
          <Row label="Order Value" value={notional > 0 ? `$${fmt(notional)}` : '—'} />
          <Row label={`Margin (${leverage}x)`} value={margin > 0 ? `$${fmt(margin)}` : '—'} />
          {currentPrice > 0 && notional > 0 && (
            <Row
              label="Est. Liq. Price"
              value={isLong
                ? `$${fmt(execPrice * (1 - 1 / leverage), decimals)}`
                : `$${fmt(execPrice * (1 + 1 / leverage), decimals)}`}
              valueClass="text-tr-yellow"
            />
          )}
        </div>

        {/* Place order */}
        <button
          onClick={handleSubmit}
          disabled={!qty || parseFloat(qty) <= 0 || (orderType === 'LIMIT' && !price)}
          className={`w-full py-3 rounded font-bold text-sm transition-opacity disabled:opacity-40 disabled:cursor-not-allowed ${btnClass}`}
        >
          {isLong ? '▲ Buy / Long' : '▼ Sell / Short'}
        </button>

        <p className="text-[10px] text-tr-muted text-center">
          Paper trading — no real money involved
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, valueClass = 'text-tr-text' }) {
  return (
    <div className="flex justify-between">
      <span className="text-tr-muted">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
