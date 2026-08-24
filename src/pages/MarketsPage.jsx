import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTrading } from "../context/TradingContext";
import { displaySymbol, formatPrice } from "../lib/market";

export default function MarketsPage() {
  const { livePairs } = useTrading();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return livePairs.filter(
      (p) => !query || p.symbol.toLowerCase().includes(query) || p.name.toLowerCase().includes(query)
    );
  }, [livePairs, q]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text)]">Markets</h1>
          <p className="text-sm text-[var(--muted)]">Select a pair to open the terminal.</p>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search pairs"
          className="w-full max-w-xs rounded-[4px] border border-[var(--border)] bg-[var(--elevated)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
        />
      </div>

      <div className="overflow-x-auto rounded-[4px] border border-[var(--border)]">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead className="bg-[var(--panel)] text-left text-xs text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2.5 font-medium">Pair</th>
              <th className="px-3 py-2.5 font-medium">Last</th>
              <th className="px-3 py-2.5 font-medium">24h %</th>
              <th className="px-3 py-2.5 font-medium">Volume</th>
              <th className="px-3 py-2.5 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const up = p.change >= 0;
              return (
                <tr
                  key={p.symbol}
                  onClick={() => navigate(`/trade/${p.symbol}`)}
                  className="cursor-pointer border-t border-[var(--border)] hover:bg-[var(--elevated)]/60"
                >
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-[var(--text)]">{displaySymbol(p.symbol)}</div>
                    <div className="text-xs text-[var(--muted)]">{p.name}</div>
                  </td>
                  <td className="px-3 py-2.5 tabular nx-mono">{formatPrice(p.price)}</td>
                  <td className={`px-3 py-2.5 tabular nx-mono ${up ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
                    {up ? "+" : ""}
                    {p.change.toFixed(2)}%
                  </td>
                  <td className="px-3 py-2.5 text-[var(--muted)] tabular">{p.volume}</td>
                  <td className="px-3 py-2.5 text-right text-[var(--accent)]">Trade</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
