import { displaySymbol, formatPrice } from "../../lib/market";

export default function Watchlist({ pairs, selected, onSelect }) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--muted)]">Markets</div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {pairs.map((p) => {
          const active = p.symbol === selected;
          const up = p.change >= 0;
          return (
            <button
              key={p.symbol}
              type="button"
              onClick={() => onSelect(p.symbol)}
              className={`flex w-full cursor-pointer items-center justify-between border-b border-[var(--border)]/60 px-3 py-2 text-left text-xs transition hover:bg-[var(--elevated)] ${
                active ? "bg-[var(--elevated)]" : ""
              }`}
            >
              <span className="font-medium text-[var(--text)]">{displaySymbol(p.symbol)}</span>
              <span className="text-right">
                <span className="block tabular nx-mono text-[var(--text)]">{formatPrice(p.price)}</span>
                <span className={`tabular nx-mono ${up ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
                  {up ? "+" : ""}
                  {p.change.toFixed(2)}%
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
