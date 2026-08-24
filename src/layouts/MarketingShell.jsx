import { Outlet, Link } from "react-router-dom";
import Logo from "../components/brand/Logo";

export default function MarketingShell() {
  return (
    <div className="nx-light min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[var(--mkt-border)] bg-[var(--mkt-bg)]/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Logo tone="light" />
          <nav className="flex items-center gap-5 text-sm text-[var(--mkt-muted)]">
            <Link to="/markets" className="hover:text-[var(--mkt-text)]">
              Markets
            </Link>
            <Link to="/about" className="hover:text-[var(--mkt-text)]">
              About
            </Link>
            <Link to="/login" className="hover:text-[var(--mkt-text)]">
              Log in
            </Link>
            <Link
              to="/trade/BTCUSDT"
              className="rounded-[4px] bg-[var(--accent)] px-3 py-1.5 font-medium text-white hover:bg-[var(--accent-hover)]"
            >
              Trade
            </Link>
          </nav>
        </div>
      </header>
      <Outlet />
      <footer className="border-t border-[var(--mkt-border)] py-10 text-center text-xs text-[var(--mkt-muted)]">
        <div className="mx-auto max-w-6xl px-4">
          <p className="font-semibold text-[var(--mkt-text)]">Bitloom</p>
          <p className="mt-2">Professional trading interface. Markets involve risk.</p>
          <p className="mt-4">support@bitloom.online</p>
        </div>
      </footer>
    </div>
  );
}
