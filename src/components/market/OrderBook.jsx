import { useMemo } from "react";
import { formatPrice } from "../../lib/market";

function row(size, price, side, maxSize) {
  const pct = Math.min(100, (size / maxSize) * 100);
  return { size, price, side, pct };
}

export default function OrderBook({ mid }) {
  const { asks, bids, maxSize } = useMemo(() => {
    const m = mid || 100;
    const asks = Array.from({ length: 8 }, (_, i) =>
      row(+(Math.random() * 2 + 0.1).toFixed(3), +(m * (1 + (i + 1) * 0.0004)).toFixed(m > 100 ? 2 : 4), "ask")
    ).reverse();
    const bids = Array.from({ length: 8 }, (_, i) =>
      row(+(Math.random() * 2 + 0.1).toFixed(3), +(m * (1 - (i + 1) * 0.0004)).toFixed(m > 100 ? 2 : 4), "bid")
    );
    const max = Math.max(...asks.map((r) => r.size), ...bids.map((r) => r.size), 0.01);
    return {
      asks: asks.map((r) => ({ ...r, pct: (r.size / max) * 100 })),
      bids: bids.map((r) => ({ ...r, pct: (r.size / max) * 100 })),
      maxSize: max,
    };
  }, [Math.round((mid || 0) * 10)]);

  return (
    <div className="flex h-full flex-col text-[11px]">
      <div className="grid grid-cols-3 border-b border-[var(--border)] px-3 py-2 text-[var(--muted)]">
        <span>Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Total</span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {asks.map((r) => (
          <div key={`a-${r.price}`} className="relative grid grid-cols-3 px-3 py-0.5">
            <div
              className="absolute inset-y-0 right-0 bg-[var(--down)]/10"
              style={{ width: `${r.pct}%` }}
            />
            <span className="relative tabular text-[var(--down)]">{formatPrice(r.price)}</span>
            <span className="relative text-right tabular text-[var(--text)]">{r.size}</span>
            <span className="relative text-right tabular text-[var(--muted)]">{(r.size * r.price).toFixed(2)}</span>
          </div>
        ))}
        <div className="border-y border-[var(--border)] bg-[var(--elevated)] px-3 py-1.5 text-center text-xs font-semibold tabular">
          {formatPrice(mid)}
        </div>
        {bids.map((r) => (
          <div key={`b-${r.price}`} className="relative grid grid-cols-3 px-3 py-0.5">
            <div
              className="absolute inset-y-0 right-0 bg-[var(--up)]/10"
              style={{ width: `${r.pct}%` }}
            />
            <span className="relative tabular text-[var(--up)]">{formatPrice(r.price)}</span>
            <span className="relative text-right tabular text-[var(--text)]">{r.size}</span>
            <span className="relative text-right tabular text-[var(--muted)]">{(r.size * r.price).toFixed(2)}</span>
          </div>
        ))}
      </div>
      <p className="border-t border-[var(--border)] px-3 py-1.5 text-[10px] text-[var(--muted)]">Simulated depth</p>
    </div>
  );
}
