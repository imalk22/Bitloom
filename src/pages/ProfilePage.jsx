import { Link } from "react-router-dom";
import { useTrading } from "../context/TradingContext";
import { formatUsd } from "../lib/market";
import Button from "../components/ui/Button";

export default function ProfilePage() {
  const { currentUser, balance, isLoggedIn, logout, tradeHistory } = useTrading();
  const refCode = currentUser?.uid ? currentUser.uid.slice(0, 8).toUpperCase() : "——";

  if (!isLoggedIn) {
    return (
      <div className="rounded-[4px] border border-[var(--border)] bg-[var(--panel)] p-8 text-center">
        <h1 className="text-lg font-semibold">Account</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Log in to manage your profile.</p>
        <Link to="/login" className="mt-4 inline-block">
          <Button>Log in</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-lg font-semibold">Account</h1>
      <div className="rounded-[4px] border border-[var(--border)] bg-[var(--panel)] p-5">
        <div className="text-xs text-[var(--muted)]">Signed in as</div>
        <div className="mt-1 font-medium">{currentUser.email}</div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-[var(--muted)]">Balance</div>
            <div className="tabular font-semibold">{formatUsd(balance)}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--muted)]">Trades</div>
            <div className="tabular font-semibold">{tradeHistory.length}</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="text-xs text-[var(--muted)]">Referral code</div>
          <div className="mt-1 rounded-[4px] border border-[var(--border)] bg-[var(--elevated)] px-3 py-2 font-mono text-sm">
            {refCode}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link to="/deposit">
            <Button>Deposit</Button>
          </Link>
          <Link to="/withdraw">
            <Button variant="ghost">Withdraw</Button>
          </Link>
          <Button variant="soft" onClick={logout}>
            Log out
          </Button>
        </div>
      </div>
    </div>
  );
}
