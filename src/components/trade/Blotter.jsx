import { formatPrice, formatUsd } from "../../lib/market";

export default function Blotter({ trades = [] }) {
  return (
    <div className="flex h-full flex-col border-t border-[var(--border)] bg-[var(--panel)]">
      <div className="flex gap-4 border-b border-[var(--border)] px-3 py-2 text-xs">
        <span className="border-b-2 border-[var(--accent)] pb-1 font-medium text-[var(--text)]">Binary</span>
        <span className="pb-1 text-[var(--muted)]">Positions</span>
        <span className="pb-1 text-[var(--muted)]">Open orders</span>
        <span className="pb-1 text-[var(--muted)]">History</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[var(--panel)] text-left text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2 font-medium">Symbol</th>
              <th className="px-3 py-2 font-medium">Side</th>
              <th className="px-3 py-2 font-medium">Amount</th>
              <th className="px-3 py-2 font-medium">Entry</th>
              <th className="px-3 py-2 font-medium">Exit</th>
              <th className="px-3 py-2 font-medium">PnL</th>
            </tr>
          </thead>
          <tbody>
            {trades.slice(0, 30).map((t, i) => (
              <tr key={t.firestoreId || t.id || i} className="border-t border-[var(--border)]/70">
                <td className="px-3 py-1.5">{t.symbol}</td>
                <td className={`px-3 py-1.5 ${t.side === "buy" ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
                  {t.side === "buy" ? "Up" : "Down"}
                </td>
                <td className="px-3 py-1.5 tabular">{formatUsd(t.amount)}</td>
                <td className="px-3 py-1.5 tabular">{formatPrice(t.entryPrice)}</td>
                <td className="px-3 py-1.5 tabular">{formatPrice(t.exitPrice)}</td>
                <td className={`px-3 py-1.5 tabular ${t.pnl >= 0 ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
                  {t.pnl >= 0 ? "+" : ""}
                  {formatUsd(t.pnl)}
                </td>
              </tr>
            ))}
            {trades.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-[var(--muted)]">
                  No binary trades yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
