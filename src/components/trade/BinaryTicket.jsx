import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import socket from "../../socket";
import { BINARY_DURATIONS } from "../../lib/market";
import { formatPrice, formatUsd } from "../../lib/market";
import Button from "../ui/Button";
import { useTrading } from "../../context/TradingContext";

export default function BinaryTicket({ symbol, mid }) {
  const { balance, isLoggedIn, handleTradeDone } = useTrading();
  const midRef = useRef(mid);
  const onTradeDoneRef = useRef(handleTradeDone);
  useEffect(() => {
    midRef.current = mid;
  }, [mid]);
  useEffect(() => {
    onTradeDoneRef.current = handleTradeDone;
  }, [handleTradeDone]);

  const [duration, setDuration] = useState(BINARY_DURATIONS[0]);
  const [amount, setAmount] = useState("100");
  const [activeTrade, setActiveTrade] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [result, setResult] = useState(null);
  const [pnlMode, setPnlMode] = useState("win");
  const pnlModeRef = useRef(pnlMode);
  useEffect(() => {
    pnlModeRef.current = pnlMode;
  }, [pnlMode]);

  useEffect(() => {
    fetch("http://localhost:3001/api/pnl-mode")
      .then((res) => res.json())
      .then((data) => setPnlMode(data.mode))
      .catch(() => {});
    const handlePnlMode = (cfg) => setPnlMode(cfg.mode);
    socket.on("pnl:mode", handlePnlMode);
    return () => socket.off("pnl:mode", handlePnlMode);
  }, []);

  useEffect(() => {
    if (!activeTrade) return undefined;
    setCountdown(activeTrade.seconds);
    const intervalId = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    const resolveId = setTimeout(() => {
      const exitPrice = midRef.current;
      const marketWon =
        activeTrade.side === "buy" ? exitPrice >= activeTrade.entryPrice : exitPrice <= activeTrade.entryPrice;

      fetch("http://localhost:3001/api/trade/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketWon,
          amount: activeTrade.amount,
          pct: activeTrade.pct,
          sessionId: activeTrade.sessionId || null,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          const completed = {
            ...activeTrade,
            exitPrice,
            won: data.won,
            pnl: data.pnl,
            completedAt: Date.now(),
          };
          setResult({ won: data.won, pnl: data.pnl, exitPrice });
          onTradeDoneRef.current(completed);
          setActiveTrade(null);
          setTimeout(() => setResult(null), 3500);
        })
        .catch(() => {
          const won = pnlModeRef.current !== "loss";
          const pnl = won ? +(activeTrade.amount * (activeTrade.pct / 100)).toFixed(2) : -activeTrade.amount;
          const completed = { ...activeTrade, exitPrice, won, pnl, completedAt: Date.now() };
          setResult({ won, pnl, exitPrice });
          onTradeDoneRef.current(completed);
          setActiveTrade(null);
          setTimeout(() => setResult(null), 3500);
        });
    }, activeTrade.seconds * 1000);
    return () => {
      clearInterval(intervalId);
      clearTimeout(resolveId);
    };
  }, [activeTrade]);

  const isWinning = useMemo(() => {
    if (!activeTrade) return false;
    if (pnlMode === "win") return true;
    if (pnlMode === "loss") return false;
    return activeTrade.side === "buy" ? mid >= activeTrade.entryPrice : mid <= activeTrade.entryPrice;
  }, [activeTrade, pnlMode, mid]);

  const placeTrade = (side) => {
    const amt = Number(amount);
    if (!isLoggedIn || amt <= 0 || amt > balance || activeTrade) return;
    const sessionId = localStorage.getItem("novax_chat_session") || null;
    setActiveTrade({
      id: Date.now(),
      symbol,
      side,
      amount: amt,
      entryPrice: midRef.current,
      seconds: duration.seconds,
      pct: duration.pct,
      label: duration.label,
      sessionId,
    });
  };

  if (result) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
        <div className={`text-3xl font-bold ${result.won ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
          {result.won ? "Won" : "Lost"}
        </div>
        <div className={`text-lg tabular ${result.won ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
          {result.pnl >= 0 ? "+" : ""}
          {formatUsd(result.pnl)}
        </div>
        <div className="text-xs text-[var(--muted)]">Exit {formatPrice(result.exitPrice)}</div>
      </div>
    );
  }

  if (activeTrade) {
    return (
      <div className="flex h-full flex-col p-3">
        <div className="text-xs text-[var(--muted)]">Binary in progress</div>
        <div className="mt-2 text-3xl font-semibold tabular">{countdown}s</div>
        <div className="mt-3 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Side</span>
            <span className={activeTrade.side === "buy" ? "text-[var(--up)]" : "text-[var(--down)]"}>
              {activeTrade.side === "buy" ? "Up" : "Down"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Entry</span>
            <span className="tabular">{formatPrice(activeTrade.entryPrice)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Mark</span>
            <span className={`tabular ${isWinning ? "text-[var(--up)]" : "text-[var(--down)]"}`}>{formatPrice(mid)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="text-xs text-[var(--muted)]">Binary · Up / Down</div>
      <div className="grid grid-cols-4 gap-1">
        {BINARY_DURATIONS.map((d) => (
          <button
            key={d.label}
            type="button"
            onClick={() => setDuration(d)}
            className={`cursor-pointer rounded-[2px] border py-2 text-[10px] ${
              duration.label === d.label
                ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--text)]"
                : "border-[var(--border)] text-[var(--muted)]"
            }`}
          >
            <div className="font-semibold">{d.label}</div>
            <div>{d.pct}%</div>
          </button>
        ))}
      </div>
      <label className="block text-xs text-[var(--muted)]">
        Amount (USDT)
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1 w-full rounded-[2px] border border-[var(--border)] bg-[var(--elevated)] px-2 py-2 text-sm tabular outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
        />
      </label>
      <div className="text-[11px] text-[var(--muted)]">
        Available <span className="tabular text-[var(--text)]">{formatUsd(balance)}</span>
      </div>
      {!isLoggedIn ? (
        <Link to="/login" className="mt-auto">
          <Button className="w-full">Log in to trade</Button>
        </Link>
      ) : (
        <div className="mt-auto grid grid-cols-2 gap-2">
          <Button variant="buy" onClick={() => placeTrade("buy")}>
            Up
          </Button>
          <Button variant="sell" onClick={() => placeTrade("sell")}>
            Down
          </Button>
        </div>
      )}
    </div>
  );
}
