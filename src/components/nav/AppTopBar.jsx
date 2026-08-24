import { NavLink, Link } from "react-router-dom";
import Logo from "../brand/Logo";
import ConnectionStatus from "./ConnectionStatus";
import { useSocketStatus } from "../../hooks/useSocketStatus";
import { useTrading } from "../../context/TradingContext";
import { formatUsd } from "../../lib/market";

const linkClass = ({ isActive }) =>
  `text-sm transition ${isActive ? "text-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--text)]"}`;

export default function AppTopBar({ dense = false }) {
  const { isLoggedIn, balance, currentUser, logout } = useTrading();
  const status = useSocketStatus();

  return (
    <header
      className={`sticky top-0 z-30 flex items-center gap-5 border-b border-[var(--border)] bg-[var(--panel)] px-4 ${
        dense ? "h-12" : "h-14"
      }`}
    >
      <Logo />
      <nav className="hidden items-center gap-4 sm:flex">
        <NavLink to="/trade/BTCUSDT" className={linkClass}>
          Trade
        </NavLink>
        <NavLink to="/markets" className={linkClass}>
          Markets
        </NavLink>
        <NavLink to="/portfolio" className={linkClass}>
          Portfolio
        </NavLink>
      </nav>
      <div className="ml-auto flex items-center gap-4">
        <ConnectionStatus status={status} />
        {isLoggedIn ? (
          <>
            <span className="hidden text-xs text-[var(--muted)] md:inline tabular">{formatUsd(balance)}</span>
            <Link to="/deposit" className="text-xs text-[var(--accent)] hover:underline">
              Deposit
            </Link>
            <Link
              to="/profile"
              className="max-w-[140px] truncate text-xs text-[var(--muted)] hover:text-[var(--text)]"
              title={currentUser?.email}
            >
              {currentUser?.email || "Account"}
            </Link>
            <button
              type="button"
              onClick={logout}
              className="cursor-pointer text-xs text-[var(--muted)] hover:text-[var(--text)]"
            >
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-sm text-[var(--muted)] hover:text-[var(--text)]">
              Log in
            </Link>
            <Link
              to="/signup"
              className="rounded-[4px] bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
