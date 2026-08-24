import { Link } from "react-router-dom";
import Button from "../components/ui/Button";

export default function LandingPage() {
  return (
    <div>
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[1.1fr_1fr] md:items-center md:py-24">
        <div>
          <p className="mb-3 text-sm font-semibold tracking-wide text-[var(--accent)]">Bitloom</p>
          <h1 className="max-w-xl text-4xl font-bold leading-[1.1] tracking-tight text-[var(--mkt-text)] md:text-5xl">
            Trade with institutional clarity
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-[var(--mkt-muted)]">
            A professional terminal for markets, portfolio, and short-duration binary trades — designed for focus, not noise.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/trade/BTCUSDT">
              <Button variant="light" className="px-5 py-2.5">
                Launch terminal
              </Button>
            </Link>
            <Link to="/signup">
              <Button variant="lightGhost" className="px-5 py-2.5">
                Create account
              </Button>
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-[8px] border border-[var(--border)] bg-[var(--bg)] shadow-[0_24px_80px_rgba(10,37,64,0.18)]">
          <div className="flex h-10 items-center gap-3 border-b border-[var(--border)] bg-[var(--panel)] px-3 text-[11px] text-[var(--muted)]">
            <span className="font-semibold text-[var(--accent)]">Bitloom</span>
            <span>Trade</span>
            <span>Markets</span>
            <span className="ml-auto tabular text-[var(--up)]">BTC/USDT +1.24%</span>
          </div>
          <div className="grid h-56 grid-cols-[1fr_1.4fr_0.9fr]">
            <div className="border-r border-[var(--border)] p-2 text-[10px] text-[var(--muted)]">
              <div className="mb-2 text-[var(--text)]">Markets</div>
              <div className="flex justify-between py-1"><span>BTC</span><span className="text-[var(--up)]">+1.2%</span></div>
              <div className="flex justify-between py-1"><span>ETH</span><span className="text-[var(--down)]">-0.5%</span></div>
              <div className="flex justify-between py-1"><span>SOL</span><span className="text-[var(--up)]">+2.1%</span></div>
            </div>
            <div className="flex items-end gap-1 border-r border-[var(--border)] p-3">
              {[40, 55, 35, 70, 48, 62, 44, 78, 52].map((h, i) => (
                <div
                  key={i}
                  className="w-full rounded-[1px]"
                  style={{ height: `${h}%`, background: i % 3 === 1 ? "var(--down)" : "var(--up)" }}
                />
              ))}
            </div>
            <div className="space-y-2 p-2">
              <div className="rounded-[2px] bg-[var(--accent)] px-2 py-1 text-center text-[10px] font-semibold text-white">Spot</div>
              <div className="grid grid-cols-2 gap-1">
                <div className="rounded-[2px] bg-[var(--up)] py-2 text-center text-[10px] font-bold text-[#042f2e]">Buy</div>
                <div className="rounded-[2px] border border-[var(--down)] py-2 text-center text-[10px] font-bold text-[var(--down)]">Sell</div>
              </div>
              <div className="h-8 rounded-[2px] border border-[var(--border)] bg-[var(--elevated)]" />
              <div className="rounded-[2px] bg-[var(--up)] py-2 text-center text-[10px] font-bold text-[#042f2e]">Buy BTC</div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--mkt-border)] bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-3">
          {[
            { t: "Dense terminal", d: "Chart, markets, and order ticket in one professional workspace." },
            { t: "Live market data", d: "Prices stream from public exchange feeds with clear connection status." },
            { t: "Clear money flows", d: "Deposit and withdraw with calm, institutional form design." },
          ].map((item) => (
            <div key={item.t}>
              <h3 className="text-sm font-semibold text-[var(--mkt-text)]">{item.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--mkt-muted)]">{item.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
