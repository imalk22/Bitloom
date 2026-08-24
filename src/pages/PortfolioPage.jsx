import { Link } from "react-router-dom";
import { useTrading } from "../context/TradingContext";
import { formatUsd } from "../lib/market";
import Button from "../components/ui/Button";

export default function PortfolioPage() {
  const { balance, tradeHistory, isLoggedIn } = useTrading();
  const dayPnl = tradeHistory
    .filter((t) => t.completedAt && Date.now() - t.completedAt < 86400000)
    .reduce((sum, t) => sum + (t.pnl || 0), 0);

  if (!isLoggedIn) {
    return (
      <div className="rounded-[4px] border border-[var(--border)] bg-[var(--panel)] p-8 text-center">
        <h1 className="text-lg font-semibold">Portfolio</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Log in to view balances and trade history.</p>
        <Link to="/login" className="mt-4 inline-block">
          <Button>Log in</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Portfolio</h1>
          <p className="text-sm text-[var(--muted)]">Balances and recent activity</p>
        </div>
        <div className="flex gap-2">
          <Link to="/deposit">
            <Button>Deposit</Button>
          </Link>
          <Link to="/withdraw">
            <Button variant="ghost">Withdraw</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[4px] border border-[var(--border)] bg-[var(--panel)] p-4">
          <div className="text-xs text-[var(--muted)]">Equity</div>
          <div className="mt-1 text-2xl font-semibold tabular">{formatUsd(balance)}</div>
          <div className={`mt-1 text-sm tabular ${dayPnl >= 0 ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
            {dayPnl >= 0 ? "+" : ""}
            {formatUsd(dayPnl)} today
          </div>
        </div>
        <div className="rounded-[4px] border border-[var(--border)] bg-[var(--panel)] p-4">
          <div className="text-xs text-[var(--muted)]">Available</div>
          <div className="mt-1 text-xl font-semibold tabular">{formatUsd(balance)}</div>
        </div>
        <div className="rounded-[4px] border border-[var(--border)] bg-[var(--panel)] p-4">
          <div className="text-xs text-[var(--muted)]">Trades (stored)</div>
          <div className="mt-1 text-xl font-semibold tabular">{tradeHistory.length}</div>
        </div>
      </div>

      <div className="rounded-[4px] border border-[var(--border)] bg-[var(--panel)]">
        <div className="border-b border-[var(--border)] px-4 py-3 text-sm font-medium">Recent binary trades</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-[var(--muted)]">
              <tr>
                <th className="px-4 py-2 font-medium">Symbol</th>
                <th className="px-4 py-2 font-medium">Side</th>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">PnL</th>
              </tr>
            </thead>
            <tbody>
              {tradeHistory.slice(0, 20).map((t, i) => (
                <tr key={t.firestoreId || t.id || i} className="border-t border-[var(--border)]">
                  <td className="px-4 py-2">{t.symbol}</td>
                  <td className={`px-4 py-2 ${t.side === "buy" ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
                    {t.side === "buy" ? "Up" : "Down"}
                  </td>
                  <td className="px-4 py-2 tabular">{formatUsd(t.amount)}</td>
                  <td className={`px-4 py-2 tabular ${t.pnl >= 0 ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
                    {t.pnl >= 0 ? "+" : ""}
                    {formatUsd(t.pnl)}
                  </td>
                </tr>
              ))}
              {tradeHistory.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[var(--muted)]">
                    No trades yet. Open the terminal to place a binary trade.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
