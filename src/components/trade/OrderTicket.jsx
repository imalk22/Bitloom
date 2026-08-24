import { useState } from "react";
import Button from "../ui/Button";
import { formatPrice, formatUsd } from "../../lib/market";

export default function OrderTicket({ symbol, mid, mode, balance }) {
  const [side, setSide] = useState("buy");
  const [size, setSize] = useState("0.01");
  const [leverage, setLeverage] = useState("5");
  const [note, setNote] = useState("");

  const notional = (Number(size) || 0) * (mid || 0);

  const submit = () => {
    setNote(
      `${mode === "futures" ? "Futures" : "Spot"} ${side.toUpperCase()} submitted (simulated). Notional ≈ ${formatUsd(notional)}.`
    );
    setTimeout(() => setNote(""), 3500);
  };

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={() => setSide("buy")}
          className={`cursor-pointer rounded-[2px] py-2 text-xs font-bold ${
            side === "buy" ? "bg-[var(--up)] text-[#042f2e]" : "border border-[var(--border)] text-[var(--up)]"
          }`}
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => setSide("sell")}
          className={`cursor-pointer rounded-[2px] py-2 text-xs font-bold ${
            side === "sell" ? "bg-[var(--down)] text-white" : "border border-[var(--down)] text-[var(--down)]"
          }`}
        >
          Sell
        </button>
      </div>

      <label className="block text-xs text-[var(--muted)]">
        Size
        <input
          value={size}
          onChange={(e) => setSize(e.target.value)}
          className="mt-1 w-full rounded-[2px] border border-[var(--border)] bg-[var(--elevated)] px-2 py-2 text-sm tabular text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
        />
      </label>

      <div className="grid grid-cols-4 gap-1">
        {[25, 50, 75, 100].map((pct) => (
          <button
            key={pct}
            type="button"
            onClick={() => {
              const budget = (balance || 0) * (pct / 100);
              const qty = mid ? +(budget / mid).toFixed(mid > 100 ? 4 : 6) : 0;
              setSize(String(qty));
            }}
            className="cursor-pointer rounded-[2px] border border-[var(--border)] py-1 text-[10px] text-[var(--muted)] hover:text-[var(--text)]"
          >
            {pct}%
          </button>
        ))}
      </div>

      {mode === "futures" && (
        <label className="block text-xs text-[var(--muted)]">
          Leverage
          <input
            value={leverage}
            onChange={(e) => setLeverage(e.target.value)}
            className="mt-1 w-full rounded-[2px] border border-[var(--border)] bg-[var(--elevated)] px-2 py-2 text-sm tabular outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
          />
        </label>
      )}

      <div className="space-y-1 text-[11px] text-[var(--muted)]">
        <div className="flex justify-between">
          <span>Mark</span>
          <span className="tabular text-[var(--text)]">{formatPrice(mid)}</span>
        </div>
        <div className="flex justify-between">
          <span>Est. notional</span>
          <span className="tabular text-[var(--text)]">{formatUsd(notional)}</span>
        </div>
        <p className="pt-1 text-[10px] leading-relaxed">Simulated order ticket — no live spot/futures matching.</p>
      </div>

      <Button variant={side === "buy" ? "buy" : "sell"} className="mt-auto w-full" onClick={submit}>
        {side === "buy" ? "Buy" : "Sell"} {symbol.replace("USDT", "")}
      </Button>
      {note && <p className="text-[11px] text-[var(--accent)]">{note}</p>}
    </div>
  );
}
