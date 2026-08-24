import { Outlet, Link } from "react-router-dom";
import Logo from "../components/brand/Logo";

export default function AuthMoneyShell() {
  return (
    <div className="nx-light flex min-h-screen flex-col bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)]">
      <header className="flex h-14 items-center justify-between border-b border-[var(--mkt-border)] bg-white/80 px-4 backdrop-blur">
        <Logo tone="light" />
        <Link to="/trade/BTCUSDT" className="text-sm text-[var(--mkt-muted)] hover:text-[var(--mkt-text)]">
          Back to terminal
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
