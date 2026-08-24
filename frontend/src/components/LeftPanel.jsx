import { useState } from 'react';
import useTradingStore from '../store/tradingStore';

function fmt(n, d = 2) { return Number(n).toFixed(d); }
function fmtQty(n) { return Number(n) >= 1 ? Number(n).toFixed(3) : Number(n).toFixed(5); }

const MAX_ROWS = 14;

export default function LeftPanel() {
  const [tab, setTab] = useState('book');
  const { orderBook, recentTrades, ticker } = useTradingStore();

  const bids = orderBook.bids.slice(0, MAX_ROWS);
  const asks = orderBook.asks.slice(0, MAX_ROWS).reverse();

  const maxBidQty = Math.max(...bids.map(b => b.qty), 1);
  const maxAskQty = Math.max(...asks.map(a => a.qty), 1);

  const decimals = ticker.price > 10000 ? 1 : ticker.price > 100 ? 2 : 4;

  return (
    <div className="h-full flex flex-col bg-tr-panel">
      {/* Tabs */}
      <div className="flex border-b border-tr-border">
        {[['book', 'Book'], ['trades', 'Trades']].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${
              tab === k ? 'text-tr-text border-b-2 border-tr-yellow' : 'text-tr-muted hover:text-tr-text'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'book' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Column headers */}
          <div className="flex justify-between px-2 py-1 text-[10px] text-tr-muted">
            <span>Price(USDT)</span>
            <span>Size</span>
          </div>

          {/* Asks */}
          <div className="flex-1 flex flex-col justify-end overflow-hidden">
            {asks.map((row, i) => (
              <OrderRow
                key={i}
                price={fmt(row.price, decimals)}
                qty={fmtQty(row.qty)}
                pct={row.qty / maxAskQty}
                side="ask"
              />
            ))}
          </div>

          {/* Spread */}
          <div className="flex items-center justify-center gap-2 py-1 border-y border-tr-border bg-tr-bg">
            <span className={`text-sm font-bold ${ticker.changePercent >= 0 ? 'text-tr-green' : 'text-tr-red'}`}>
              {ticker.price > 0 ? fmt(ticker.price, decimals) : '—'}
            </span>
            <span className="text-tr-muted text-[10px]">
              {asks[0] && bids[0] ? fmt(asks[0].price - bids[bids.length - 1]?.price, decimals) : ''}
            </span>
          </div>

          {/* Bids */}
          <div className="flex-1 overflow-hidden">
            {bids.map((row, i) => (
              <OrderRow
                key={i}
                price={fmt(row.price, decimals)}
                qty={fmtQty(row.qty)}
                pct={row.qty / maxBidQty}
                side="bid"
              />
            ))}
          </div>
        </div>
      ) : (
        <RecentTrades trades={recentTrades} decimals={decimals} />
      )}
    </div>
  );
}

function OrderRow({ price, qty, pct, side }) {
  const isAsk = side === 'ask';
  const barColor = isAsk ? 'rgba(246,70,93,0.15)' : 'rgba(14,203,129,0.15)';
  const textColor = isAsk ? 'text-tr-red' : 'text-tr-green';

  return (
    <div className="relative flex justify-between px-2 py-[1px] hover:bg-tr-card cursor-pointer group">
      <div
        className="absolute inset-0 right-auto"
        style={{ width: `${pct * 100}%`, background: barColor, right: 0, left: 'auto' }}
      />
      <span className={`relative z-10 text-[11px] font-mono ${textColor}`}>{price}</span>
      <span className="relative z-10 text-[11px] font-mono text-tr-text">{qty}</span>
    </div>
  );
}

function RecentTrades({ trades, decimals }) {
  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="flex justify-between px-2 py-1 text-[10px] text-tr-muted">
        <span>Price</span>
        <span>Size</span>
        <span>Time</span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {trades.map((t, i) => (
          <div key={i} className="flex justify-between px-2 py-[2px] hover:bg-tr-card">
            <span className={`text-[11px] font-mono ${t.isBuyerMaker ? 'text-tr-red' : 'text-tr-green'}`}>
              {fmt(t.price, decimals)}
            </span>
            <span className="text-[11px] font-mono text-tr-text">{fmtQty(t.qty)}</span>
            <span className="text-[10px] text-tr-muted">
              {t.time ? new Date(t.time).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
