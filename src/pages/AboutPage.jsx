import { Link } from "react-router-dom";
import Button from "../components/ui/Button";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <p className="text-sm font-semibold text-[var(--accent)]">About Bitloom</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--mkt-text)]">Built for serious market focus</h1>
      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-[var(--mkt-muted)]">
        <p>
          Bitloom is a professional trading interface for crypto and gold markets. The terminal centers on live prices,
          a clean chart workspace, and an exchange-style order ticket — with short-duration binary trading available as a dedicated mode.
        </p>
        <p>
          We design for clarity: restrained color, tabular numbers, and honest product surfaces. Marketing stays light and calm;
          the trading workspace stays dark and dense.
        </p>
        <p>
          Markets involve substantial risk of loss. Only trade with capital you can afford to risk.
        </p>
      </div>
      <div className="mt-8">
        <Link to="/trade/BTCUSDT">
          <Button variant="light">Open terminal</Button>
        </Link>
      </div>
    </div>
  );
}
