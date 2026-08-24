import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTrading } from "../context/TradingContext";
import { displaySymbol, formatPrice, PAIRS, TIMEFRAMES } from "../lib/market";
import Tabs from "../components/ui/Tabs";
import Watchlist from "../components/market/Watchlist";
import OrderBook from "../components/market/OrderBook";
import CandleChart from "../components/chart/CandleChart";
import OrderTicket from "../components/trade/OrderTicket";
import BinaryTicket from "../components/trade/BinaryTicket";
import Blotter from "../components/trade/Blotter";

export default function TradePage() {
  const { symbol: routeSymbol } = useParams();
  const navigate = useNavigate();
  const { livePairs, tradeHistory, balance } = useTrading();
  const symbol = (routeSymbol || "BTCUSDT").toUpperCase();
  const pair = useMemo(
    () => livePairs.find((p) => p.symbol === symbol) || PAIRS.find((p) => p.symbol === symbol) || livePairs[0],
    [livePairs, symbol]
  );

  const [leftTab, setLeftTab] = useState("markets");
  const [ticketMode, setTicketMode] = useState("spot");
  const [timeframe, setTimeframe] = useState("15m");

  return (
    <div className="grid h-full min-h-0 grid-cols-1 grid-rows-[auto_minmax(280px,1fr)_auto_200px] lg:grid-cols-[260px_minmax(0,1fr)_300px] lg:grid-rows-[auto_minmax(0,1fr)_200px]">
      <div className="col-span-full flex flex-wrap items-center gap-3 border-b border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-xs">
        <span className="text-sm font-semibold text-[var(--text)]">{displaySymbol(pair.symbol)}</span>
        <span className="tabular nx-mono text-sm font-medium">{formatPrice(pair.price)}</span>
        <span className={`tabular nx-mono ${pair.change >= 0 ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
          {pair.change >= 0 ? "+" : ""}
          {pair.change.toFixed(2)}%
        </span>
        <span className="text-[var(--muted)]">Vol {pair.volume}</span>
      </div>

      <aside className="hidden min-h-0 border-r border-[var(--border)] bg-[var(--panel)] lg:row-span-2 lg:block">
        <div className="border-b border-[var(--border)] p-2">
          <Tabs
            tabs={[
              { id: "markets", label: "Markets" },
              { id: "book", label: "Order book" },
            ]}
            value={leftTab}
            onChange={setLeftTab}
          />
        </div>
        <div className="h-[calc(100%-41px)]">
          {leftTab === "markets" ? (
            <Watchlist pairs={livePairs} selected={symbol} onSelect={(s) => navigate(`/trade/${s}`)} />
          ) : (
            <OrderBook mid={pair.price} />
          )}
        </div>
      </aside>

      <section className="flex min-h-0 flex-col border-r border-[var(--border)]">
        <div className="flex gap-1 border-b border-[var(--border)] px-2 py-1.5">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`cursor-pointer rounded-[2px] px-2 py-1 text-[11px] ${
                timeframe === tf ? "bg-[var(--elevated)] text-[var(--text)]" : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
        <div className="min-h-[240px] flex-1">
          <CandleChart symbol={pair.symbol} timeframe={timeframe} />
        </div>
      </section>

      <aside className="flex min-h-[300px] flex-col border-l border-[var(--border)] bg-[var(--panel)] lg:min-h-0">
        <div className="border-b border-[var(--border)] p-2">
          <Tabs
            tabs={[
              { id: "spot", label: "Spot" },
              { id: "futures", label: "Futures" },
              { id: "binary", label: "Binary" },
            ]}
            value={ticketMode}
            onChange={setTicketMode}
          />
        </div>
        <div className="min-h-0 flex-1">
          {ticketMode === "binary" ? (
            <BinaryTicket symbol={pair.symbol} mid={pair.price} />
          ) : (
            <OrderTicket symbol={pair.symbol} mid={pair.price} mode={ticketMode} balance={balance} />
          )}
        </div>
      </aside>

      <div className="col-span-full min-h-[200px] lg:col-start-2 lg:col-end-4">
        <Blotter trades={tradeHistory} />
      </div>
    </div>
  );
}
