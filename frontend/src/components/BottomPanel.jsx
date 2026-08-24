import { useState } from 'react';
import useTradingStore from '../store/tradingStore';

function fmt(n, d = 2) { return Number(n).toFixed(d); }

export default function BottomPanel() {
  const [tab, setTab] = useState('positions');
  const { positions, orderHistory, ticker, balance, closePosition } = useTradingStore();

  const totalPnl = positions.reduce((sum, p) => {
    const cp = ticker.price || p.entryPrice;
    return sum + (p.side === 'LONG' ? (cp - p.entryPrice) * p.size : (p.entryPrice - cp) * p.size);
  }, 0);

  const tabs = [
    { key: 'positions', label: `Positions (${positions.length})` },
    { key: 'history', label: `History (${orderHistory.length})` },
    { key: 'assets', label: 'Assets' },
  ];

  return (
    <div className="h-full flex flex-col bg-tr-panel">
      <div className="flex items-center border-b border-tr-border">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              tab === t.key ? 'text-tr-text border-b-2 border-tr-yellow' : 'text-tr-muted hover:text-tr-text'
            }`}
          >
            {t.label}
          </button>
        ))}
        {positions.length > 0 && (
          <span className={`ml-auto mr-4 text-xs font-bold ${totalPnl >= 0 ? 'text-tr-green' : 'text-tr-red'}`}>
            Unrealized PnL: {totalPnl >= 0 ? '+' : ''}${fmt(totalPnl)}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin">
        {tab === 'positions' && <PositionsTable positions={positions} ticker={ticker} onClose={closePosition} />}
        {tab === 'history' && <HistoryTable history={orderHistory} />}
        {tab === 'assets' && <AssetsPanel balance={balance} positions={positions} ticker={ticker} />}
      </div>
    </div>
  );
}

function PositionsTable({ positions, ticker, onClose }) {
  if (!positions.length) return <Empty label="No open positions — place a trade to get started" />;

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-tr-muted border-b border-tr-border sticky top-0 bg-tr-panel">
          {['Symbol', 'Side', 'Size', 'Entry Price', 'Mark Price', 'Liq. Price', 'Margin', 'Unrealized PnL', 'Leverage', ''].map(h => (
            <th key={h} className="text-left px-3 py-2 font-normal whitespace-nowrap">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {positions.map(p => {
          const cp = ticker.price || p.entryPrice;
          const pnl = p.side === 'LONG' ? (cp - p.entryPrice) * p.size : (p.entryPrice - cp) * p.size;
          const pnlPct = (pnl / p.margin) * 100;
          const liqPrice = p.side === 'LONG'
            ? p.entryPrice * (1 - 1 / p.leverage)
            : p.entryPrice * (1 + 1 / p.leverage);
          const decimals = p.entryPrice > 1000 ? 2 : 4;

          return (
            <tr key={p.id} className="border-b border-tr-border/40 hover:bg-tr-card">
              <td className="px-3 py-2 font-semibold">{p.symbol}</td>
              <td className={`px-3 py-2 font-bold ${p.side === 'LONG' ? 'text-tr-green' : 'text-tr-red'}`}>
                {p.side}
              </td>
              <td className="px-3 py-2">{fmt(p.size, 4)}</td>
              <td className="px-3 py-2">${fmt(p.entryPrice, decimals)}</td>
              <td className="px-3 py-2">${fmt(cp, decimals)}</td>
              <td className="px-3 py-2 text-tr-yellow">${fmt(liqPrice, decimals)}</td>
              <td className="px-3 py-2">${fmt(p.margin)}</td>
              <td className={`px-3 py-2 font-semibold ${pnl >= 0 ? 'text-tr-green' : 'text-tr-red'}`}>
                {pnl >= 0 ? '+' : ''}${fmt(pnl)}
                <span className="text-[10px] ml-1 opacity-70">({pnlPct >= 0 ? '+' : ''}{fmt(pnlPct)}%)</span>
              </td>
              <td className="px-3 py-2 text-tr-yellow">{p.leverage}x</td>
              <td className="px-3 py-2">
                <button
                  onClick={() => onClose(p.id)}
                  className="text-tr-red text-[10px] border border-tr-red/40 rounded px-2 py-0.5 hover:bg-tr-red hover:text-white transition-colors"
                >
                  Close
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function HistoryTable({ history }) {
  if (!history.length) return <Empty label="No closed trades yet" />;

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-tr-muted border-b border-tr-border sticky top-0 bg-tr-panel">
          {['Symbol', 'Side', 'Size', 'Entry', 'Close', 'PnL', 'Leverage', 'Closed At'].map(h => (
            <th key={h} className="text-left px-3 py-2 font-normal whitespace-nowrap">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {history.map((h, i) => {
          const decimals = h.entryPrice > 1000 ? 2 : 4;
          return (
            <tr key={i} className="border-b border-tr-border/40 hover:bg-tr-card">
              <td className="px-3 py-2 font-semibold">{h.symbol}</td>
              <td className={`px-3 py-2 font-bold ${h.side === 'LONG' ? 'text-tr-green' : 'text-tr-red'}`}>{h.side}</td>
              <td className="px-3 py-2">{fmt(h.size, 4)}</td>
              <td className="px-3 py-2">${fmt(h.entryPrice, decimals)}</td>
              <td className="px-3 py-2">${fmt(h.closePrice, decimals)}</td>
              <td className={`px-3 py-2 font-semibold ${h.pnl >= 0 ? 'text-tr-green' : 'text-tr-red'}`}>
                {h.pnl >= 0 ? '+' : ''}${fmt(h.pnl)}
              </td>
              <td className="px-3 py-2 text-tr-yellow">{h.leverage}x</td>
              <td className="px-3 py-2 text-tr-muted">{new Date(h.closeTime).toLocaleTimeString()}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function AssetsPanel({ balance, positions, ticker }) {
  const lockedMargin = positions.reduce((s, p) => s + p.margin, 0);
  const totalPnl = positions.reduce((sum, p) => {
    const cp = ticker.price || p.entryPrice;
    return sum + (p.side === 'LONG' ? (cp - p.entryPrice) * p.size : (p.entryPrice - cp) * p.size);
  }, 0);
  const equity = balance + lockedMargin + totalPnl;

  return (
    <div className="p-4 flex flex-wrap gap-6 text-xs">
      <Asset label="Total Equity" value={`$${(equity).toFixed(2)}`} />
      <Asset label="Available Balance" value={`$${balance.toFixed(2)}`} color="text-tr-green" />
      <Asset label="Locked Margin" value={`$${lockedMargin.toFixed(2)}`} />
      <Asset label="Unrealized PnL" value={`${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`} color={totalPnl >= 0 ? 'text-tr-green' : 'text-tr-red'} />
      <div className="w-full border-t border-tr-border pt-3 text-tr-muted text-[10px]">
        ℹ This is a paper trading account. No real funds are used.
      </div>
    </div>
  );
}

function Asset({ label, value, color = 'text-tr-text' }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-tr-muted text-[10px]">{label}</span>
      <span className={`font-bold text-base ${color}`}>{value}</span>
    </div>
  );
}

function Empty({ label }) {
  return (
    <div className="flex items-center justify-center h-full text-tr-muted text-xs py-6">{label}</div>
  );
}
