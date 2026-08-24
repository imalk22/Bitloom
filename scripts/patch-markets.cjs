const fs = require("fs");
const path = "C:/Users/imesh/Music/trading/src/App.jsx";
let src = fs.readFileSync(path, "utf8");
const start = src.indexOf("// ── MARKETS");
const end = src.indexOf("// ── FUTURES");
if (start < 0 || end < 0) {
  console.error("markers missing", start, end);
  process.exit(1);
}

const next = `// ── MARKETS ──────────────────────────────────────────────────────────────────
function MarketsPage({ livePairs = pairs }) {
  const { selected, setSelected, livePrice, displayPair } = useLivePrice(livePairs[0] || pairs[0], livePairs);
  const ranked = useMemo(
    () => [...livePairs].sort((a, b) => Math.abs(b.change ?? 0) - Math.abs(a.change ?? 0)),
    [livePairs]
  );
  const byVolume = useMemo(
    () => [...livePairs].sort((a, b) => parseFloat(b.volume) - parseFloat(a.volume)),
    [livePairs]
  );
  const gainers = useMemo(
    () => [...livePairs].sort((a, b) => (b.change ?? 0) - (a.change ?? 0)).slice(0, 6),
    [livePairs]
  );
  const losers = useMemo(
    () => [...livePairs].sort((a, b) => (a.change ?? 0) - (b.change ?? 0)).slice(0, 6),
    [livePairs]
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[250px_minmax(0,1fr)_280px] xl:min-h-[740px] xl:items-stretch">
        <aside className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 xl:min-h-0">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <h2 className="font-bold text-white">Markets</h2>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-sky-400">{livePairs.length} pairs</span>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {livePairs.map((pair) => (
              <PairCard
                key={pair.symbol}
                pair={pair.symbol === selected.symbol ? displayPair : pair}
                active={pair.symbol === selected.symbol}
                onClick={() => setSelected(pair)}
              />
            ))}
          </div>
        </aside>

        <section className="flex min-h-[560px] flex-col gap-3 xl:min-h-0">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <div className="text-[11px] text-slate-500">{displayPair.name}</div>
                <div className="text-xl font-extrabold tracking-tight text-white">{displayPair.symbol}</div>
              </div>
              <div className="text-2xl font-extrabold tabular-nums text-white">{formatPrice(livePrice)}</div>
              <div className={\`flex items-center gap-1 text-sm font-bold \${displayPair.change >= 0 ? "text-emerald-400" : "text-rose-400"}\`}>
                {displayPair.change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {displayPair.change >= 0 ? "+" : ""}
                {(displayPair.change ?? 0).toFixed(2)}%
              </div>
              <div className="ml-auto grid grid-cols-2 gap-x-5 gap-y-1 text-xs sm:grid-cols-4">
                {[
                  { label: "24h High", value: formatPrice(livePrice * 1.018) },
                  { label: "24h Low", value: formatPrice(livePrice * 0.982) },
                  { label: "24h Vol", value: displayPair.volume },
                  { label: "Funding", value: "+0.0100%" },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="text-slate-500">{s.label}</div>
                    <div className="font-semibold tabular-nums text-slate-200">{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <ChartPanel symbol={selected.symbol} fill />
          </div>
        </section>

        <aside className="flex min-h-[520px] flex-col gap-3 xl:min-h-0">
          <div className="min-h-0 flex-[1.35]">
            <OrderBook mid={livePrice} />
          </div>
          <div className="h-[260px] shrink-0 overflow-hidden xl:h-auto xl:flex-1">
            <TradesFeed mid={livePrice} />
          </div>
        </aside>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
            <Activity className="h-4 w-4 text-sky-400" /> Sentiment
          </h3>
          <div className="mb-2 flex h-2.5 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full bg-emerald-500" style={{ width: "64%" }} />
            <div className="h-full bg-rose-500" style={{ width: "36%" }} />
          </div>
          <div className="mb-3 flex justify-between text-xs">
            <span className="font-bold text-emerald-400">64% Buy</span>
            <span className="font-bold text-rose-400">36% Sell</span>
          </div>
          <div className="space-y-2 text-xs text-slate-500">
            {ranked.slice(0, 4).map((p) => {
              const pct = Math.min(92, Math.max(18, 50 + (p.change ?? 0) * 8));
              const up = pct >= 50;
              return (
                <div key={p.symbol}>
                  <div className="mb-1 flex justify-between">
                    <span>{p.symbol.replace("USDT", "")}</span>
                    <span className={up ? "text-emerald-400" : "text-rose-400"}>{pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div className={\`h-full rounded-full \${up ? "bg-emerald-500" : "bg-rose-500"}\`} style={{ width: \`\${pct}%\` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
            <TrendingUp className="h-4 w-4 text-emerald-400" /> Leaders
          </h3>
          <div className="space-y-1.5">
            {gainers.map((p) => (
              <button key={\`g-\${p.symbol}\`} type="button" onClick={() => setSelected(p)}
                className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-slate-900/70">
                <span className="text-xs font-semibold text-white">{p.symbol.replace("USDT", "")}</span>
                <span className="text-xs font-bold tabular-nums text-emerald-400">
                  {(p.change ?? 0) >= 0 ? "+" : ""}{(p.change ?? 0).toFixed(2)}%
                </span>
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-1.5 border-t border-slate-800 pt-2">
            {losers.slice(0, 3).map((p) => (
              <button key={\`l-\${p.symbol}\`} type="button" onClick={() => setSelected(p)}
                className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-slate-900/70">
                <span className="text-xs font-semibold text-white">{p.symbol.replace("USDT", "")}</span>
                <span className="text-xs font-bold tabular-nums text-rose-400">
                  {(p.change ?? 0) >= 0 ? "+" : ""}{(p.change ?? 0).toFixed(2)}%
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
            <Layers className="h-4 w-4 text-sky-400" /> Session
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Long / Short", value: "58 / 42" },
              { label: "OI Change 1h", value: "+1.24%", up: true },
              { label: "Basis", value: "+0.02%" },
              { label: "Spread", value: "0.8 bps" },
              { label: "Maker Fee", value: "0.02%" },
              { label: "Taker Fee", value: "0.04%" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-slate-800 bg-slate-900/50 p-2.5">
                <div className="text-[10px] text-slate-500">{s.label}</div>
                <div className={\`mt-0.5 text-sm font-bold tabular-nums \${s.up ? "text-emerald-400" : "text-white"}\`}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
            <Globe className="h-4 w-4 text-sky-400" /> Global
          </h3>
          <div className="space-y-2.5">
            {[
              { label: "Market Cap", value: "$3.12T", up: true },
              { label: "24h Volume", value: "$142.8B", up: true },
              { label: "BTC Dominance", value: "54.2%" },
              { label: "Open Interest", value: "$48.6B", up: true },
              { label: "Liquidations 24h", value: "$186M", up: false },
              { label: "Fear & Greed", value: "62 · Greed", up: true },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between text-xs">
                <span className="text-slate-500">{s.label}</span>
                <span className={\`font-bold tabular-nums \${s.up === true ? "text-emerald-400" : s.up === false ? "text-rose-400" : "text-slate-300"}\`}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h3 className="flex items-center gap-2 font-bold text-white">
            <BarChart3 className="h-4 w-4 text-sky-400" /> All markets
          </h3>
          <span className="text-xs text-slate-500">Live · click row to focus</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-slate-900/50 text-left text-xs text-slate-500">
              <tr>
                {["Pair", "Last", "24h %", "24h High", "24h Low", "Volume", "Action"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byVolume.map((p) => {
                const up = (p.change ?? 0) >= 0;
                return (
                  <tr key={p.symbol} onClick={() => setSelected(p)}
                    className={\`cursor-pointer border-t border-slate-800/70 hover:bg-slate-900/40 \${selected.symbol === p.symbol ? "bg-sky-500/5" : ""}\`}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{p.symbol}</div>
                      <div className="text-[11px] text-slate-500">{p.name}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-slate-200">{formatPrice(p.price)}</td>
                    <td className={\`px-4 py-3 font-bold tabular-nums \${up ? "text-emerald-400" : "text-rose-400"}\`}>
                      {up ? "+" : ""}{(p.change ?? 0).toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-400">{formatPrice(p.price * 1.018)}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-400">{formatPrice(p.price * 0.982)}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-400">{p.volume}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-lg bg-sky-500/15 px-2.5 py-1 text-xs font-semibold text-sky-400">Trade</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-white"><BarChart3 className="h-4 w-4 text-sky-400" /> Volume leaders</h3>
          <div className="space-y-2">
            {byVolume.map((p, i) => (
              <div key={p.symbol} className="flex items-center gap-2">
                <span className="w-4 text-right text-[11px] text-slate-600">{i + 1}</span>
                <span className="w-12 text-xs font-bold text-white">{p.symbol.replace("USDT", "")}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400" style={{ width: \`\${Math.max(16, 100 - i * 8)}%\` }} />
                </div>
                <span className="w-14 text-right text-[11px] tabular-nums text-slate-400">{p.volume}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-white"><RefreshCw className="h-4 w-4 text-sky-400" /> Exchange flow</h3>
          <div className="space-y-2">
            {[
              { sym: "BTC", net: "+$228M", up: true, inn: "$842M", out: "$614M" },
              { sym: "ETH", net: "+$23M", up: true, inn: "$421M", out: "$398M" },
              { sym: "USDT", net: "+$60M", up: true, inn: "$1.24B", out: "$1.18B" },
              { sym: "SOL", net: "-$36M", up: false, inn: "$98M", out: "$134M" },
              { sym: "BNB", net: "-$27M", up: false, inn: "$184M", out: "$211M" },
            ].map((f) => (
              <div key={f.sym} className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{f.sym}</span>
                  <span className={\`text-xs font-bold \${f.up ? "text-emerald-400" : "text-rose-400"}\`}>{f.net}</span>
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-slate-500">
                  <span>In {f.inn}</span><span>Out {f.out}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-white"><Clock className="h-4 w-4 text-sky-400" /> Calendar</h3>
          <div className="space-y-2.5">
            {[
              { d: "Today", t: "US CPI watch", tag: "MACRO" },
              { d: "Tue", t: "BTC options expiry", tag: "BTC" },
              { d: "Wed", t: "ETH staking flows", tag: "ETH" },
              { d: "Thu", t: "FOMC minutes", tag: "MACRO" },
              { d: "Fri", t: "SOL unlock window", tag: "SOL" },
            ].map((e) => (
              <div key={e.t} className="flex items-start gap-3 border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
                <div className="w-12 text-xs font-bold text-slate-400">{e.d}</div>
                <div>
                  <div className="text-xs font-semibold text-white">{e.t}</div>
                  <span className="mt-1 inline-block rounded border border-sky-500/20 bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-bold text-sky-400">{e.tag}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <FearGreedWidget />
        <NewsFeed />
      </div>
      <FundingRateWidget />
      <LiquidationTracker />
      <MarketHeatmapSection livePairs={livePairs} />
      <GlobalStatsBar />
    </div>
  );
}


`;

src = src.slice(0, start) + next + src.slice(end);
fs.writeFileSync(path, src);
console.log("OK MarketsPage replaced");
