import { useNavigate } from "react-router-dom";


import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import socket from "./socket.js";
import { auth, googleProvider, loadTrades } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import {
  Search, Settings, Wallet, TrendingUp, TrendingDown,
  CandlestickChart, ShieldCheck, Activity, BarChart3,
  Globe, Zap, Clock, ArrowUpRight, ArrowDownRight,
  RefreshCw, CircleDot, AlertTriangle, BookOpen, PieChart, Layers,
  Eye, EyeOff, Lock, Mail, User, Users, Lightbulb, X,
  MessageCircle, LogOut, CheckCircle2, Share2, Code, HeadphonesIcon, Send,
  Copy, Menu,
} from "lucide-react";
import logoMark from "./assets/bitloom-logo.png";
import { createChart, CandlestickSeries } from "lightweight-charts";
import { API_BASE } from "./config.js";

// ─── TICKER BAR ────────────────────────────────────────────────────────────────
function TickerBar({ livePairs = pairs }) {
  const items = [...livePairs, ...livePairs];
  return (
    <div className="bg-[#060a12]/95 border-b border-slate-800/60 overflow-hidden">
      <div
        className="flex gap-10 py-2 px-4"
        style={{ animation: "ticker 32s linear infinite", width: "max-content" }}
      >
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2.5 shrink-0">
            <span className="text-[11px] font-bold text-slate-500 tracking-wide">{item.symbol}</span>
            <span className="text-[12px] font-black text-white tabular-nums">{formatPrice(item.price)}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md tabular-nums ${item.change >= 0 ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"}`}>
              {item.change >= 0 ? "+" : ""}{item.change}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

  // ─── CONSTANTS ─────────────────────────────────────────────────────────────────
const pairs = [
  { symbol: "BTCUSDT",  name: "Bitcoin",   price: 104832.60, change:  2.14, volume: "4.82B"  },
  { symbol: "ETHUSDT",  name: "Ethereum",  price:  3864.25,  change:  1.28, volume: "2.19B"  },
  { symbol: "SOLUSDT",  name: "Solana",    price:   176.84,  change: -0.72, volume: "829.4M" },
  { symbol: "XAUUSDT",  name: "Gold Perp", price:  3368.40,  change:  0.44, volume: "188.2M" },
  { symbol: "BNBUSDT",  name: "BNB",       price:   702.19,  change:  3.08, volume: "642.7M" },
  { symbol: "XRPUSDT",  name: "Ripple",    price:     0.524, change:  1.89, volume: "1.24B"  },
  { symbol: "ADAUSDT",  name: "Cardano",   price:     0.912, change:  1.54, volume: "312.1M" },
  { symbol: "DOGEUSDT", name: "Dogecoin",  price:     0.184, change: -1.30, volume: "890.4M" },
  { symbol: "AVAXUSDT", name: "Avalanche", price:    35.24,  change:  2.67, volume: "245.8M" },
  { symbol: "DOTUSDT",  name: "Polkadot",  price:     7.83,  change: -0.41, volume: "118.6M" },
];

const timeframes = ["1m", "5m", "15m", "1h", "4h", "1D"];

const DURATIONS = [
  { label: "30s",  seconds: 30,  pct: 15 },
  { label: "60s",  seconds: 60,  pct: 30 },
  { label: "90s",  seconds: 90,  pct: 45 },
  { label: "120s", seconds: 120, pct: 60 },
];

const REFERRAL_CODE = "Bitloom-REF-2025";


const INITIAL_TRANSACTIONS = [
  { type: "Deposit",  asset: "USDT", amount: "10,000.00", status: "Completed", date: "2025-05-10 14:23" },
  { type: "Deposit",  asset: "BTC",  amount: "0.1000",    status: "Completed", date: "2025-05-09 09:15" },
  { type: "Withdraw", asset: "USDT", amount: "500.00",    status: "Completed", date: "2025-05-08 17:30" },
  { type: "Deposit",  asset: "ETH",  amount: "2.0000",    status: "Completed", date: "2025-05-07 11:05" },
  { type: "Withdraw", asset: "BTC",  amount: "0.0100",    status: "Pending",   date: "2025-05-06 08:42" },
];

// ─── HELPERS ───────────────────────────────────────────────────────────────────
function formatPrice(v) {
  return Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function randomAround(base, spread = 100) {
  return base + (Math.random() - 0.5) * spread;
}
function generateBook(mid) {
  const asks = Array.from({ length: 11 }, (_, i) => ({
    price: mid + (i + 1) * randomAround(14, 7),
    amount: Math.random() * 2.8 + 0.08,
    total: Math.random() * 500 + 50,
  })).sort((a, b) => b.price - a.price);
  const bids = Array.from({ length: 11 }, (_, i) => ({
    price: mid - (i + 1) * randomAround(14, 7),
    amount: Math.random() * 2.8 + 0.08,
    total: Math.random() * 500 + 50,
  })).sort((a, b) => b.price - a.price);
  return { asks, bids };
}
function generateTrades(mid) {
  return Array.from({ length: 18 }, (_, i) => ({
    id: i,
    price: randomAround(mid, 160),
    size: Math.random() * 1.7 + 0.01,
    side: Math.random() > 0.5 ? "buy" : "sell",
    time: new Date(Date.now() - i * 9000).toLocaleTimeString([], { hour12: false }),
  }));
}

// ─── HEADER ────────────────────────────────────────────────────────────────────
function Header({ activePage, setActivePage, isLoggedIn, currentUser, onLogout, onAdminClick, livePairs = pairs, onPickPair }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch]     = useState("");

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return livePairs
      .filter((p) => p.symbol.toLowerCase().includes(q) || (p.name || "").toLowerCase().includes(q))
      .slice(0, 6);
  }, [search, livePairs]);

  const pickPair = (pair) => {
    setSearch("");
    onPickPair?.(pair);
  };
  const navItems = [
    { id: "markets", label: "Markets" },
    { id: "futures", label: "Trade Desk" },
    { id: "assets",  label: "Portfolio" },
    { id: "about",   label: "Company" },
  ];

  const go = (id) => {
    setActivePage(id);
    setMenuOpen(false);
  };

  return (
    <>
      <div className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#080d16]/95 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between gap-2 px-3 sm:h-16 sm:px-5">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 lg:hidden"
              aria-label="Open menu"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="flex min-w-0 cursor-pointer items-center gap-2" onClick={() => go("markets")}>
              <img src={logoMark} alt="Bitloom" className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-sky-400/30 sm:h-9 sm:w-9 sm:rounded-xl" />
              <div className="min-w-0 leading-tight">
                <span className="block truncate text-base font-extrabold tracking-tight text-white sm:text-lg">Bitloom</span>
                <span className="hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-400/80 sm:block">Trading</span>
              </div>
            </div>
            <nav className="ml-2 hidden items-center gap-1 text-sm lg:flex">
              {navItems.map((item) => (
                <button key={item.id} onClick={() => go(item.id)}
                  className={`cursor-pointer rounded-lg px-3 py-2 font-semibold transition-all xl:px-4 ${activePage === item.id ? "border border-sky-500/30 bg-sky-500/15 text-white shadow-sm shadow-sky-500/10" : "border border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"}`}>
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <div className="relative hidden md:block md:w-44 xl:w-52">
              <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2">
                <Search className="h-4 w-4 shrink-0 text-slate-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && matches[0]) pickPair(matches[0]);
                    if (e.key === "Escape") setSearch("");
                  }}
                  className="w-full bg-transparent text-sm text-slate-300 outline-none"
                  placeholder="Search markets…"
                />
                {search && (
                  <button type="button" onClick={() => setSearch("")} className="shrink-0 cursor-pointer text-slate-500 hover:text-slate-300" aria-label="Clear search">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {search.trim() && (
                <div className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/50">
                  {matches.length === 0 ? (
                    <div className="px-3 py-3 text-xs text-slate-600">No market found</div>
                  ) : (
                    matches.map((p) => (
                      <button key={p.symbol} type="button" onClick={() => pickPair(p)}
                        className="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:bg-slate-900">
                        <span>
                          <span className="block text-xs font-bold text-white">{p.symbol}</span>
                          <span className="block text-[10px] text-slate-500">{p.name}</span>
                        </span>
                        <span className={`text-xs font-bold tabular-nums ${(p.change ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {(p.change ?? 0) >= 0 ? "+" : ""}{(p.change ?? 0).toFixed(2)}%
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <button type="button" onClick={onAdminClick} title="Control Desk"
              className="hidden rounded-lg border border-sky-500/20 bg-slate-900 p-2 text-sky-400/60 transition hover:border-sky-500/50 hover:text-sky-400 sm:inline-flex">
              <ShieldCheck className="h-4 w-4" />
            </button>
            {isLoggedIn ? (
              <>
                <button type="button" onClick={() => navigate("/deposit")}
                  className="cursor-pointer rounded-lg bg-sky-500 px-2.5 py-2 text-xs font-bold text-slate-950 shadow-md shadow-sky-500/25 transition hover:bg-sky-400 sm:px-4 sm:text-sm">
                  Deposit
                </button>
                <button type="button" onClick={() => go("profile")}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 transition hover:ring-2 hover:ring-sky-400/50"
                  title={currentUser?.displayName || currentUser?.email || "Profile"}>
                  {currentUser?.displayName
                    ? <span className="text-xs font-black text-slate-950">{currentUser.displayName[0].toUpperCase()}</span>
                    : <User className="h-4 w-4 text-slate-950" />}
                </button>
                <button type="button" onClick={onLogout} title="Log out"
                  className="hidden cursor-pointer rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-300 transition hover:border-slate-700 sm:inline-flex">
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => go("login")}
                  className="hidden cursor-pointer rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:border-slate-700 sm:inline-flex">
                  Sign in
                </button>
                <button type="button" onClick={() => go("signup")}
                  className="cursor-pointer rounded-lg bg-sky-500 px-2.5 py-2 text-xs font-bold text-slate-950 shadow-md shadow-sky-500/25 transition hover:bg-sky-400 sm:px-4 sm:text-sm">
                  Sign up
                </button>
              </>
            )}
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-slate-800 bg-[#080d16] px-3 py-3 lg:hidden">
            <div className="grid grid-cols-2 gap-2">
              {navItems.map((item) => (
                <button key={item.id} type="button" onClick={() => go(item.id)}
                  className={`cursor-pointer rounded-xl border px-3 py-3 text-sm font-semibold ${activePage === item.id ? "border-sky-500/40 bg-sky-500/15 text-sky-300" : "border-slate-800 bg-slate-950 text-slate-300"}`}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              {isLoggedIn ? (
                <>
                  <button type="button" onClick={() => { setMenuOpen(false); navigate("/deposit"); }}
                    className="flex-1 cursor-pointer rounded-xl bg-sky-500 py-3 text-sm font-bold text-slate-950">Deposit</button>
                  <button type="button" onClick={() => go("profile")}
                    className="flex-1 cursor-pointer rounded-xl border border-slate-800 bg-slate-950 py-3 text-sm font-semibold text-slate-300">Account</button>
                  <button type="button" onClick={() => { setMenuOpen(false); onLogout(); }}
                    className="cursor-pointer rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-300"><LogOut className="h-4 w-4" /></button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => go("login")}
                    className="flex-1 cursor-pointer rounded-xl border border-slate-800 bg-slate-950 py-3 text-sm font-semibold text-slate-300">Sign in</button>
                  <button type="button" onClick={() => go("signup")}
                    className="flex-1 cursor-pointer rounded-xl bg-sky-500 py-3 text-sm font-bold text-slate-950">Create account</button>
                </>
              )}
            </div>
            <button type="button" onClick={() => { setMenuOpen(false); onAdminClick(); }}
              className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-sky-500/20 bg-slate-950 py-2.5 text-xs font-semibold text-sky-400">
              <ShieldCheck className="h-3.5 w-3.5" /> Control desk
            </button>
          </div>
        )}
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-4 border-t border-slate-800 bg-[#080d16]/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => go(item.id)}
            className={`flex min-h-[56px] cursor-pointer flex-col items-center justify-center gap-1 px-1 text-[10px] font-semibold ${
              activePage === item.id ? "text-sky-400" : "text-slate-500"
            }`}
          >
            {item.id === "markets" && <BarChart3 className="h-4 w-4" />}
            {item.id === "futures" && <CandlestickChart className="h-4 w-4" />}
            {item.id === "assets" && <Wallet className="h-4 w-4" />}
            {item.id === "about" && <Globe className="h-4 w-4" />}
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}

// ─── PAIR CARD ─────────────────────────────────────────────────────────────────
function PairCard({ pair, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full text-left rounded-xl border p-4 transition-all cursor-pointer ${active ? "bg-slate-800/70 border-sky-500/40 shadow-lg shadow-sky-500/10" : "bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/70"}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-white font-semibold tracking-tight">{pair.symbol}</div>
          <div className="text-xs text-slate-500">{pair.name}</div>
        </div>
        <div className={`text-xs font-bold flex items-center gap-1 tabular-nums ${pair.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
          {pair.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {pair.change}%
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div className="text-lg font-bold text-white tabular-nums">{formatPrice(pair.price)}</div>
        <div className="text-xs text-slate-500">Vol {pair.volume}</div>
      </div>
    </button>
  );
}

// ─── CHART PANEL ───────────────────────────────────────────────────────────────
function ChartPanel({ symbol }) {
  const [tf, setTf] = useState("15m");
  const [status, setStatus] = useState("loading");
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const intervalMap = { "1m": "1m", "5m": "5m", "15m": "15m", "1h": "1h", "4h": "4h", "1D": "1d" };

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const el = containerRef.current;
    const chart = createChart(el, {
      layout: {
        background: { color: "#080d16" },
        textColor: "#94a3b8",
        fontFamily: "Plus Jakarta Sans, system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: "#1e293b" },
        horzLines: { color: "#1e293b" },
      },
      rightPriceScale: { borderColor: "#334155" },
      timeScale: { borderColor: "#334155", timeVisible: true },
      crosshair: { mode: 0 },
      width: Math.max(el.clientWidth, 320),
      height: Math.max(el.clientHeight, 200),
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#34d399",
      downColor: "#fb7185",
      borderVisible: false,
      wickUpColor: "#34d399",
      wickDownColor: "#fb7185",
    });
    chartRef.current = chart;
    seriesRef.current = series;
    const ro = new ResizeObserver(() => {
      if (!containerRef.current) return;
      chart.applyOptions({
        width: containerRef.current.clientWidth,
        height: Math.max(containerRef.current.clientHeight, 200),
      });
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const interval = intervalMap[tf] || "15m";
    const base = symbol === "XAUUSDT"
      ? "https://fapi.binance.com/fapi/v1/klines"
      : "https://api.binance.com/api/v3/klines";
    setStatus("loading");
    (async () => {
      try {
        const res = await fetch(`${base}?symbol=${symbol}&interval=${interval}&limit=220`);
        const raw = await res.json();
        if (cancelled || !seriesRef.current || !Array.isArray(raw)) {
          if (!cancelled) setStatus("error");
          return;
        }
        seriesRef.current.setData(
          raw.map((k) => ({
            time: Math.floor(k[0] / 1000),
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
          }))
        );
        chartRef.current?.timeScale().fitContent();
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, [symbol, tf]);

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/40 px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3">
        <div>
          <div className="text-base font-extrabold tracking-tight text-white sm:text-lg">{symbol}</div>
          <div className="text-xs text-slate-500">
            {status === "loading" ? "Loading candles…" : status === "error" ? "Chart feed unavailable" : "Live candlestick"}
          </div>
        </div>
        <div className="flex max-w-full items-center gap-1 overflow-x-auto pb-0.5 sm:gap-1.5">
          {timeframes.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTf(t)}
              className={`cursor-pointer shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition sm:px-3 sm:text-xs ${
                tf === t ? "bg-sky-500 text-slate-950" : "border border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="h-[280px] w-full bg-[#080d16] sm:h-[380px] xl:h-[480px]" />
    </div>
  );
}

// ─── ORDER BOOK ────────────────────────────────────────────────────────────────
function OrderBook({ mid }) {
  const [{ asks, bids }, setBook] = useState(generateBook(mid));
  useEffect(() => {
    const t = setInterval(() => setBook(generateBook(mid)), 1800);
    return () => clearInterval(t);
  }, [mid]);
  const Row = ({ item, type }) => (
    <div className="grid grid-cols-3 text-xs py-1.5 relative overflow-hidden">
      <div className={`font-semibold ${type === "ask" ? "text-rose-400" : "text-emerald-400"}`}>{formatPrice(item.price)}</div>
      <div className="text-slate-300 text-right">{item.amount.toFixed(4)}</div>
      <div className="text-slate-500 text-right">{item.total.toFixed(1)}</div>
      <div className={`absolute right-0 top-0 h-full opacity-10 ${type === "ask" ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, item.total / 5)}%` }} />
    </div>
  );
  return (
    <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-bold">Order Book</h3>
        <span className="text-xs text-slate-500">0.1</span>
      </div>
      <div className="grid grid-cols-3 text-[11px] text-slate-500 pb-2 border-b border-slate-800">
        <span>Price</span><span className="text-right">Amount</span><span className="text-right">Total</span>
      </div>
      <div className="mt-2 flex-1 overflow-hidden">
        <div>{asks.slice(0, 8).map((a, i) => <Row key={`a${i}`} item={a} type="ask" />)}</div>
        <div className="my-3 p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <span className="text-2xl font-black text-emerald-400">{formatPrice(mid)}</span>
          <Activity className="h-4 w-4 text-emerald-400 animate-pulse" />
        </div>
        <div>{bids.slice(0, 8).map((b, i) => <Row key={`b${i}`} item={b} type="bid" />)}</div>
      </div>
    </div>
  );
}

// ─── TRADES FEED ───────────────────────────────────────────────────────────────
function TradesFeed({ mid }) {
  const [trades, setTrades] = useState(generateTrades(mid));
  useEffect(() => {
    const t = setInterval(() => setTrades(generateTrades(mid)), 1500);
    return () => clearInterval(t);
  }, [mid]);
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <h3 className="mb-3 font-bold text-white">Recent Trades</h3>
      <div className="grid grid-cols-3 border-b border-slate-800 pb-2 text-[11px] text-slate-500">
        <span>Price</span><span className="text-right">Size</span><span className="text-right">Time</span>
      </div>
      <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
        {trades.map((t) => (
          <div key={t.id} className="grid grid-cols-3 py-1.5 text-xs">
            <span className={t.side === "buy" ? "text-emerald-400" : "text-rose-400"}>{formatPrice(t.price)}</span>
            <span className="text-right text-slate-300">{t.size.toFixed(4)}</span>
            <span className="text-right text-slate-500">{t.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── POSITIONS TABLE ───────────────────────────────────────────────────────────
function Positions({ mode = "futures" }) {
  const spotRows = [
    ["BTCUSDT", "0.042", "104,832.60", "+82.45",  "+0.79%"],
    ["ETHUSDT", "1.200", "3,864.25",   "-18.20",  "-0.47%"],
  ];
  const futuresRows = [
    ["BTCUSDT", "Buy 10x",  "0.042", "102,840.50", "+82.45", "+1.92%"],
    ["ETHUSDT", "Sell 5x",  "1.200", "3,902.10",   "-18.20", "-0.38%"],
    ["XAUUSDT", "Buy 3x",   "0.500", "3,350.20",   "+9.40",  "+0.56%"],
  ];
  const headers = mode === "spot" ? ["Pair", "Amount", "Value", "PNL", "ROE"] : ["Pair", "Side", "Size", "Entry", "PNL", "ROE"];
  const rows   = mode === "spot" ? spotRows : futuresRows;
  const pnlIdx = mode === "spot" ? 3 : 4;
  const roeIdx = mode === "spot" ? 4 : 5;
  return (
    <div className="rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-white font-bold">{mode === "spot" ? "Holdings" : "Positions / Open Orders"}</h3>
        <span className="text-xs text-emerald-400 flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Secure</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-slate-500 bg-slate-900/40">
            <tr>{headers.map((h) => <th key={h} className="text-left px-5 py-3 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri} className="border-t border-slate-800/60 hover:bg-slate-900/30 transition">
                {r.map((c, i) => (
                  <td key={i} className={`px-5 py-3 ${(i === pnlIdx || i === roeIdx) ? (c.startsWith("+") ? "text-emerald-400" : "text-rose-400") : i === 1 && mode === "futures" ? (c.startsWith("Buy") ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold") : "text-slate-300"}`}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── PAIR SIDEBAR ──────────────────────────────────────────────────────────────
function PairSidebar({ pairs: pairList, selected, livePrice, onSelect }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q
    ? pairList.filter((p) => p.symbol.toLowerCase().includes(q) || (p.name || "").toLowerCase().includes(q))
    : pairList;
  return (
    <div className="rounded-3xl bg-slate-950 border border-slate-800 p-4">
      <div className="mb-3 flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
        <Search className="h-3.5 w-3.5 shrink-0 text-slate-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-transparent text-xs text-slate-300 outline-none"
          placeholder="Search pair…"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} className="shrink-0 cursor-pointer text-slate-500 hover:text-slate-300" aria-label="Clear search">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="space-y-1">
        {shown.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-slate-600">No pair matches “{query}”</div>
        )}
        {shown.map((pair) => (
          <button key={pair.symbol} onClick={() => onSelect(pair)} className={`w-full text-left rounded-xl px-3 py-2.5 transition cursor-pointer ${pair.symbol === selected.symbol ? "bg-slate-800/90 border border-sky-500/40 shadow-md shadow-sky-500/10" : "hover:bg-slate-900/70"}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white font-semibold">{pair.symbol}</span>
              <span className={`text-xs font-bold ${pair.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{pair.change >= 0 ? "+" : ""}{pair.change}%</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">{formatPrice(pair.symbol === selected.symbol ? livePrice : pair.price)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── PRICE BANNER ──────────────────────────────────────────────────────────────
function PriceBanner({ pair, livePrice }) {
  return (
    <div className="rounded-3xl bg-slate-950 border border-slate-800 px-5 py-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="text-white font-black text-2xl">{pair.symbol}</div>
        <div className="text-3xl font-black text-white">{formatPrice(livePrice)}</div>
        <div className={`text-sm font-bold flex items-center gap-1 ${pair.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
          {pair.change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          {pair.change}%
        </div>
        <div className="flex gap-6 text-xs text-slate-500 ml-auto">
          <span>24h High: <span className="text-slate-300">{formatPrice(livePrice * 1.018)}</span></span>
          <span>24h Low: <span className="text-slate-300">{formatPrice(livePrice * 0.982)}</span></span>
          <span>Vol: <span className="text-slate-300">{pair.volume}</span></span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MOCK TRADING ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

function CountdownRing({ total, remaining }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? remaining / total : 0;
  const offset = circ * (1 - pct);
  const color = pct > 0.6 ? "#10b981" : pct > 0.3 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative flex-shrink-0 w-[90px] h-[90px]">
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r={r} fill="none" stroke="#1e293b" strokeWidth="7" />
        <circle cx="45" cy="45" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 45 45)"
          style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.4s" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-black text-white leading-none">{remaining}</span>
        <span className="text-[9px] text-slate-500 mt-0.5">sec</span>
      </div>
    </div>
  );
}

function MiniTradeChart({ priceHistory, entryPrice, isWinning }) {
  if (priceHistory.length < 2) {
    return <div className="h-14 rounded-xl bg-slate-900 flex items-center justify-center text-slate-600 text-xs">Building chart…</div>;
  }
  const pad = 2;
  const min = Math.min(...priceHistory) - pad;
  const max = Math.max(...priceHistory) + pad;
  const range = max - min || 1;
  const W = 260; const H = 56;
  const pts = priceHistory.map((p, i) => `${(i / Math.max(priceHistory.length - 1, 1)) * W},${H - ((p - min) / range) * H}`).join(" ");
  const entryY = H - ((entryPrice - min) / range) * H;
  const lastX = ((priceHistory.length - 1) / Math.max(priceHistory.length - 1, 1)) * W;
  const lastY = H - ((priceHistory[priceHistory.length - 1] - min) / range) * H;
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <line x1="0" y1={entryY} x2={W} y2={entryY} stroke="#475569" strokeDasharray="4,3" strokeWidth="1" />
      <polyline points={pts} fill="none" stroke={isWinning ? "#10b981" : "#ef4444"} strokeWidth="2" />
      <circle cx={lastX} cy={lastY} r="3" fill={isWinning ? "#10b981" : "#ef4444"} />
    </svg>
  );
}

async function apiAuthHeaders(user) {
  const headers = { "Content-Type": "application/json" };
  if (!user) return headers;
  try {
    const token = await user.getIdToken();
    headers.Authorization = `Bearer ${token}`;
  } catch {
    /* local backend accepts uid/email headers when Admin SDK is off */
  }
  if (user.uid) headers["x-user-uid"] = user.uid;
  if (user.email) headers["x-user-email"] = user.email;
  return headers;
}

async function fetchMe(user) {
  const headers = await apiAuthHeaders(user);
  const res = await fetch(`${API_BASE}/api/me`, { headers });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to load balance");
  return res.json();
}

function BinaryTradePanel({ symbol, mid, balance, onTradeDone, onBalanceChange, currentUser }) {
  const midRef = useRef(mid);
  const onTradeDoneRef = useRef(onTradeDone);
  useEffect(() => { midRef.current = mid; }, [mid]);
  useEffect(() => { onTradeDoneRef.current = onTradeDone; }, [onTradeDone]);

  const [duration, setDuration] = useState(DURATIONS[0]);
  const [amount, setAmount]     = useState("100");
  const [activeTrade, setActiveTrade] = useState(null);
  const [prevActiveTrade, setPrevActiveTrade] = useState(null);
  const [tradeError, setTradeError] = useState("");
  const [placing, setPlacing] = useState(false);
  const [countdown, setCountdown]     = useState(0);
  const [priceHistory, setPriceHistory] = useState([]);
  const [result, setResult]           = useState(null);

  const [pnlMode, setPnlMode] = useState("win");
  const pnlModeRef = useRef(pnlMode);
  useEffect(() => { pnlModeRef.current = pnlMode; }, [pnlMode]);

  // Fetch initial P&L mode and subscribe to socket updates
  useEffect(() => {
    fetch(`${API_BASE}/api/pnl-mode`)
      .then(res => res.json())
      .then(data => setPnlMode(data.mode))
      .catch(() => {});

    const handlePnlMode = (cfg) => {
      setPnlMode(cfg.mode);
    };
    socket.on("pnl:mode", handlePnlMode);
    return () => {
      socket.off("pnl:mode", handlePnlMode);
    };
  }, []);

  // Render-time derived state — reset countdown & chart when trade changes
  if (activeTrade !== prevActiveTrade) {
    setPrevActiveTrade(activeTrade);
    setCountdown(activeTrade ? activeTrade.seconds : 0);
    setPriceHistory(activeTrade ? [activeTrade.entryPrice] : []);
  }

  // Countdown timer + resolve
  useEffect(() => {
    if (!activeTrade) return;
    const intervalId = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    const resolveId  = setTimeout(() => {
      const exitPrice = midRef.current;
      const marketWon = activeTrade.side === "buy" ? exitPrice >= activeTrade.entryPrice : exitPrice <= activeTrade.entryPrice;

      (async () => {
        try {
          const headers = await apiAuthHeaders(currentUser);
          const res = await fetch(`${API_BASE}/api/trade/resolve`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              marketWon,
              tradeId:   activeTrade.tradeId,
              amount:    activeTrade.amount,
              pct:       activeTrade.pct,
              sessionId: activeTrade.sessionId || null,
              uid:       currentUser?.uid,
              email:     currentUser?.email,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Resolve failed");
          const won = data.won;
          const pnl = data.pnl;
          if (typeof data.balance === "number") onBalanceChange?.(data.balance);
          const completed = { ...activeTrade, exitPrice, won, pnl, completedAt: Date.now(), serverSettled: true };
          setResult({ won, pnl, exitPrice });
          onTradeDoneRef.current(completed);
          setActiveTrade(null);
          setTimeout(() => setResult(null), 3500);
        } catch (err) {
          console.error("Trade resolution failed:", err);
          setTradeError(err.message || "Settlement failed — contact support");
          setActiveTrade(null);
        }
      })();
    }, activeTrade.seconds * 1000);
    return () => { clearInterval(intervalId); clearTimeout(resolveId); };
  }, [activeTrade, currentUser, onBalanceChange]);

  // Build price history during active trade
  useEffect(() => {
    if (!activeTrade) return;
    const t = setInterval(() => {
      setPriceHistory((prev) => [...prev.slice(-120), midRef.current]);
    }, 1000);
    return () => clearInterval(t);
  }, [activeTrade]);

  const placeTrade = async (side) => {
    const amt = Number(amount);
    setTradeError("");
    if (!currentUser) {
      setTradeError("Sign in to trade");
      return;
    }
    if (amt <= 0 || activeTrade || placing) return;
    if (balance <= 0) {
      setTradeError("Zero balance — contact support to deposit first");
      return;
    }
    if (amt > balance) {
      setTradeError("Amount exceeds your available balance");
      return;
    }
    setPlacing(true);
    try {
      const sessionId = localStorage.getItem("novax_chat_session") || null;
      const headers = await apiAuthHeaders(currentUser);
      const res = await fetch(`${API_BASE}/api/trade/open`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          amount: amt,
          pct: duration.pct,
          symbol,
          side,
          sessionId,
          uid: currentUser.uid,
          email: currentUser.email,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not open trade");
      if (typeof data.balance === "number") onBalanceChange?.(data.balance);
      setActiveTrade({
        id: data.tradeId || Date.now(),
        tradeId: data.tradeId,
        symbol, side, amount: amt,
        entryPrice: midRef.current,
        seconds: duration.seconds, pct: duration.pct, label: duration.label,
        sessionId,
      });
    } catch (err) {
      setTradeError(err.message || "Trade rejected");
    } finally {
      setPlacing(false);
    }
  };

  // Derive real-time win/loss status for the active trade
  const isWinning = useMemo(() => {
    if (!activeTrade) return false;
    if (pnlMode === "win") return true;
    if (pnlMode === "loss") return false;
    const marketWon = activeTrade.side === "buy" ? mid >= activeTrade.entryPrice : mid <= activeTrade.entryPrice;
    return marketWon;
  }, [activeTrade, pnlMode, mid]);

  // ── RESULT SCREEN ──
  if (result) {
    return (
      <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="rounded-3xl bg-slate-950 border border-slate-800 p-8 flex flex-col items-center gap-3 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }} transition={{ duration: 0.5 }}
          className={`text-6xl font-black ${result.won ? "text-emerald-400" : "text-rose-400"}`}>
          {result.won ? "WIN!" : "LOSS"}
        </motion.div>
        <div className={`text-3xl font-black ${result.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
          {result.pnl >= 0 ? "+" : ""}{formatPrice(result.pnl)} USDT
        </div>
        <div className="text-sm text-slate-400">Exit price: {formatPrice(result.exitPrice)}</div>
        <div className={`mt-2 px-4 py-2 rounded-2xl text-xs font-semibold ${result.won ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
          {result.won ? "Profit added to your balance" : "Amount deducted from balance"}
        </div>
      </motion.div>
    );
  }

  // ── ACTIVE TRADE VIEW ──
  if (activeTrade) {
    return (
      <div className="rounded-3xl bg-slate-950 border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className={`px-3 py-1 rounded-xl text-sm font-black ${activeTrade.side === "buy" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"}`}>
            {activeTrade.side === "buy" ? "▲ BUY" : "▼ SELL"} · {activeTrade.label}
          </div>
          <div className={`text-xs font-bold px-3 py-1 rounded-xl animate-pulse ${isWinning ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
            {isWinning ? "● WINNING" : "● LOSING"}
          </div>
        </div>

        {/* Mini sparkline */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden px-2 pt-1">
          <MiniTradeChart priceHistory={priceHistory} entryPrice={activeTrade.entryPrice} isWinning={isWinning} />
        </div>

        {/* Countdown + stats */}
        <div className="flex items-center gap-3">
          <CountdownRing total={activeTrade.seconds} remaining={countdown} />
          <div className="flex-1 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Entry</span>
              <span className="text-white font-semibold">{formatPrice(activeTrade.entryPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Current</span>
              <span className={`font-semibold ${isWinning ? "text-emerald-400" : "text-rose-400"}`}>{formatPrice(mid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Staked</span>
              <span className="text-white">{formatPrice(activeTrade.amount)} USDT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payout</span>
              <span className="text-emerald-400 font-bold">+{formatPrice(activeTrade.amount * activeTrade.pct / 100)}</span>
            </div>
          </div>
        </div>

        <div className={`p-3 rounded-2xl text-center text-sm font-bold border ${isWinning ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"}`}>
          {isWinning
            ? `On track → WIN +${formatPrice(activeTrade.amount * activeTrade.pct / 100)} USDT`
            : `At risk → LOSS -${formatPrice(activeTrade.amount)} USDT`}
        </div>
      </div>
    );
  }

  // ── ORDER FORM ──
  const amt = Number(amount) || 0;
  return (
    <div className="space-y-5 rounded-3xl border border-slate-800 bg-slate-950 p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-white">Trade</h3>
        <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-slate-400">{symbol}</span>
      </div>

      <div>
        <div className="mb-2 text-xs text-slate-500">Duration &amp; Return</div>
        <div className="grid grid-cols-4 gap-2">
          {DURATIONS.map((d) => (
            <button key={d.label} onClick={() => setDuration(d)}
              className={`rounded-xl border py-3.5 text-center transition ${duration.label === d.label ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"}`}>
              <div className="text-sm font-black">{d.label}</div>
              <div className="mt-0.5 text-[10px] text-slate-500">+{d.pct}%</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-500">Amount USDT</label>
        <input className="mt-1.5 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-4 text-xl font-black tabular-nums text-white outline-none transition focus:border-sky-500/50"
          value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100" />
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[10, 25, 50, 100].map((v) => (
          <button key={v} onClick={() => setAmount(String(v))} className="cursor-pointer rounded-xl border border-slate-800 bg-slate-900 py-2.5 text-xs font-semibold text-slate-400 transition hover:border-slate-700">${v}</button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-center text-sm">
        <div>
          <div className="mb-1 text-[10px] text-slate-500">Payout</div>
          <div className="text-base font-black text-emerald-400">+{formatPrice(amt * duration.pct / 100)}</div>
        </div>
        <div>
          <div className="mb-1 text-[10px] text-slate-500">Return</div>
          <div className="text-base font-black text-sky-400">{duration.pct}%</div>
        </div>
        <div>
          <div className="mb-1 text-[10px] text-slate-500">Max Loss</div>
          <div className="text-base font-black text-rose-400">-{formatPrice(amt)}</div>
        </div>
      </div>

      <div className="flex justify-between px-1 text-sm text-slate-500">
        <span>Balance</span>
        <span className="font-bold tabular-nums text-white">{formatPrice(balance)} USDT</span>
      </div>

      {tradeError && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300">
          {tradeError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => placeTrade("buy")} disabled={placing || !!activeTrade}
          className="py-5 rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-black font-black hover:from-emerald-300 hover:to-emerald-500 active:scale-95 transition-all flex flex-col items-center gap-1 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/45 hover:shadow-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
          <TrendingUp className="h-6 w-6" />
          <span className="text-lg leading-none">{placing ? "…" : "BUY"}</span>
          <span className="text-[10px] font-semibold opacity-70">Price Goes Up</span>
        </button>
        <button onClick={() => placeTrade("sell")} disabled={placing || !!activeTrade}
          className="py-5 rounded-2xl bg-gradient-to-b from-rose-400 to-rose-600 text-white font-black hover:from-rose-300 hover:to-rose-500 active:scale-95 transition-all flex flex-col items-center gap-1 shadow-lg shadow-rose-500/25 hover:shadow-rose-500/45 hover:shadow-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
          <TrendingDown className="h-6 w-6" />
          <span className="text-lg leading-none">{placing ? "…" : "SELL"}</span>
          <span className="text-[10px] font-semibold opacity-75">Price Goes Down</span>
        </button>
      </div>
    </div>
  );
}

// ─── PAIR STATS PANEL ─────────────────────────────────────────────────────────
function PairStatsPanel({ symbol, livePrice, pair }) {
  const stats = [
    { label: "Mark Price",    value: formatPrice(livePrice),                                        color: "text-white"       },
    { label: "24h Change",    value: `${(pair.change ?? 0) >= 0 ? "+" : ""}${(pair.change ?? 0).toFixed(2)}%`, color: (pair.change ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400" },
    { label: "24h High",      value: formatPrice(livePrice * 1.018),                                color: "text-emerald-400" },
    { label: "24h Low",       value: formatPrice(livePrice * 0.982),                                color: "text-rose-400"    },
    { label: "24h Volume",    value: pair.volume,                                                   color: "text-slate-300"   },
    { label: "Open Interest", value: `$${(livePrice * 13500 / 1e9).toFixed(2)}B`,                   color: "text-slate-300"   },
    { label: "Funding Rate",  value: "+0.0100%",                                                    color: "text-emerald-400" },
    { label: "Next Funding",  value: "Every 8h",                                                    color: "text-sky-400"   },
  ];
  return (
    <div className="rounded-3xl bg-slate-950 border border-slate-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold flex items-center gap-2">
          <Activity className="h-4 w-4 text-sky-400" />
          {symbol} Statistics
        </h3>
        <span className="text-xs text-slate-500 flex items-center gap-1">
          <CircleDot className="h-2.5 w-2.5 text-emerald-400 animate-pulse" /> Live
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-slate-900/60 border border-slate-800 p-3 hover:border-slate-700 transition-colors">
            <div className="text-[10px] text-slate-500 mb-1.5 uppercase tracking-wide">{s.label}</div>
            <div className={`text-sm font-black tabular-nums ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TECHNICAL ANALYSIS PANEL ────────────────────────────────────────────────
function TechnicalSignalsPanel({ livePrice, pair }) {
  const ch = pair.change ?? 0;
  // Derive simple signals from 24h price direction so they feel live
  const up = ch >= 0;

  const indicators = [
    { name: "RSI (14)",          value: up ? "62.4" : "38.1",   signal: up ? "Neutral" : "Neutral",   band: up ? 62 : 38  },
    { name: "MACD (12,26,9)",    value: up ? "+0.0084" : "-0.0031", signal: up ? "Buy"  : "Sell",     band: null          },
    { name: "Bollinger Bands",   value: up ? "Upper ⅔" : "Lower ⅓", signal: up ? "Buy"  : "Sell",    band: null          },
    { name: "MA 20",             value: up ? "Above" : "Below",  signal: up ? "Buy"     : "Sell",    band: null          },
    { name: "EMA 9",             value: up ? "Above" : "Below",  signal: up ? "Buy"     : "Sell",    band: null          },
    { name: "MA 50",             value: up ? "Above" : "Neutral", signal: up ? "Buy"    : "Neutral", band: null          },
  ];

  const buys    = indicators.filter((i) => i.signal === "Buy").length;
  const sells   = indicators.filter((i) => i.signal === "Sell").length;
  const neutral = indicators.filter((i) => i.signal === "Neutral").length;
  const overall = buys > sells ? "BUY" : sells > buys ? "SELL" : "NEUTRAL";
  const overallColor = overall === "BUY" ? "text-emerald-400" : overall === "SELL" ? "text-rose-400" : "text-sky-400";
  const overallBg    = overall === "BUY" ? "bg-emerald-500/10 border-emerald-500/30" : overall === "SELL" ? "bg-rose-500/10 border-rose-500/30" : "bg-sky-500/10 border-sky-500/30";

  return (
    <div className="rounded-3xl bg-slate-950 border border-slate-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-sky-400" />
          Technical Analysis
        </h3>
        <div className={`px-3 py-1 rounded-xl border text-xs font-black ${overallBg} ${overallColor}`}>
          {overall}
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden flex">
          <div className="h-full bg-emerald-500 rounded-l-full transition-all" style={{ width: `${(buys / indicators.length) * 100}%` }} />
          <div className="h-full bg-sky-400 transition-all" style={{ width: `${(neutral / indicators.length) * 100}%` }} />
          <div className="h-full bg-rose-500 rounded-r-full transition-all" style={{ width: `${(sells / indicators.length) * 100}%` }} />
        </div>
        <div className="flex items-center gap-3 text-[11px] font-bold flex-shrink-0">
          <span className="text-emerald-400">{buys} Buy</span>
          <span className="text-sky-400">{neutral} Neutral</span>
          <span className="text-rose-400">{sells} Sell</span>
        </div>
      </div>

      {/* Indicator rows */}
      <div className="space-y-2">
        {indicators.map((ind) => (
          <div key={ind.name} className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0">
            <span className="text-slate-400 text-xs">{ind.name}</span>
            <div className="flex items-center gap-3">
              <span className="text-slate-300 text-xs tabular-nums">{ind.value}</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${
                ind.signal === "Buy"     ? "bg-emerald-500/15 text-emerald-400" :
                ind.signal === "Sell"    ? "bg-rose-500/15 text-rose-400" :
                "bg-sky-500/15 text-sky-400"
              }`}>{ind.signal.toUpperCase()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* RSI gauge */}
      <div className="mt-4 pt-3 border-t border-slate-800">
        <div className="flex justify-between text-[10px] text-slate-600 mb-1.5">
          <span>0 Oversold</span><span>RSI (14)</span><span>Overbought 100</span>
        </div>
        <div className="relative h-2 rounded-full bg-slate-800">
          <div className="absolute inset-y-0 left-[20%] right-[20%] bg-sky-500/10 rounded-full" />
          <div className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-white bg-slate-900 shadow-lg transition-all"
            style={{ left: `calc(${up ? 62 : 38}% - 8px)` }} />
        </div>
        <div className="flex justify-between text-[10px] mt-1">
          <span className="text-rose-400">30</span>
          <span className="text-sky-400">{up ? "62.4" : "38.1"}</span>
          <span className="text-rose-400">70</span>
        </div>
      </div>
    </div>
  );
}

// ─── PROFIT HISTORY TABLE ──────────────────────────────────────────────────────
function ProfitHistoryTable({ trades }) {
  if (trades.length === 0) {
    return (
      <div className="rounded-3xl bg-slate-950 border border-slate-800 p-10 text-center">
        <div className="text-slate-600 text-sm mb-1">No trades yet</div>
        <div className="text-slate-700 text-xs">Place your first trade using the panel above</div>
      </div>
    );
  }
  const totalPnl  = trades.reduce((s, t) => s + t.pnl, 0);
  const wins      = trades.filter((t) => t.won).length;
  const winRate   = ((wins / trades.length) * 100).toFixed(0);
  return (
    <div className="rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-bold">Profit History</h3>
          <span className="text-xs text-slate-500">{trades.length} trades</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-slate-900 p-3">
            <div className="text-xs text-slate-500">Total P&amp;L</div>
            <div className={`font-black text-lg ${totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{totalPnl >= 0 ? "+" : ""}{formatPrice(totalPnl)}</div>
          </div>
          <div className="rounded-xl bg-slate-900 p-3">
            <div className="text-xs text-slate-500">Win Rate</div>
            <div className={`font-black text-lg ${Number(winRate) >= 50 ? "text-emerald-400" : "text-rose-400"}`}>{winRate}%</div>
          </div>
          <div className="rounded-xl bg-slate-900 p-3">
            <div className="text-xs text-slate-500">Wins / Total</div>
            <div className="font-black text-lg text-white">{wins} / {trades.length}</div>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-slate-500 bg-slate-900/40">
            <tr>{["Time", "Symbol", "Direction", "Duration", "Staked", "Entry", "Exit", "P&L", "Result"].map((h) => (
              <th key={h} className="text-left px-4 py-3 font-semibold whitespace-nowrap">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {trades.map((t) => (
              <motion.tr key={t.id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="border-t border-slate-800/60 hover:bg-slate-900/30 transition">
                <td className="px-4 py-3 text-slate-500 text-xs">{new Date(t.completedAt).toLocaleTimeString()}</td>
                <td className="px-4 py-3 text-white font-semibold">{t.symbol}</td>
                <td className={`px-4 py-3 font-bold text-xs ${t.side === "buy" ? "text-emerald-400" : "text-rose-400"}`}>{t.side === "buy" ? "▲ BUY" : "▼ SELL"}</td>
                <td className="px-4 py-3 text-slate-400">{t.label}</td>
                <td className="px-4 py-3 text-slate-300">{formatPrice(t.amount)}</td>
                <td className="px-4 py-3 text-slate-300">{formatPrice(t.entryPrice)}</td>
                <td className="px-4 py-3 text-slate-300">{formatPrice(t.exitPrice)}</td>
                <td className={`px-4 py-3 font-black ${t.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{t.pnl >= 0 ? "+" : ""}{formatPrice(t.pnl)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-lg text-xs font-black ${t.won ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>{t.won ? "WIN" : "LOSS"}</span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── DEPOSIT / WITHDRAW HISTORY ────────────────────────────────────────────────
function DepositWithdrawHistory({ transactions }) {
  return (
    <div className="rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-white font-bold">Deposit / Withdraw History</h3>
        <span className="text-xs text-slate-500">{transactions.length} records</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-slate-500 bg-slate-900/40">
            <tr>{["Type", "Asset", "Amount", "Status", "Date"].map((h) => (
              <th key={h} className="text-left px-5 py-3 font-semibold">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {transactions.map((tx, i) => (
              <tr key={i} className="border-t border-slate-800/60 hover:bg-slate-900/30 transition">
                <td className={`px-5 py-3 font-bold text-xs ${tx.type === "Deposit" ? "text-emerald-400" : "text-rose-400"}`}>{tx.type}</td>
                <td className="px-5 py-3 text-white font-semibold">{tx.asset}</td>
                <td className={`px-5 py-3 font-semibold ${tx.type === "Deposit" ? "text-emerald-400" : "text-rose-400"}`}>{tx.type === "Deposit" ? "+" : "-"}{tx.amount}</td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-1 rounded-lg text-xs font-bold ${tx.status === "Completed" ? "bg-emerald-500/20 text-emerald-400" : "bg-sky-500/20 text-sky-400"}`}>{tx.status}</span>
                </td>
                <td className="px-5 py-3 text-slate-500 text-xs">{tx.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  BOTTOM WIDGETS (shared)
// ═══════════════════════════════════════════════════════════════════════════════

function GlobalStatsBar() {
  const stats = [
    { label: "Market Cap",   value: "$3.12T",       icon: <Globe className="h-3.5 w-3.5" />,     positive: true  },
    { label: "24h Volume",   value: "$142.8B",       icon: <BarChart3 className="h-3.5 w-3.5" />, positive: true  },
    { label: "BTC Dom.",     value: "54.2%",         icon: <PieChart className="h-3.5 w-3.5" />,  positive: null  },
    { label: "Active Pairs", value: "1,842",         icon: <Layers className="h-3.5 w-3.5" />,   positive: null  },
    { label: "Trending",     value: "BTC · ETH · SOL", icon: <Zap className="h-3.5 w-3.5" />,    positive: null  },
    { label: "API Status",   value: "Operational",   icon: <CircleDot className="h-3.5 w-3.5" />, positive: true  },
  ];
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950 px-3 py-4 sm:px-5">
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 lg:gap-10">
        {stats.map((s) => (
          <div key={s.label} className="flex min-w-[40%] items-center gap-2 sm:min-w-0">
            <span className={s.positive === true ? "text-emerald-400" : s.positive === false ? "text-rose-400" : "text-slate-500"}>{s.icon}</span>
            <div>
              <div className="text-[10px] text-slate-500">{s.label}</div>
              <div className={`text-xs font-bold ${s.positive === true ? "text-emerald-400" : s.positive === false ? "text-rose-400" : "text-slate-300"}`}>{s.value}</div>
            </div>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-1.5 text-[10px] text-slate-600">
          <RefreshCw className="h-3 w-3" /> Updated just now
        </div>
      </div>
    </div>
  );
}

function FearGreedWidget() {
  const score = 68;
  const label = score >= 75 ? "Extreme Greed" : score >= 55 ? "Greed" : score >= 45 ? "Neutral" : score >= 25 ? "Fear" : "Extreme Fear";
  const color = score >= 55 ? "text-emerald-400" : score >= 45 ? "text-sky-400" : "text-rose-400";
  const bar   = score >= 55 ? "bg-emerald-500" : score >= 45 ? "bg-sky-500" : "bg-rose-500";
  const r = 32; const circ = 2 * Math.PI * r;
  return (
    <div className="rounded-3xl bg-slate-950 border border-slate-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold">Fear &amp; Greed Index</h3>
        <span className="text-xs text-slate-500">24h</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative h-20 w-20 flex-shrink-0 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
            <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeWidth="10"
              strokeDasharray={`${circ * score / 100} ${circ * (1 - score / 100)}`}
              className={color} strokeLinecap="round" />
          </svg>
          <span className={`text-xl font-black ${color}`}>{score}</span>
        </div>
        <div className="flex-1">
          <div className={`text-lg font-black ${color}`}>{label}</div>
          <div className="text-xs text-slate-500 mt-1">Crypto market sentiment</div>
          <div className="mt-3 h-2 rounded-full bg-slate-800 overflow-hidden">
            <div className={`h-full rounded-full ${bar}`} style={{ width: `${score}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-slate-600 mt-1">
            <span>Extreme Fear</span><span>Extreme Greed</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function NewsFeed() {
  const news = [
    { tag: "BTC",   title: "Bitcoin breaks $105K resistance amid strong institutional demand",      time: "2m ago",  up: true  },
    { tag: "ETH",   title: "Ethereum L2 volume hits ATH at 48M daily transactions",                time: "14m ago", up: true  },
    { tag: "MACRO", title: "Fed signals rate hold through Q3, risk assets rally",                   time: "32m ago", up: true  },
    { tag: "SOL",   title: "Solana congestion eases after protocol upgrade deployment",             time: "1h ago",  up: false },
    { tag: "RISK",  title: "Exchange warns of elevated volatility ahead of options expiry",         time: "2h ago",  up: null  },
  ];
  return (
    <div className="rounded-3xl bg-slate-950 border border-slate-800 p-5 flex-1">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold flex items-center gap-2"><BookOpen className="h-4 w-4 text-slate-400" /> Market News</h3>
        <span className="text-xs text-slate-500">Live</span>
      </div>
      <div className="space-y-3">
        {news.map((n, i) => (
          <div key={i} className="flex items-start gap-3 pb-3 border-b border-slate-800/60 last:border-0 last:pb-0">
            <span className="mt-0.5">{n.up === true ? <ArrowUpRight className="h-3 w-3 text-emerald-400" /> : n.up === false ? <ArrowDownRight className="h-3 w-3 text-rose-400" /> : <AlertTriangle className="h-3 w-3 text-sky-400" />}</span>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded mr-2">{n.tag}</span>
              <span className="text-xs text-slate-300">{n.title}</span>
            </div>
            <span className="text-[10px] text-slate-600 flex-shrink-0 flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{n.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AllMarketsTable({ livePairs = [] }) {
  const lm = Object.fromEntries(livePairs.map((p) => [p.symbol, p]));
  const BASE = [
    { symbol: "BTCUSDT",  name: "Bitcoin",   mcap: "$2.07T", ratio: 72, vol: "4.82B",  dp: 104832.60, dc:  2.14 },
    { symbol: "ETHUSDT",  name: "Ethereum",  mcap: "$464B",  ratio: 61, vol: "2.19B",  dp:  3864.25,  dc:  1.28 },
    { symbol: "SOLUSDT",  name: "Solana",    mcap: "$83B",   ratio: 44, vol: "829.4M", dp:   176.84,  dc: -0.72 },
    { symbol: "XAUUSDT",  name: "Gold Perp", mcap: "N/A",    ratio: 58, vol: "188.2M", dp:  3368.40,  dc:  0.44 },
    { symbol: "BNBUSDT",  name: "BNB",       mcap: "$101B",  ratio: 68, vol: "642.7M", dp:   702.19,  dc:  3.08 },
    { symbol: "XRPUSDT",  name: "Ripple",    mcap: "$28B",   ratio: 55, vol: "1.24B",  dp:     0.524, dc:  1.89 },
    { symbol: "ADAUSDT",  name: "Cardano",   mcap: "$32B",   ratio: 60, vol: "312.1M", dp:     0.912, dc:  1.54 },
    { symbol: "DOGEUSDT", name: "Dogecoin",  mcap: "$27B",   ratio: 38, vol: "890.4M", dp:     0.184, dc: -1.30 },
    { symbol: "AVAXUSDT", name: "Avalanche", mcap: "$14B",   ratio: 63, vol: "245.8M", dp:    35.24,  dc:  2.67 },
    { symbol: "DOTUSDT",  name: "Polkadot",  mcap: "$10B",   ratio: 48, vol: "118.6M", dp:     7.83,  dc: -0.41 },
    { symbol: "LINKUSDT", name: "Chainlink", mcap: "$8B",    ratio: 57, vol: "204.3M", dp:    14.52,  dc:  3.21 },
    { symbol: "LTCUSDT",  name: "Litecoin",  mcap: "$6B",    ratio: 50, vol: "163.7M", dp:    87.40,  dc: -0.58 },
  ];
  const rows = BASE.map((b) => ({
    ...b,
    price:  lm[b.symbol]?.price  ?? b.dp,
    change: lm[b.symbol]?.change ?? b.dc,
    volume: b.vol,
  }));
  return (
    <div className="rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-white font-bold flex items-center gap-2"><BarChart3 className="h-4 w-4 text-emerald-400" /> All Markets</h3>
        <div className="flex gap-2 text-xs">
          {["All", "DeFi", "Layer-1", "Layer-2"].map((tab, i) => (
            <button key={tab} className={`px-3 py-1 rounded-lg font-semibold ${i === 0 ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"}`}>{tab}</button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-slate-500 bg-slate-900/40">
            <tr>{["#", "Pair", "Price", "24h", "Volume", "Market Cap", "Buy/Sell", "Action"].map((h) => (
              <th key={h} className="text-left px-5 py-3 font-semibold whitespace-nowrap">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.symbol} className="border-t border-slate-800/60 hover:bg-slate-900/30 transition">
                <td className="px-5 py-3 text-slate-600 text-xs">{i + 1}</td>
                <td className="px-5 py-3"><div className="text-white font-bold">{r.symbol}</div><div className="text-xs text-slate-500">{r.name}</div></td>
                <td className="px-5 py-3 text-white font-semibold">{formatPrice(r.price)}</td>
                <td className={`px-5 py-3 font-bold ${r.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  <span className="flex items-center gap-1">{r.change >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{Math.abs(r.change)}%</span>
                </td>
                <td className="px-5 py-3 text-slate-300">{r.volume}</td>
                <td className="px-5 py-3 text-slate-300">{r.mcap}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 rounded-full bg-rose-500/40 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${r.ratio}%` }} />
                    </div>
                    <span className="text-xs text-slate-500">{r.ratio}%</span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <button className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition">Trade</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OpenOrdersPanel({ mode = "spot" }) {
  const spotOrders = [
    { id: "S-0012", pair: "BTCUSDT", side: "buy",  type: "Limit",  price: "103,200.00", amount: "0.010", filled: 0,   time: "09:42:11" },
    { id: "S-0011", pair: "ETHUSDT", side: "sell", type: "Limit",  price: "3,920.00",   amount: "0.500", filled: 40,  time: "09:31:05" },
  ];
  const futOrders = [
    { id: "F-0024", pair: "BTCUSDT", side: "buy",  lev: "10x", type: "Limit",  price: "103,500.00", amount: "0.020", tp: "107,000.00", sl: "101,000.00", time: "09:55:00" },
    { id: "F-0023", pair: "ETHUSDT", side: "sell", lev: "5x",  type: "Stop",   price: "3,950.00",   amount: "1.000", tp: "3,700.00",   sl: "4,100.00",   time: "09:44:22" },
  ];
  const [orders, setOrders] = useState(mode === "spot" ? spotOrders : futOrders);
  const cancel = (id) => setOrders((prev) => prev.filter((o) => o.id !== id));
  return (
    <div className="rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-white font-bold">Open Orders</h3>
        <button
          type="button"
          onClick={() => setOrders([])}
          disabled={orders.length === 0}
          className="cursor-pointer text-xs font-semibold text-rose-400 transition hover:text-rose-300 disabled:cursor-not-allowed disabled:text-slate-600"
        >
          Cancel All
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-slate-500 bg-slate-900/40">
            <tr>
              {(mode === "spot"
                ? ["ID", "Pair", "Side", "Type", "Price", "Amount", "Filled", "Time", ""]
                : ["ID", "Pair", "Side", "Lev", "Type", "Price", "Amt", "TP", "SL", "Time", ""]
              ).map((h) => <th key={h} className="text-left px-4 py-3 font-semibold whitespace-nowrap">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-slate-800/60 hover:bg-slate-900/30 transition">
                <td className="px-4 py-3 text-slate-500 text-xs font-mono">{o.id}</td>
                <td className="px-4 py-3 text-white font-semibold">{o.pair}</td>
                <td className={`px-4 py-3 font-bold text-xs ${o.side === "buy" ? "text-emerald-400" : "text-rose-400"}`}>{o.side === "buy" ? "Buy" : "Sell"}</td>
                {mode === "futures" && <td className="px-4 py-3 text-sky-400 text-xs font-bold">{o.lev}</td>}
                <td className="px-4 py-3 text-slate-300">{o.type}</td>
                <td className="px-4 py-3 text-slate-300">{o.price}</td>
                <td className="px-4 py-3 text-slate-300">{o.amount}</td>
                {mode === "futures" && <td className="px-4 py-3 text-emerald-400 text-xs">{o.tp}</td>}
                {mode === "futures" && <td className="px-4 py-3 text-rose-400 text-xs">{o.sl}</td>}
                {mode === "spot" && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${o.filled}%` }} />
                      </div>
                      <span className="text-xs text-slate-500">{o.filled}%</span>
                    </div>
                  </td>
                )}
                <td className="px-4 py-3 text-slate-600 text-xs">{o.time}</td>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => cancel(o.id)} className="cursor-pointer text-xs font-semibold text-rose-400 transition hover:text-rose-300">Cancel</button>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr className="border-t border-slate-800/60">
                <td colSpan={mode === "spot" ? 9 : 11} className="px-4 py-8 text-center text-xs text-slate-600">No open orders</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FundingRateWidget() {
  const rates = [
    { pair: "BTCUSDT", current: "+0.0100%", next: "02:14:33", avg8h: "+0.0092%", pos: true  },
    { pair: "ETHUSDT", current: "+0.0072%", next: "02:14:33", avg8h: "+0.0068%", pos: true  },
    { pair: "SOLUSDT", current: "-0.0031%", next: "02:14:33", avg8h: "-0.0028%", pos: false },
    { pair: "BNBUSDT", current: "+0.0115%", next: "02:14:33", avg8h: "+0.0101%", pos: true  },
  ];
  return (
    <div className="rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-white font-bold">Funding Rates</h3>
        <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="h-3 w-3" /> Every 8 hours</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-slate-500 bg-slate-900/40">
            <tr>{["Pair", "Current", "Next Funding", "8h Avg"].map((h) => <th key={h} className="text-left px-5 py-3 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rates.map((r) => (
              <tr key={r.pair} className="border-t border-slate-800/60 hover:bg-slate-900/30 transition">
                <td className="px-5 py-3 text-white font-semibold">{r.pair}</td>
                <td className={`px-5 py-3 font-bold ${r.pos ? "text-emerald-400" : "text-rose-400"}`}>{r.current}</td>
                <td className="px-5 py-3 text-sky-400 font-mono text-xs">{r.next}</td>
                <td className={`px-5 py-3 text-xs ${r.pos ? "text-emerald-400/70" : "text-rose-400/70"}`}>{r.avg8h}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LiquidationTracker() {
  const [liq, setLiq] = useState([
    { pair: "BTCUSDT", side: "sell", size: "$248K", price: "103,812.00", time: "09:58:22" },
    { pair: "ETHUSDT", side: "buy",  size: "$94K",  price: "3,851.40",   time: "09:57:10" },
    { pair: "SOLUSDT", side: "sell", size: "$19K",  price: "177.22",     time: "09:55:48" },
    { pair: "BNBUSDT", side: "buy",  size: "$31K",  price: "700.10",     time: "09:54:33" },
  ]);
  useEffect(() => {
    const t = setInterval(() => {
      const p = pairs[Math.floor(Math.random() * pairs.length)];
      setLiq((prev) => [{
        pair: p.symbol,
        side: Math.random() > 0.5 ? "buy" : "sell",
        size: `$${(Math.random() * 300 + 10).toFixed(0)}K`,
        price: formatPrice(p.price + (Math.random() - 0.5) * 500),
        time: new Date().toLocaleTimeString([], { hour12: false }),
      }, ...prev.slice(0, 3)]);
    }, 3500);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-white font-bold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-sky-400" /> Liquidations</h3>
        <span className="text-xs text-emerald-400 flex items-center gap-1"><CircleDot className="h-3 w-3 animate-pulse" /> Live</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-slate-500 bg-slate-900/40">
            <tr>{["Pair", "Side", "Size", "Price", "Time"].map((h) => <th key={h} className="text-left px-5 py-3 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {liq.map((r, i) => (
              <motion.tr key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="border-t border-slate-800/60">
                <td className="px-5 py-2.5 text-white font-semibold text-xs">{r.pair}</td>
                <td className={`px-5 py-2.5 text-xs font-bold ${r.side === "buy" ? "text-rose-400" : "text-emerald-400"}`}>{r.side === "buy" ? "Buy Liq." : "Sell Liq."}</td>
                <td className="px-5 py-2.5 text-sky-400 font-bold text-xs">{r.size}</td>
                <td className="px-5 py-2.5 text-slate-300 text-xs">{r.price}</td>
                <td className="px-5 py-2.5 text-slate-500 text-xs">{r.time}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PortfolioAllocation({ balance = 0 }) {
  const segs = balance > 0
    ? [{ asset: "USDT", pct: 100, color: "bg-teal-500" }]
    : [{ asset: "USDT", pct: 100, color: "bg-slate-700" }];
  return (
    <div className="rounded-3xl bg-slate-950 border border-slate-800 p-5">
      <h3 className="text-white font-bold mb-4 flex items-center gap-2"><PieChart className="h-4 w-4 text-slate-400" /> Portfolio Allocation</h3>
      <div className="flex h-4 rounded-full overflow-hidden gap-0.5 mb-4">
        {segs.map((s) => <div key={s.asset} className={`${s.color} rounded-sm`} style={{ width: `${s.pct}%` }} title={`${s.asset}: ${s.pct}%`} />)}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {segs.map((s) => (
          <div key={s.asset} className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
            <span className="text-slate-400 text-xs">{s.asset}</span>
            <span className="text-white text-xs font-bold ml-auto">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskOverview() {
  return (
    <div className="rounded-3xl bg-slate-950 border border-slate-800 p-5">
      <h3 className="text-white font-bold mb-4 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Risk Overview</h3>
      <div className="space-y-3">
        {[
          { label: "Account Health", value: "Excellent", color: "text-emerald-400", bar: 88 },
          { label: "Margin Ratio",   value: "18.4%",     color: "text-emerald-400", bar: 18 },
          { label: "Unrealised PNL", value: "+$73.65",   color: "text-emerald-400", bar: 60 },
          { label: "Daily Drawdown", value: "-1.2%",     color: "text-rose-400",    bar: 12 },
        ].map((item) => (
          <div key={item.label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">{item.label}</span>
              <span className={`font-bold ${item.color}`}>{item.value}</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div className={`h-full rounded-full ${item.color === "text-emerald-400" ? "bg-emerald-500" : "bg-rose-500"}`} style={{ width: `${item.bar}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ABOUT / MARKETING SECTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function SecurityFeaturesSection() {
  const features = [
    {
      icon: <Layers className="h-8 w-8" />,
      title: "Compliance Matrix",
      desc: [
        "A global digital services financial institution with branch offices in Canada, the EU, and Australia.",
        "Regulated business and services in countries where it operates.",
      ],
    },
    {
      icon: <ShieldCheck className="h-8 w-8" />,
      title: "2FA Authentication",
      desc: [
        "Robust identity verification, compliance and Know Your Customer (KYC) with verified partners.",
        "Auto-detection of cybercrime-related risks with advanced AI technology.",
      ],
    },
    {
      icon: <CheckCircle2 className="h-8 w-8" />,
      title: "Transparency",
      desc: [
        "100% Proof-of-Reserves with top cybersecurity organizations as partners.",
        "Security audit approved by the leading security-focused ranking platform CertiK.",
      ],
    },
  ];
  return (
    <div className="py-16 px-4">
      <h2 className="text-4xl font-black text-white text-center mb-12">
        Secure Your Assets<span className="text-emerald-400">.</span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto">
        {features.map((f, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.12 }}
            className="flex flex-col items-center text-center">
            <div className="h-28 w-28 rounded-full border border-slate-700 bg-slate-900 flex items-center justify-center mb-6 text-emerald-400 shadow-lg shadow-emerald-500/10">
              {f.icon}
            </div>
            <h3 className="text-white font-black text-xl mb-4">{f.title}</h3>
            <div className="space-y-2">
              {f.desc.map((d, di) => <p key={di} className="text-slate-400 text-sm leading-relaxed">{d}</p>)}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ValuesSection() {
  const values = [
    { icon: <Users className="h-6 w-6" />, title: "User-First", desc: "We prioritize our users in everything we do, enabling them to constantly stay ahead and do more with crypto." },
    { icon: <ShieldCheck className="h-6 w-6" />, title: "Reliable", desc: "We are committed to providing a secure platform with 100% user asset protection and 24/7 global support." },
    { icon: <Lightbulb className="h-6 w-6" />, title: "Innovative", desc: "We continually innovate and introduce new features and strategies to elevate users' trading proficiency." },
    { icon: <MessageCircle className="h-6 w-6" />, title: "Diversified", desc: "We provide a comprehensive range of products and services to users of all levels, from beginners to professionals." },
  ];
  return (
    <div className="py-16 px-4 rounded-3xl bg-slate-950 border border-slate-800">
      <h2 className="text-4xl font-black text-white text-center mb-12">
        Bitloom Values<span className="text-emerald-400">.</span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
        {values.map((v, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.1 }}
            className="flex items-start gap-4 p-6 rounded-3xl bg-slate-900 border border-slate-800">
            <div className="h-14 w-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 text-emerald-400">
              {v.icon}
            </div>
            <div>
              <h3 className="text-white font-bold text-lg mb-2">{v.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{v.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function LaurelWreath({ title, year, org }) {
  const leafCount = 8;
  const r = 40;
  const leftLeaves  = Array.from({ length: leafCount }, (_, i) => {
    const a = -Math.PI * 0.85 + (i / leafCount) * Math.PI;
    return { cx: 56 - r * Math.cos(a), cy: 56 + r * Math.sin(a), rot: (a * 180 / Math.PI) - 90 };
  });
  const rightLeaves = Array.from({ length: leafCount }, (_, i) => {
    const a = -Math.PI * 0.85 + (i / leafCount) * Math.PI;
    return { cx: 56 + r * Math.cos(a), cy: 56 + r * Math.sin(a), rot: (a * 180 / Math.PI) + 90 };
  });
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative w-28 h-28">
        <svg width="112" height="112" viewBox="0 0 112 112" fill="none">
          {leftLeaves.map((l, i) => (
            <ellipse key={`l${i}`} cx={l.cx} cy={l.cy} rx="7" ry="3"
              transform={`rotate(${l.rot} ${l.cx} ${l.cy})`}
              stroke="white" strokeWidth="1.4" opacity="0.75" />
          ))}
          {rightLeaves.map((l, i) => (
            <ellipse key={`r${i}`} cx={l.cx} cy={l.cy} rx="7" ry="3"
              transform={`rotate(${l.rot} ${l.cx} ${l.cy})`}
              stroke="white" strokeWidth="1.4" opacity="0.75" />
          ))}
          <path d="M38 98 Q56 103 74 98" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center px-5">
          <p className="text-white text-[8px] font-bold uppercase tracking-wide leading-tight text-center">{title}</p>
        </div>
      </div>
      <div className="text-white font-black text-xl mt-1">{year}</div>
      <div className="text-slate-500 text-xs mt-0.5">{org}</div>
    </div>
  );
}

function AwardsSection() {
  const awards = [
    { title: "Centralized Crypto Exchange of the Year", year: "2024", org: "Blockchain Life" },
    { title: "Top 5 Crypto Derivatives Platform",       year: "2024", org: "In terms of trading volume" },
    { title: "Best Crypto Exchanges",                   year: "2021 – 2023", org: "TradingView" },
    { title: "Fastest Growing Social Trading Platform", year: "2022", org: "Global Brands MAG" },
  ];
  return (
    <div className="py-16 px-4">
      <h2 className="text-4xl font-black text-white text-center mb-12">
        Our Awards<span className="text-emerald-400">.</span>
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
        {awards.map((a, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
            <LaurelWreath {...a} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function EventsSection() {
  const events = [
    { title: "Bitloom CEO Attends Global Blockchain Summit", tag: "Dubai, UAE · Mar 2025" },
    { title: "Bitloom x Chelsea Football Club Partnership", tag: "London, UK · Feb 2025" },
    { title: "Bitloom at TOKEN2049 Singapore", tag: "Singapore · Sep 2025" },
  ];
  const colors = [
    "from-emerald-900/60 to-teal-900/40",
    "from-blue-900/60 to-indigo-900/40",
    "from-purple-900/60 to-pink-900/40",
  ];
  return (
    <div className="py-16 px-4">
      <h2 className="text-4xl font-black text-white mb-3">
        Catch Us at the Biggest Crypto<br />Events Around the World<span className="text-emerald-400">.</span>
      </h2>
      <p className="text-slate-400 text-sm mb-8">Bitloom is present at the world's leading blockchain and crypto conferences.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {events.map((ev, i) => (
          <motion.div key={i} initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }} transition={{ delay: i * 0.1 }}
            className={`rounded-3xl bg-gradient-to-br ${colors[i]} border border-slate-700 h-52 flex flex-col justify-end p-6 relative overflow-hidden`}>
            <div className="absolute top-4 right-4">
              <Globe className="h-16 w-16 text-white opacity-5" />
            </div>
            <span className="text-xs text-emerald-400 font-semibold mb-1">{ev.tag}</span>
            <h3 className="text-white font-bold text-lg leading-snug">{ev.title}</h3>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function CustomerServiceSection() {
  const navigate = useNavigate();
  return (
    <div className="rounded-3xl bg-slate-950 border border-slate-800 p-8 md:p-12">
      <div className="flex flex-col md:flex-row items-center gap-10">
        <div className="flex-1">
          <h2 className="text-4xl font-black text-white mb-4">24/7 Customer Service</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-md">
            Our customer support team is always ready and glad to answer any questions.
            Feel free to contact us via live chat or email for immediate help.
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => navigate("/contact-care")}
              className="px-5 py-2.5 rounded-2xl bg-sky-500 text-black font-bold text-sm hover:bg-sky-400 transition flex items-center gap-2 shadow-md shadow-sky-500/25 hover:shadow-sky-500/40 cursor-pointer">
              <Mail className="h-4 w-4" /> Email Support
            </button>
            <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("bitloom:open-chat"))}
              className="px-5 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 font-semibold text-sm hover:border-slate-700 transition flex items-center gap-2 cursor-pointer">
              <MessageCircle className="h-4 w-4" /> Live Chat
            </button>
          </div>
        </div>
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-8 flex flex-col items-center gap-4 flex-shrink-0">
          <div className="h-20 w-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <HeadphonesIcon className="h-9 w-9 text-emerald-400" />
          </div>
          <div className="text-center">
            <div className="text-4xl font-black text-white">24/7</div>
            <div className="text-slate-500 text-sm mt-1">Always Online</div>
          </div>
          <div className="flex items-center gap-2 text-emerald-400">
            <CircleDot className="h-3 w-3 animate-pulse" />
            <span className="text-xs font-semibold">Support Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskWarning() {
  return (
    <div className="rounded-3xl bg-slate-950 border border-slate-800 p-6">
      <h3 className="text-white font-bold mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-sky-400" /> Risk Warning
      </h3>
      <p className="text-slate-500 text-xs leading-relaxed mb-3">
        Cryptocurrencies and their derivatives are innovative financial products with great volatility and high investment risks.
        Although Bitloom is committed to providing users with easy-to-use trading tools, trading itself is still a highly sophisticated field.
        Trading digital assets and their derivatives are subject to high market risk and price volatility and may result in partial or total
        loss of account funds. You must carefully consider and exercise clear judgment to evaluate your financial situation and the
        aforementioned risks before using Bitloom Services. You shall be responsible for all losses arising therefrom. If necessary,
        please consult relevant professionals before investing. By accessing Bitloom Services, you agree that you have read, understood
        and accepted all of the terms and conditions stipulated in Bitloom Terms of Use as well as our Privacy Policy.
      </p>
      <p className="text-slate-500 text-xs leading-relaxed">
        Past performance of any trading strategy is not a reliable indicator of future performance. Content on Bitloom's trading
        platform is provided for informational purposes only and does not contain advice or recommendations.
      </p>
    </div>
  );
}

// ─── ADMIN LOGIN MODAL ─────────────────────────────────────────────────────────
const ADMIN_TOKEN = "novax-admin-2025";

function ModeCard({ id, label, desc, color, icon, activeMode, onSelect }) {
  return (
    <button onClick={() => onSelect(id)}
      className={`p-4 rounded-2xl border transition-all text-left w-full ${activeMode === id ? color : "bg-slate-900 border-slate-800 hover:border-slate-700"}`}>
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <span className="text-white font-bold text-sm">{label}</span>
        {activeMode === id && (
          <span className="ml-auto text-[10px] bg-black/40 text-white px-2 py-0.5 rounded-full font-bold">ACTIVE</span>
        )}
      </div>
      <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
    </button>
  );
}

function AdminLoginModal({ onSuccess, onClose }) {
  const [username,  setUsername]  = useState("");
  const [password,  setPassword]  = useState("");
  const [showPass,  setShowPass]  = useState(false);
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);

  const attempt = async () => {
    if (!username || !password) { setError("Please enter credentials."); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${API_BASE}/api/admin/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) { onSuccess({ username, password, isMain: !!data.isMain }); }
      else { setError(data.error || "Invalid credentials."); }
    } catch {
      setError("Cannot connect to server — make sure the backend is running.");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-950 border border-slate-800 rounded-3xl p-8 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-sky-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-white font-black">Admin Access</h2>
            <p className="text-slate-500 text-xs">Bitloom Control Panel</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition">
            <X className="h-4 w-4" />
          </button>
        </div>
        {error && <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">{error}</div>}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1.5">Username</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && attempt()}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-white outline-none focus:border-sky-500/50 transition text-sm"
                placeholder="admin1 … admin5" autoFocus autoComplete="off" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && attempt()}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-10 py-3 text-white outline-none focus:border-sky-500/50 transition text-sm"
                placeholder="••••••••" autoComplete="current-password" />
              <button type="button" onClick={() => setShowPass(p => !p)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
        <button onClick={attempt} disabled={loading}
          className="mt-5 w-full py-3 rounded-2xl bg-sky-500 text-black font-black text-sm hover:bg-sky-400 active:scale-95 transition-all shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 cursor-pointer disabled:opacity-60">
          {loading ? "Verifying…" : "Access Panel"}
        </button>
      </motion.div>
    </div>
  );
}

// ─── ADMIN PANEL ───────────────────────────────────────────────────────────────
function AdminPanel({ onLogout, credentials }) {
  const [tab, setTab]               = useState("pnl");
  const [pnlConfig, setPnlConfig]   = useState({ mode: "auto", customWinRate: 50 });
  const [sessions, setSessions]     = useState([]);
  const [activeSession, setActive]  = useState(null);
  const [reply, setReply]           = useState("");
  const [connected, setConnected]     = useState(socket.connected);
  const [stats, setStats]             = useState(null);
  const [customerTyping, setCustomerTyping] = useState(false);
  const [acctEmail, setAcctEmail]   = useState("");
  const [acctAmount, setAcctAmount] = useState("1000");
  const [acctNote, setAcctNote]     = useState("");
  const [acctUser, setAcctUser]     = useState(null);
  const [acctLedger, setAcctLedger] = useState([]);
  const [acctMsg, setAcctMsg]       = useState("");
  const [acctBusy, setAcctBusy]     = useState(false);
  const [oversight, setOversight]   = useState(null);
  const [oversightErr, setOversightErr] = useState("");
  const [openAdmin, setOpenAdmin]   = useState(null);
  const bottomRef              = useRef(null);
  const activeSessionRef       = useRef(null);
  const adminTypingTimeoutRef  = useRef(null);

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const { username, password } = credentials;
    const q = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;

    // Fetch current state from backend
    fetch(`${API_BASE}/api/pnl-mode?${q}`)
      .then(r => r.json()).then(setPnlConfig).catch(() => {});
    fetch(`${API_BASE}/api/admin/chats?${q}`)
      .then(r => r.json()).then(d => Array.isArray(d) && setSessions(d)).catch(() => {});
    fetch(`${API_BASE}/api/admin/stats?${q}`)
      .then(r => r.json()).then(setStats).catch(() => {});

    // Tell backend this socket is an admin (joins all session rooms)
    socket.emit("admin:join", { username, password });

    const onConnect    = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onSessions   = (s)   => setSessions(s);
    const onNew        = (s)   => setSessions(p => [s, ...p]);
    const onUpdated    = ({ sessionId, session }) => {
      setSessions(p => p.map(s => s.id === sessionId ? session : s));
      setActive(p => {
        if (p?.id === sessionId) { activeSessionRef.current = session; return session; }
        return p;
      });
    };
    const onPnl = (cfg) => setPnlConfig(cfg);
    const onTyping = ({ from, isTyping, sessionId: sid }) => {
      if (from === "user" && sid === activeSessionRef.current?.id) {
        setCustomerTyping(isTyping);
      }
    };

    socket.on("connect",                onConnect);
    socket.on("disconnect",             onDisconnect);
    socket.on("admin:sessions",         onSessions);
    socket.on("admin:new-session",      onNew);
    socket.on("admin:session-updated",  onUpdated);
    socket.on("pnl:mode",              onPnl);
    socket.on("chat:typing",           onTyping);

    return () => {
      socket.off("connect",               onConnect);
      socket.off("disconnect",            onDisconnect);
      socket.off("admin:sessions",        onSessions);
      socket.off("admin:new-session",     onNew);
      socket.off("admin:session-updated", onUpdated);
      socket.off("pnl:mode",             onPnl);
      socket.off("chat:typing",          onTyping);
    };
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeSession?.messages?.length]);

  // ── P&L mode helpers ──────────────────────────────────────────────────────
  const setMode = (mode) => {
    const cfg = { mode, customWinRate: pnlConfig.customWinRate };
    socket.emit("admin:set-pnl", { ...cfg, username: credentials.username, password: credentials.password });
    setPnlConfig(cfg);
  };
  const setWinRate = (rate) => {
    const cfg = { mode: "custom", customWinRate: Number(rate) };
    socket.emit("admin:set-pnl", { ...cfg, username: credentials.username, password: credentials.password });
    setPnlConfig(cfg);
  };
  const closeSession = (sessionId) => {
    socket.emit("admin:close-session", { sessionId, username: credentials.username, password: credentials.password });
  };

  // ── Select session (emit read receipt) ───────────────────────────────────
  const selectSession = (s) => {
    setActive(s);
    activeSessionRef.current = s;
    setCustomerTyping(false);
    if (s && s.status !== "closed") {
      socket.emit("admin:read", { sessionId: s.id, username: credentials.username, password: credentials.password });
    }
  };

  // ── Reply ─────────────────────────────────────────────────────────────────
  const sendReply = () => {
    if (!reply.trim() || !activeSession) return;
    clearTimeout(adminTypingTimeoutRef.current);
    socket.emit("admin:typing", { sessionId: activeSession.id, isTyping: false, username: credentials.username, password: credentials.password });
    socket.emit("admin:message", { sessionId: activeSession.id, text: reply.trim(), username: credentials.username, password: credentials.password });
    setReply("");
  };

  const adminBody = (extra = {}) => ({
    username: credentials.username,
    password: credentials.password,
    ...extra,
  });

  const runAcct = async (path, body) => {
    setAcctBusy(true);
    setAcctMsg("");
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adminBody(body)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setAcctUser({
        uid: data.uid,
        email: data.email,
        balance: data.balance,
        frozen: data.frozen,
      });
      setAcctMsg(`OK — ${data.email} balance: ${formatPrice(data.balance)} USDT`);
      await searchAcct(data.email);
    } catch (err) {
      setAcctMsg(err.message);
    } finally {
      setAcctBusy(false);
    }
  };

  const loadOversight = async () => {
    setOversightErr("");
    try {
      const q = `username=${encodeURIComponent(credentials.username)}&password=${encodeURIComponent(credentials.password)}`;
      const res = await fetch(`${API_BASE}/api/admin/oversight?${q}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load oversight");
      setOversight(data);
    } catch (err) {
      setOversightErr(err.message);
    }
  };

  const searchAcct = async (emailOverride) => {
    const email = (emailOverride || acctEmail).trim();
    if (!email) return;
    setAcctBusy(true);
    setAcctMsg("");
    try {
      const q = `username=${encodeURIComponent(credentials.username)}&password=${encodeURIComponent(credentials.password)}&email=${encodeURIComponent(email)}`;
      const [uRes, lRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/users/search?${q}`),
        fetch(`${API_BASE}/api/admin/ledger?${q}`),
      ]);
      const user = await uRes.json();
      const ledger = await lRes.json();
      if (!uRes.ok) throw new Error(user.error || "User not found");
      setAcctUser(user);
      setAcctLedger(Array.isArray(ledger) ? ledger : []);
      setAcctMsg(`Found ${user.email} · ${formatPrice(user.balance)} USDT${user.frozen ? " · FROZEN" : ""}`);
    } catch (err) {
      setAcctUser(null);
      setAcctLedger([]);
      setAcctMsg(err.message);
    } finally {
      setAcctBusy(false);
    }
  };

  const modeStatusColor = {
    auto:   "bg-slate-900 border-slate-700 text-slate-400",
    win:    "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    loss:   "bg-rose-500/10 border-rose-500/30 text-rose-400",
    custom: "bg-sky-500/10 border-sky-500/30 text-sky-400",
  }[pnlConfig.mode];

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="rounded-3xl bg-slate-950 border border-slate-800 px-6 py-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-sky-400" />
          </div>
          <div>
            <h1 className="text-white font-black text-lg">Admin Control Panel</h1>
            <div className="flex items-center gap-1.5 text-xs mt-0.5">
              <CircleDot className={`h-2.5 w-2.5 ${connected ? "text-emerald-400 animate-pulse" : "text-rose-400"}`} />
              <span className={connected ? "text-emerald-400" : "text-rose-400"}>
                {connected ? `${credentials.username} · Backend connected` : "Backend offline — start server on :3001"}
              </span>
            </div>
          </div>
        </div>
        {stats && (
          <div className="flex gap-4 text-xs ml-4">
            {[
              { label: "Sessions",  value: stats.totalSessions   },
              { label: "Pending",   value: stats.pendingSessions  },
              { label: "Clients",   value: stats.connectedClients },
            ].map(s => (
              <div key={s.label} className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-center">
                <div className="text-white font-black text-base">{s.value}</div>
                <div className="text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        )}
        <button onClick={onLogout}
          className="ml-auto px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-sm font-semibold hover:border-slate-700 transition flex items-center gap-2">
          <LogOut className="h-4 w-4" /> Exit Admin
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: "pnl",      label: "P&L Control",  icon: <TrendingUp className="h-4 w-4" /> },
          { id: "accounts", label: "Accounts",     icon: <Wallet className="h-4 w-4" /> },
          { id: "chats", label: `Live Chats${sessions.filter(s => s.status === "pending").length ? ` (${sessions.filter(s => s.status === "pending").length})` : ""}`, icon: <MessageCircle className="h-4 w-4" /> },
          // Owner-only view of what the other admins have been doing.
          ...(credentials.isMain ? [{ id: "oversight", label: "Oversight", icon: <ShieldCheck className="h-4 w-4" /> }] : []),
        ].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); if (t.id === "oversight") loadOversight(); }}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition border ${
              tab === t.id ? "bg-slate-800 text-white border-slate-700" : "text-slate-400 bg-slate-900 border-slate-800 hover:border-slate-700"
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Accounts Tab ─────────────────────────────────────────────────────── */}
      {tab === "oversight" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-white">Admin Oversight</h3>
              <p className="text-xs text-slate-500">
                Every balance change made by each admin{oversight ? ` · last ${oversight.scanned} ledger entries` : ""}
              </p>
            </div>
            <button type="button" onClick={loadOversight}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-600">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>

          {oversightErr && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-400">{oversightErr}</div>
          )}
          {!oversight && !oversightErr && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center text-sm text-slate-500">Loading…</div>
          )}

          {oversight?.admins.map((a) => (
            <div key={a.username} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
              <button type="button" onClick={() => setOpenAdmin(openAdmin === a.username ? null : a.username)}
                className="flex w-full cursor-pointer flex-wrap items-center gap-3 px-5 py-4 text-left hover:bg-slate-900/40">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{a.username}</span>
                    {a.isYou && <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-400">YOU</span>}
                    {a.isMain && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">MAIN</span>}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    P&amp;L mode {a.pnlMode}
                    {a.lastActionAt ? ` · last action ${new Date(a.lastActionAt).toLocaleString()}` : " · no activity yet"}
                  </div>
                </div>
                <div className="ml-auto grid grid-cols-2 gap-x-5 gap-y-1 text-right text-xs sm:grid-cols-4">
                  <div>
                    <div className="text-slate-500">Credited</div>
                    <div className="font-bold tabular-nums text-emerald-400">+{formatPrice(a.credited)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Debited</div>
                    <div className="font-bold tabular-nums text-rose-400">-{formatPrice(a.debited)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Actions</div>
                    <div className="font-bold tabular-nums text-white">{a.actions}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Customers</div>
                    <div className="font-bold tabular-nums text-white">{a.customers.length}</div>
                  </div>
                </div>
              </button>

              {openAdmin === a.username && (
                <div className="border-t border-slate-800 px-5 py-4">
                  <div className="mb-3">
                    <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Deposit emails touched</div>
                    {a.customers.length === 0 ? (
                      <div className="text-xs text-slate-600">None yet</div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {a.customers.map((email) => (
                          <button key={email} type="button"
                            onClick={() => { setTab("accounts"); setAcctEmail(email); searchAcct(email); }}
                            className="cursor-pointer rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-sky-300 hover:border-sky-500/40">
                            {email}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Recent balance changes</div>
                  {a.recent.length === 0 ? (
                    <div className="text-xs text-slate-600">No balance changes recorded</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="text-slate-500">
                          <tr>{["When", "Customer", "Type", "Amount", "Balance after", "Note"].map((h) => (
                            <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-semibold">{h}</th>
                          ))}</tr>
                        </thead>
                        <tbody>
                          {a.recent.map((r, i) => (
                            <tr key={i} className="border-t border-slate-800/60">
                              <td className="whitespace-nowrap px-3 py-2 text-slate-500">{new Date(r.createdAt).toLocaleString()}</td>
                              <td className="px-3 py-2 text-slate-300">{r.email || "—"}</td>
                              <td className={`px-3 py-2 font-bold ${r.type === "credit" ? "text-emerald-400" : r.type === "debit" ? "text-rose-400" : "text-sky-400"}`}>{r.type}</td>
                              <td className="px-3 py-2 tabular-nums text-white">{formatPrice(r.amount)}</td>
                              <td className="px-3 py-2 tabular-nums text-slate-300">{formatPrice(r.balanceAfter)}</td>
                              <td className="px-3 py-2 text-slate-500">{r.note}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "accounts" && (
        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-white">Customer Accounts</h2>
            <p className="mt-1 text-xs text-slate-500">
              Credit deposits after support confirms payment. User must sign up / log in once first.
              {stats?.moneyStore ? ` · Store: ${stats.moneyStore}` : ""}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs text-slate-500">Customer email</label>
              <input value={acctEmail} onChange={(e) => setAcctEmail(e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-500/50"
                placeholder="customer@email.com" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-slate-500">Amount (USDT)</label>
              <input value={acctAmount} onChange={(e) => setAcctAmount(e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-500/50"
                placeholder="1000" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-slate-500">Note (optional)</label>
            <input value={acctNote} onChange={(e) => setAcctNote(e.target.value)}
              className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-500/50"
              placeholder="Deposit confirmed via chat" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={acctBusy} onClick={() => searchAcct()}
              className="cursor-pointer rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:border-slate-600 disabled:opacity-50">
              Search
            </button>
            <button type="button" disabled={acctBusy} onClick={() => runAcct("/api/admin/users/credit", { email: acctEmail, amount: acctAmount, note: acctNote })}
              className="cursor-pointer rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-black hover:bg-emerald-400 disabled:opacity-50">
              Credit +
            </button>
            <button type="button" disabled={acctBusy} onClick={() => runAcct("/api/admin/users/debit", { email: acctEmail, amount: acctAmount, note: acctNote })}
              className="cursor-pointer rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-400 disabled:opacity-50">
              Debit −
            </button>
            <button type="button" disabled={acctBusy} onClick={() => runAcct("/api/admin/users/set-balance", { email: acctEmail, amount: acctAmount, note: acctNote })}
              className="cursor-pointer rounded-xl border border-sky-500/40 bg-sky-500/15 px-4 py-2.5 text-sm font-semibold text-sky-300 hover:bg-sky-500/25 disabled:opacity-50">
              Set balance
            </button>
            <button type="button" disabled={acctBusy} onClick={() => runAcct("/api/admin/users/freeze", { email: acctEmail, frozen: true })}
              className="cursor-pointer rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300 disabled:opacity-50">
              Freeze
            </button>
            <button type="button" disabled={acctBusy} onClick={() => runAcct("/api/admin/users/freeze", { email: acctEmail, frozen: false })}
              className="cursor-pointer rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300 disabled:opacity-50">
              Unfreeze
            </button>
          </div>
          {acctMsg && (
            <div className={`rounded-xl border px-4 py-3 text-sm ${acctMsg.startsWith("OK") || acctMsg.startsWith("Found") ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-rose-500/30 bg-rose-500/10 text-rose-300"}`}>
              {acctMsg}
            </div>
          )}
          {acctUser && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-sm">
              <div className="font-bold text-white">{acctUser.email}</div>
              <div className="mt-1 text-slate-400">UID: <span className="font-mono text-xs text-slate-300">{acctUser.uid}</span></div>
              <div className="mt-2 text-2xl font-black text-sky-400">{formatPrice(acctUser.balance)} <span className="text-sm text-slate-500">USDT</span></div>
              {acctUser.frozen && <div className="mt-2 text-xs font-bold text-rose-400">FROZEN</div>}
            </div>
          )}
          {acctLedger.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">After</th>
                    <th className="px-3 py-2">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {acctLedger.map((row) => (
                    <tr key={row.id} className="border-t border-slate-800/80 text-slate-300">
                      <td className="px-3 py-2 whitespace-nowrap">{row.createdAt?.slice(0, 19)?.replace("T", " ")}</td>
                      <td className="px-3 py-2">{row.type}</td>
                      <td className="px-3 py-2 tabular-nums">{row.amount}</td>
                      <td className="px-3 py-2 tabular-nums">{row.balanceAfter}</td>
                      <td className="px-3 py-2 text-slate-500">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── P&L Tab ──────────────────────────────────────────────────────────── */}
      {tab === "pnl" && (
        <div className="rounded-3xl bg-slate-950 border border-slate-800 p-6 space-y-5">
          <div>
            <h2 className="text-white font-bold text-lg">Trade Outcome Mode</h2>
            <p className="text-slate-500 text-xs mt-1">Override how every trade resolves for all users. Changes take effect on the next trade immediately.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <ModeCard id="auto" label="Auto Market" activeMode={pnlConfig.mode} onSelect={setMode}
              icon={<Activity className="h-4 w-4 text-slate-400" />}
              color="bg-slate-800 border-slate-600"
              desc="Outcome follows real price movement. No override." />
            <ModeCard id="win" label="Force Win" activeMode={pnlConfig.mode} onSelect={setMode}
              icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
              color="bg-emerald-500/20 border-emerald-500/50"
              desc="Every trade wins regardless of price direction." />
            <ModeCard id="loss" label="Force Loss" activeMode={pnlConfig.mode} onSelect={setMode}
              icon={<TrendingDown className="h-4 w-4 text-rose-400" />}
              color="bg-rose-500/20 border-rose-500/50"
              desc="Every trade loses regardless of price direction." />
            <ModeCard id="custom" label="Custom Rate" activeMode={pnlConfig.mode} onSelect={setMode}
              icon={<BarChart3 className="h-4 w-4 text-sky-400" />}
              color="bg-sky-500/20 border-sky-500/50"
              desc="Randomly win at a specific percentage you set." />
          </div>

          {/* Custom win-rate slider */}
          {pnlConfig.mode === "custom" && (
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
              <div className="flex justify-between text-sm mb-3">
                <span className="text-slate-400 font-semibold">Win Rate</span>
                <span className="text-sky-400 font-black text-xl">{pnlConfig.customWinRate}%</span>
              </div>
              <input type="range" min="0" max="100" value={pnlConfig.customWinRate}
                onChange={(e) => setWinRate(e.target.value)}
                className="w-full accent-sky-400" />
              <div className="flex justify-between text-[10px] text-slate-600 mt-1.5">
                <span>0% — always lose</span>
                <span>50% — fair</span>
                <span>100% — always win</span>
              </div>
            </div>
          )}

          {/* Active mode banner */}
          <div className={`p-4 rounded-2xl border flex items-center gap-2.5 font-semibold text-sm ${modeStatusColor}`}>
            <CircleDot className="h-4 w-4 animate-pulse flex-shrink-0" />
            <span>
              {pnlConfig.mode === "auto"   && "Auto mode — trades resolve by real market price movement."}
              {pnlConfig.mode === "win"    && "WIN mode ACTIVE — every trade placed by any user will WIN."}
              {pnlConfig.mode === "loss"   && "LOSS mode ACTIVE — every trade placed by any user will LOSE."}
              {pnlConfig.mode === "custom" && `Custom mode — ~${pnlConfig.customWinRate}% of trades will WIN randomly.`}
            </span>
          </div>
        </div>
      )}

      {/* ── Chats Tab ─────────────────────────────────────────────────────────── */}
      {tab === "chats" && (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 min-h-[540px]">
          {/* Session list */}
          <div className="rounded-3xl bg-slate-950 border border-slate-800 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
              <h3 className="text-white font-bold text-sm">Sessions</h3>
              <span className="text-xs text-slate-500">{sessions.length} total</span>
            </div>
            <div className="overflow-y-auto flex-1">
              {sessions.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle className="h-8 w-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-slate-600 text-sm">No chat sessions yet</p>
                </div>
              ) : sessions.map(s => (
                <button key={s.id} onClick={() => selectSession(s)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-800/50 hover:bg-slate-900/60 transition ${activeSession?.id === s.id ? "bg-slate-900 border-l-2 border-l-emerald-500" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-white text-sm font-semibold truncate">{s.name}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {s.assignedAdmin && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                          s.assignedAdmin === credentials.username
                            ? "bg-sky-500/20 text-sky-400"
                            : "bg-slate-700/60 text-slate-500"
                        }`}>
                          {s.assignedAdmin === credentials.username ? "MINE" : s.assignedAdmin}
                        </span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        s.status === "pending" ? "bg-sky-500/20 text-sky-400" :
                        s.status === "closed"  ? "bg-slate-700 text-slate-400" :
                        "bg-emerald-500/20 text-emerald-400"
                      }`}>
                        {s.status?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate">
                    {s.messages?.[s.messages.length - 1]?.text || "—"}
                  </div>
                  <div className="text-[10px] text-slate-600 mt-0.5">{s.messages?.length || 0} messages</div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat area */}
          <div className="rounded-3xl bg-slate-950 border border-slate-800 flex flex-col overflow-hidden">
            {!activeSession ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-600 p-8">
                <MessageCircle className="h-12 w-12" />
                <p className="text-sm">Select a session from the list to view the conversation</p>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
                  <div>
                    <div className="text-white font-bold">{activeSession.name}</div>
                    <div className="text-[10px] text-slate-600 font-mono">{activeSession.id}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeSession.status !== "closed" && (
                      <button onClick={() => closeSession(activeSession.id)}
                        className="text-xs text-rose-400 hover:text-rose-300 border border-rose-500/30 bg-rose-500/10 px-3 py-1 rounded-lg transition">
                        Close Session
                      </button>
                    )}
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                      activeSession.status === "pending" ? "bg-sky-500/20 text-sky-400" :
                      activeSession.status === "closed"  ? "bg-slate-700 text-slate-400" :
                      "bg-emerald-500/20 text-emerald-400"
                    }`}>
                      {activeSession.status?.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: 420 }}>
                  {activeSession.messages?.map(msg => (
                    <div key={msg.id} className={`flex ${msg.from === "agent" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[72%] px-4 py-2.5 rounded-2xl text-sm ${
                        msg.from === "agent"  ? "bg-sky-500 text-black font-medium" :
                        msg.from === "system" ? "bg-slate-900 text-slate-500 italic text-xs text-center w-full max-w-full" :
                        "bg-slate-800 text-slate-200"
                      }`}>
                        {msg.from === "agent" && <div className="text-[10px] font-bold opacity-70 mb-0.5">Support Agent</div>}
                        {msg.text}
                        <div className={`text-[9px] mt-1 opacity-50 ${msg.from === "agent" ? "text-right" : ""}`}>
                          {new Date(msg.time).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  {customerTyping && (
                    <div className="flex justify-start">
                      <div className="bg-slate-800 px-4 py-2.5 rounded-2xl text-xs text-slate-400 italic flex items-center gap-1.5">
                        Customer is typing <TypingDots />
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Reply input */}
                {activeSession.status !== "closed" ? (
                  <div className="p-3 border-t border-slate-800 flex gap-2 flex-shrink-0">
                    <input value={reply}
                      onChange={(e) => {
                        setReply(e.target.value);
                        socket.emit("admin:typing", { sessionId: activeSession.id, isTyping: true, username: credentials.username, password: credentials.password });
                        clearTimeout(adminTypingTimeoutRef.current);
                        adminTypingTimeoutRef.current = setTimeout(() => {
                          socket.emit("admin:typing", { sessionId: activeSession.id, isTyping: false, username: credentials.username, password: credentials.password });
                        }, 2500);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && sendReply()}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-sky-500/50 transition"
                      placeholder="Type reply as support agent…" />
                    <button onClick={sendReply}
                      className="px-4 py-2.5 rounded-xl bg-sky-500 text-black font-bold text-sm hover:bg-sky-400 transition flex items-center gap-2">
                      <Send className="h-4 w-4" /> Send
                    </button>
                  </div>
                ) : (
                  <div className="p-3 border-t border-slate-800 text-center text-slate-600 text-xs">Session closed</div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── LIVE CHAT WIDGET (customer-facing) ────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-0.5 px-1">
      {[0, 150, 300].map((delay) => (
        <span key={delay} className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce"
          style={{ animationDelay: `${delay}ms`, animationDuration: "0.9s" }} />
      ))}
    </div>
  );
}

const CHAT_STORAGE_KEY = "novax_chat_session";

function ChatWidget() {
  const [open, setOpen]               = useState(false);
  const [prevOpen, setPrevOpen]       = useState(false);
  const [sessionId, setSessionId]     = useState(null);
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState("");
  const [name, setName]               = useState("");
  const [started, setStarted]         = useState(false);
  const [closed, setClosed]           = useState(false);
  const [agentOnline, setAgentOnline] = useState(false);
  const [agentTyping, setAgentTyping] = useState(false);
  const [msgRead, setMsgRead]         = useState(false);
  const [unread, setUnread]           = useState(0);
  const [sockConnected, setSockConnected] = useState(socket.connected);
  const bottomRef        = useRef(null);
  const typingTimeoutRef = useRef(null);
  const sessionIdRef     = useRef(null);

  // Let "Live Chat" buttons elsewhere in the app open this panel. The flag covers
  // the case where the button lives on another route (Contact Care) and had to
  // navigate here first, so the event would fire before this widget mounted.
  useEffect(() => {
    const openChat = () => setOpen(true);
    window.addEventListener("bitloom:open-chat", openChat);
    try {
      if (sessionStorage.getItem("bitloom_open_chat")) {
        sessionStorage.removeItem("bitloom_open_chat");
        setOpen(true);
      }
    } catch { /* storage blocked */ }
    return () => window.removeEventListener("bitloom:open-chat", openChat);
  }, []);

  // Render-time: clear unread when panel opens
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setUnread(0);
  }

  useEffect(() => {
    const onConnect = () => {
      setSockConnected(true);
      // Auto-rejoin previous session after socket reconnects
      const saved = sessionIdRef.current || localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) socket.emit("chat:rejoin", { sessionId: saved });
    };
    const onDisconnect = () => setSockConnected(false);

    const onSession = ({ sessionId: sid, messages: msgs }) => {
      setSessionId(sid);
      sessionIdRef.current = sid;
      localStorage.setItem(CHAT_STORAGE_KEY, sid);
      setMessages(msgs);
      setStarted(true);
      setClosed(false);
    };
    const onExpired = () => {
      // Server no longer has this session (restarted); clear saved id
      localStorage.removeItem(CHAT_STORAGE_KEY);
      sessionIdRef.current = null;
      setStarted(false);
      setMessages([]);
      setSessionId(null);
    };
    const onMsg = ({ sessionId: _sid, ...msg }) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      if (msg.from !== "user") setUnread((u) => u + 1);
      if (msg.from === "agent") setMsgRead(false);
    };
    const onTyping  = ({ from, isTyping }) => { if (from === "agent") setAgentTyping(isTyping); };
    const onRead    = () => setMsgRead(true);
    const onClosed  = () => { setClosed(true); setAgentTyping(false); localStorage.removeItem(CHAT_STORAGE_KEY); };
    const onAgent   = ({ online }) => setAgentOnline(online);

    // On first mount, try to rejoin a saved session
    const savedId = localStorage.getItem(CHAT_STORAGE_KEY);
    if (savedId && socket.connected) {
      sessionIdRef.current = savedId;
      socket.emit("chat:rejoin", { sessionId: savedId });
    }

    socket.on("connect",           onConnect);
    socket.on("disconnect",        onDisconnect);
    socket.on("chat:session",      onSession);
    socket.on("chat:session-expired", onExpired);
    socket.on("chat:message",      onMsg);
    socket.on("chat:typing",       onTyping);
    socket.on("chat:read",         onRead);
    socket.on("chat:closed",       onClosed);
    socket.on("agent:status",      onAgent);

    return () => {
      socket.off("connect",           onConnect);
      socket.off("disconnect",        onDisconnect);
      socket.off("chat:session",      onSession);
      socket.off("chat:session-expired", onExpired);
      socket.off("chat:message",      onMsg);
      socket.off("chat:typing",       onTyping);
      socket.off("chat:read",         onRead);
      socket.off("chat:closed",       onClosed);
      socket.off("agent:status",      onAgent);
    };
  }, []);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [open, messages.length, agentTyping]);

  const startChat = () => {
    if (!sockConnected) return;
    socket.emit("chat:start", { name: name.trim() || "Anonymous" });
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    const sid = sessionIdRef.current;
    if (!sid) return;
    socket.emit("chat:typing", { sessionId: sid, isTyping: e.target.value.length > 0 });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("chat:typing", { sessionId: sid, isTyping: false });
    }, 2500);
  };

  const sendMsg = () => {
    const sid = sessionIdRef.current;
    if (!input.trim() || !sid || closed || !sockConnected) return;
    clearTimeout(typingTimeoutRef.current);
    socket.emit("chat:typing", { sessionId: sid, isTyping: false });
    socket.emit("chat:message", { sessionId: sid, text: input.trim() });
    setInput("");
    setMsgRead(false);
  };

  const fmt = (iso) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-3 z-50 flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-3 sm:right-6 lg:bottom-6">
      {open && (
        <motion.div initial={{ opacity: 0, y: 20, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="flex h-[min(70vh,520px)] w-[calc(100vw-1.5rem)] max-w-[340px] flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/50">

          {/* ── Header ────────────────────────────────────────────────────── */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-sky-500 to-cyan-600 flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
                <HeadphonesIcon className="h-5 w-5 text-white" />
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-emerald-600 ${agentOnline ? "bg-emerald-300" : "bg-slate-400"}`} />
            </div>
            <div className="flex-1">
              <div className="text-white font-bold text-sm leading-none">Bitloom Desk</div>
              <div className="text-white/70 text-[10px] mt-0.5 flex items-center gap-1">
                {!sockConnected ? (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
                    <span className="text-sky-300">Connecting…</span>
                  </>
                ) : (
                  <>
                    <span className={`h-1.5 w-1.5 rounded-full ${agentOnline ? "bg-emerald-300 animate-pulse" : "bg-slate-400"}`} />
                    {started
                      ? (closed ? "Session closed" : agentOnline ? "Agent online" : "Agent offline")
                      : (agentOnline ? "We're online — reply in minutes" : "Leave a message")}
                  </>
                )}
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white transition p-1">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ── Body ──────────────────────────────────────────────────────── */}
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {!started ? (
              <div className="flex flex-col items-center justify-center h-44 gap-4 px-3 text-center">
                <div className="h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <MessageCircle className="h-7 w-7 text-emerald-400" />
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  {agentOnline ? "An agent is online and ready to help you." : "Send us a message and we'll reply as soon as we're back."}
                </p>
                <input value={name} onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && startChat()}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-sky-500/50 transition text-center"
                  placeholder="Your name (optional)" />
                <button onClick={startChat} disabled={!sockConnected}
                  className="w-full py-2.5 rounded-xl bg-sky-500 text-black font-bold text-xs hover:bg-sky-400 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {sockConnected ? "Start Conversation" : "Connecting to server…"}
                </button>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.from === "user" ? "items-end" : "items-start"}`}>
                    {msg.from === "system" ? (
                      <div className="text-[10px] text-slate-600 italic text-center w-full py-1">{msg.text}</div>
                    ) : (
                      <>
                        {msg.from === "agent" && (
                          <div className="text-[9px] text-slate-500 mb-0.5 ml-1 font-semibold">Support Agent</div>
                        )}
                        <div className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                          msg.from === "user"
                            ? "bg-sky-500 text-black font-medium rounded-br-sm"
                            : "bg-slate-800 text-slate-200 rounded-bl-sm"
                        }`}>
                          {msg.text}
                        </div>
                        <div className="text-[9px] text-slate-600 mt-0.5 mx-1">{fmt(msg.time)}</div>
                      </>
                    )}
                  </div>
                ))}

                {/* Typing indicator */}
                {agentTyping && (
                  <div className="flex items-start gap-2">
                    <div className="bg-slate-800 rounded-2xl rounded-bl-sm px-3 py-2 flex items-center gap-1">
                      <span className="text-[10px] text-slate-500 italic">Agent is typing</span>
                      <TypingDots />
                    </div>
                  </div>
                )}

                {/* Read receipt for last user message */}
                {msgRead && !closed && (
                  <div className="text-right text-[9px] text-emerald-400 pr-1">✓✓ Read by agent</div>
                )}

                {closed && (
                  <div className="text-center text-slate-600 text-[10px] italic border-t border-slate-800/50 pt-2 mt-1">
                    Session closed
                  </div>
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* ── Input ─────────────────────────────────────────────────────── */}
          {started && !closed && (
            <div className="p-2.5 border-t border-slate-800 flex gap-2">
              <input value={input} onChange={handleInputChange}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMsg()}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-sky-500/50 transition"
                placeholder="Type a message…" />
              <button onClick={sendMsg} disabled={!input.trim()}
                className="p-2 rounded-xl bg-sky-500 text-black hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed transition flex-shrink-0">
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* ── FAB toggle ──────────────────────────────────────────────────────── */}
      <button onClick={() => setOpen((o) => !o)}
        className={`relative h-[52px] w-[52px] rounded-full shadow-xl flex items-center justify-center transition-all ${
          open ? "bg-slate-800 border border-slate-700 text-slate-300" : "bg-sky-500 text-black hover:bg-sky-400 shadow-sky-500/30"
        }`}>
        <motion.div key={open ? "x" : "chat"} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.15 }}>
          {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        </motion.div>
        {!open && unread > 0 && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-lg">
            {unread > 9 ? "9+" : unread}
          </motion.span>
        )}
      </button>
    </div>
  );
}

// ─── PROFILE PAGE ─────────────────────────────────────────────────────────────
function ProfilePage({ currentUser, balance, tradeHistory, onLogout, setActivePage }) {
  const navigate = useNavigate();
  const [refCopied, setRefCopied] = useState(false);
  const wins    = tradeHistory.filter((t) => t.won).length;
  const losses  = tradeHistory.filter((t) => !t.won).length;
  const totalPnl = +tradeHistory.reduce((s, t) => s + t.pnl, 0).toFixed(2);
  const winRate  = tradeHistory.length ? Math.round((wins / tradeHistory.length) * 100) : 0;

  const initial = currentUser?.displayName?.[0]?.toUpperCase()
    || currentUser?.email?.[0]?.toUpperCase()
    || "?";

  return (
    <div className="max-w-2xl mx-auto space-y-4 py-6">
      {/* Avatar + name card */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-slate-800 bg-slate-950 p-5 flex flex-col sm:flex-row items-center gap-6 sm:p-8">
        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-xl shadow-sky-500/20">
          <span className="text-black font-black text-3xl">{initial}</span>
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-white font-black text-2xl">{currentUser?.displayName || "Bitloom User"}</h1>
          <p className="text-slate-400 text-sm mt-1">{currentUser?.email}</p>
          <div className="flex items-center justify-center sm:justify-start gap-2 mt-3">
            <span className="px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold">Verified client</span>
            <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-xs">Verified</span>
          </div>
        </div>
        <button onClick={onLogout}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-sm font-semibold hover:border-slate-700 hover:text-slate-300 transition">
          <LogOut className="h-4 w-4" /> Log Out
        </button>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Balance",    value: `$${formatPrice(balance)}`, color: "text-white" },
          { label: "Total P&L",  value: `${totalPnl >= 0 ? "+" : ""}$${formatPrice(totalPnl)}`, color: totalPnl >= 0 ? "text-emerald-400" : "text-rose-400" },
          { label: "Trades",     value: tradeHistory.length, color: "text-white" },
          { label: "Win Rate",   value: `${winRate}%`, color: "text-emerald-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-slate-950 border border-slate-800 p-4 text-center">
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-slate-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Trade breakdown */}
      <div className="rounded-3xl bg-slate-950 border border-slate-800 p-6 space-y-4">
        <h2 className="text-white font-bold flex items-center gap-2"><BarChart3 className="h-4 w-4 text-slate-400" /> Trading Summary</h2>
        <div className="space-y-3">
          {[
            { label: "Wins",    value: wins,   color: "bg-emerald-500", pct: tradeHistory.length ? (wins / tradeHistory.length) * 100 : 0 },
            { label: "Losses",  value: losses, color: "bg-rose-500",    pct: tradeHistory.length ? (losses / tradeHistory.length) * 100 : 0 },
          ].map((r) => (
            <div key={r.label}>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-400">{r.label}</span>
                <span className="text-white font-bold">{r.value}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className={`h-full rounded-full ${r.color} transition-all`} style={{ width: `${r.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
        {tradeHistory.length === 0 && (
          <p className="text-slate-600 text-sm text-center py-4">No trades yet — go to Futures to start trading.</p>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Futures",  page: "futures",  icon: <BarChart3 className="h-5 w-5" />,   color: "text-sky-400 hover:border-sky-500/40" },
          { label: "Assets",   page: "assets",   icon: <Wallet className="h-5 w-5" />,      color: "text-blue-400 hover:border-blue-500/40"  },
          { label: "Markets",  page: "markets",  icon: <Activity className="h-5 w-5" />,    color: "text-emerald-400 hover:border-emerald-500/40" },
          { label: "Deposit",  page: "deposit",  icon: <ArrowUpRight className="h-5 w-5" />, color: "text-slate-400 hover:border-slate-600" },
        ].map((l) => (
          <button key={l.page}
            onClick={() => l.page === "deposit" ? navigate("/deposit") : setActivePage(l.page)}
            className={`rounded-2xl bg-slate-950 border border-slate-800 p-4 flex flex-col items-center gap-2 hover:bg-slate-900/50 transition ${l.color} cursor-pointer`}>
            {l.icon}
            <span className="text-xs font-semibold">{l.label}</span>
          </button>
        ))}
      </div>

      {/* Security Checklist */}
      <div className="rounded-3xl bg-slate-950 border border-slate-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Lock className="h-4 w-4 text-sky-400" /> Security Score
          </h3>
          <div className="flex items-center gap-2">
            <div className="text-sky-400 font-black text-lg">40<span className="text-slate-600 text-sm">/100</span></div>
          </div>
        </div>
        <div className="h-2 rounded-full bg-slate-800 overflow-hidden mb-4">
          <div className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full" style={{ width: "40%" }} />
        </div>
        <div className="space-y-2.5">
          {[
            { label: "Email Verified",       done: true  },
            { label: "2FA Enabled",          done: false },
            { label: "Anti-phishing Code",   done: false },
            { label: "Withdrawal Address",   done: true  },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2.5">
                <div className={`h-4 w-4 rounded-full flex items-center justify-center ${item.done ? "bg-emerald-500" : "bg-slate-800 border border-slate-700"}`}>
                  {item.done && <div className="h-1.5 w-1.5 rounded-full bg-black" />}
                </div>
                <span className={item.done ? "text-slate-300" : "text-slate-500"}>{item.label}</span>
              </div>
              <span className={`text-xs font-semibold ${item.done ? "text-emerald-400" : "text-slate-600"}`}>
                {item.done ? "Done" : "Set up →"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Referral Card */}
      <div className="rounded-3xl border border-sky-500/20 bg-gradient-to-r from-sky-500/10 via-cyan-500/8 to-sky-500/10 p-4 sm:p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
          <div className="min-w-0 w-full">
            <h3 className="text-lg font-black text-white">Refer & Earn</h3>
            <p className="mt-1 max-w-xs text-sm text-slate-400">Earn up to <span className="font-bold text-sky-400">40% lifetime commission</span> on every friend you refer to Bitloom.</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-xs font-bold tracking-wider text-sky-400 sm:text-sm">
                {REFERRAL_CODE}
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(REFERRAL_CODE);
                  setRefCopied(true);
                  setTimeout(() => setRefCopied(false), 1600);
                }}
                className="cursor-pointer rounded-xl border border-sky-500/30 bg-sky-500/10 p-2 text-sky-400 transition hover:bg-sky-500/20"
                aria-label="Copy referral code"
              >
                {refCopied ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-3xl font-black text-sky-400">$0</div>
            <div className="text-slate-600 text-xs">Earned so far</div>
            <div className="text-slate-500 text-xs mt-1">0 referrals</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Footer({ onNavigate }) {
  const navigate = useNavigate();
  // Page ids go through the in-app switcher; "/paths" are real routes.
  const cols = [
    {
      title: "Platform",
      links: [
        { label: "Trade Desk",   to: "futures"  },
        { label: "Portfolio",    to: "assets"   },
        { label: "Live Markets", to: "markets"  },
        { label: "Deposit",      to: "/deposit" },
      ],
    },
    {
      title: "Support",
      links: [
        { label: "Help Center",  to: "/contact-care" },
        { label: "Contact Desk", to: "/contact-care" },
        { label: "Live Chat",    to: "/contact-care" },
        { label: "Withdraw",     to: "/withdraw"     },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About Bitloom", to: "about" },
        { label: "Insights",      to: "about" },
        { label: "Careers",       to: "about" },
        { label: "Partners",      to: "about" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Terms of Use",    to: "about" },
        { label: "Privacy Policy",  to: "about" },
        { label: "AML Policy",      to: "about" },
        { label: "Risk Disclosure", to: "about" },
      ],
    },
  ];

  const go = (to) => {
    if (to.startsWith("/")) {
      navigate(to);
      return;
    }
    onNavigate?.(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="mt-4 rounded-2xl border border-slate-800/80 bg-[#080d16]/90 p-5 sm:mt-6 sm:p-6">
      <div className="mb-5 grid grid-cols-2 gap-5 sm:gap-6 lg:grid-cols-4">
        {cols.map((col) => (
          <div key={col.title}>
            <h4 className="mb-2 font-semibold tracking-tight text-white">{col.title}</h4>
            <ul>
              {col.links.map((link) => (
                <li key={link.label}>
                  {/* 40px tap target on touch, tighter on desktop where it is a pointer */}
                  <button
                    type="button"
                    onClick={() => go(link.to)}
                    className="flex min-h-[40px] w-full cursor-pointer items-center text-left text-sm text-slate-500 transition hover:text-sky-300 active:text-sky-300 sm:min-h-0 sm:py-1"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-800 pt-4 md:flex-row">
        <div className="flex items-center gap-3">
          <img src={logoMark} alt="Bitloom" className="h-7 w-7 rounded-lg object-cover ring-1 ring-sky-400/30" />
          <div>
            <span className="font-extrabold tracking-tight text-white">Bitloom</span>
            <span className="text-slate-500 text-sm ml-2">Trading · © 2026</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-600 max-w-md text-center md:text-right">
          Trading involves risk. Past performance is not indicative of future results.
        </p>
      </div>
    </footer>
  );
}

// ─── FIREBASE ERROR HELPER ────────────────────────────────────────────────────
function fbErr(err) {
  const map = {
    "auth/invalid-credential":          "Incorrect email or password.",
    "auth/user-not-found":              "No account found with this email.",
    "auth/wrong-password":              "Incorrect password.",
    "auth/email-already-in-use":        "An account with this email already exists.",
    "auth/weak-password":               "Password must be at least 6 characters.",
    "auth/invalid-email":               "Please enter a valid email address.",
    "auth/operation-not-allowed":       "Sign-in method not enabled. Enable Email/Password in Firebase Console → Authentication → Sign-in method.",
    "auth/unauthorized-domain":         "This domain is not authorised. Add 'localhost' in Firebase Console → Authentication → Settings → Authorised domains.",
    "auth/configuration-not-found":     "Firebase Authentication is not set up. Enable it in Firebase Console → Authentication.",
    "auth/popup-closed-by-user":        "",
    "auth/cancelled-popup-request":     "",
    "auth/network-request-failed":      "Network error — check your internet connection.",
    "auth/too-many-requests":           "Too many attempts. Please wait a moment and try again.",
  };
  return map[err.code] ?? err.message;
}

// ─── LOGIN PAGE ────────────────────────────────────────────────────────────────
function LoginPage({ onLogin, setActivePage }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState("");
  const [notice, setNotice]     = useState("");
  const [loading, setLoading]   = useState(false);

  const handleReset = async () => {
    if (!email) { setError("Enter your email above first, then tap Forgot password."); return; }
    setLoading(true);
    setError("");
    setNotice("");
    try {
      await sendPasswordResetEmail(auth, email);
      setNotice(`Password reset link sent to ${email}.`);
    } catch (err) {
      const msg = fbErr(err);
      if (msg) setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNotice("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLogin();
    } catch (err) {
      const msg = fbErr(err);
      if (msg) setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError("");
    try {
      await signInWithPopup(auth, googleProvider);
      onLogin();
    } catch (err) {
      const msg = fbErr(err);
      if (msg) setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[82vh] items-center justify-center px-3 py-8 sm:px-4 sm:py-12">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2.5 sm:mb-8">
          <img src={logoMark} alt="Bitloom" className="h-10 w-10 rounded-2xl object-cover ring-1 ring-sky-400/30 shadow-lg shadow-sky-500/20" />
          <span className="text-2xl font-extrabold tracking-tight text-white">Bitloom</span>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 sm:p-8">
          <h1 className="mb-1 text-xl font-black text-white sm:text-2xl">Welcome back</h1>
          <p className="text-slate-500 text-sm mb-6">Log in to your Bitloom account to continue trading.</p>
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">{error}</div>
          )}
          {notice && (
            <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400">{notice}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-slate-500 block mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-white outline-none focus:border-sky-500/50 transition text-sm"
                  placeholder="you@example.com" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-10 py-3 text-white outline-none focus:border-sky-500/50 transition text-sm"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-400 cursor-pointer select-none">
                <input type="checkbox" className="rounded" /> Remember me
              </label>
              <button type="button" onClick={handleReset} className="cursor-pointer text-sky-400 transition hover:text-sky-300">Forgot password?</button>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-2xl bg-sky-500 text-black font-black text-sm hover:bg-sky-400 active:scale-95 transition-all disabled:opacity-60 shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 cursor-pointer">
              {loading ? "Signing in…" : "Log In"}
            </button>
          </form>
          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-800" />
            <span className="text-xs text-slate-600">or continue with</span>
            <div className="h-px flex-1 bg-slate-800" />
          </div>
          <div className="mt-4">
            <button onClick={handleGoogle} disabled={loading}
              className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-sm font-semibold hover:border-slate-700 transition disabled:opacity-60 flex items-center justify-center gap-2.5 cursor-pointer">
              <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </div>
        </div>
        <p className="text-center text-slate-500 text-sm mt-6">
          Don't have an account?{" "}
          <button onClick={() => setActivePage("signup")} className="text-sky-400 hover:text-sky-300 font-semibold transition">Sign Up</button>
        </p>

        {/* Trust strip */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
            { value: "2M+",   label: "Active Traders" },
            { value: "100+",  label: "Countries"      },
            { value: "$142B", label: "Daily Volume"   },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-slate-950/60 border border-slate-800/60 p-3 text-center">
              <div className="text-sky-400 font-black text-sm">{s.value}</div>
              <div className="text-slate-600 text-[10px] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-slate-700">
          <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> 256-bit SSL</span>
          <span>·</span>
          <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Regulated</span>
          <span>·</span>
          <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> Global</span>
        </div>
      </motion.div>
    </div>
  );
}

// ─── SIGN UP PAGE ──────────────────────────────────────────────────────────────
function SignupPage({ onSignup, setActivePage }) {
  const [form, setForm]     = useState({ name: "", email: "", password: "", confirm: "" });
  const [showPass, setShowPass] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!form.name || !form.email || !form.password || !form.confirm) { setError("Please fill in all fields."); return; }
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    if (!agreed) { setError("Please agree to the Terms of Use."); return; }
    setLoading(true);
    setError("");
    try {
      const { user } = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(user, { displayName: form.name });
      onSignup();
    } catch (err) {
      const msg = fbErr(err);
      if (msg) setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError("");
    try {
      await signInWithPopup(auth, googleProvider);
      onSignup();
    } catch (err) {
      const msg = fbErr(err);
      if (msg) setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[82vh] items-center justify-center px-3 py-8 sm:px-4 sm:py-12">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2.5 sm:mb-8">
          <img src={logoMark} alt="Bitloom" className="h-10 w-10 rounded-2xl object-cover ring-1 ring-sky-400/30 shadow-lg shadow-sky-500/20" />
          <span className="text-2xl font-extrabold tracking-tight text-white">Bitloom</span>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 sm:p-8">
          <h1 className="mb-1 text-xl font-black text-white sm:text-2xl">Create Account</h1>
          <p className="text-slate-500 text-sm mb-6">Start trading on Bitloom today — it's free.</p>
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: "Full Name", key: "name", type: "text", icon: <User className="h-4 w-4" />, placeholder: "John Doe" },
              { label: "Email",     key: "email", type: "email", icon: <Mail className="h-4 w-4" />, placeholder: "you@example.com" },
            ].map(({ label, key, type, icon, placeholder }) => (
              <div key={key}>
                <label className="text-xs text-slate-500 block mb-1.5">{label}</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">{icon}</span>
                  <input type={type} value={form[key]} onChange={update(key)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-white outline-none focus:border-sky-500/50 transition text-sm"
                    placeholder={placeholder} />
                </div>
              </div>
            ))}
            {["Password", "Confirm Password"].map((label, i) => {
              const key = i === 0 ? "password" : "confirm";
              return (
                <div key={key}>
                  <label className="text-xs text-slate-500 block mb-1.5">{label}</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input type={showPass ? "text" : "password"} value={form[key]} onChange={update(key)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-10 py-3 text-white outline-none focus:border-sky-500/50 transition text-sm"
                      placeholder="••••••••" />
                    {i === 0 && (
                      <button type="button" onClick={() => setShowPass(!showPass)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 rounded" />
              <span className="text-slate-400 text-xs leading-relaxed">
                I agree to the <span className="text-emerald-400">Terms of Use</span> and <span className="text-emerald-400">Privacy Policy</span>
              </span>
            </label>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-2xl bg-sky-500 text-black font-black text-sm hover:bg-sky-400 active:scale-95 transition-all disabled:opacity-60 shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 cursor-pointer">
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>
          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-800" />
            <span className="text-xs text-slate-600">or continue with</span>
            <div className="h-px flex-1 bg-slate-800" />
          </div>
          <div className="mt-4">
            <button onClick={handleGoogle} disabled={loading}
              className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-sm font-semibold hover:border-slate-700 transition disabled:opacity-60 flex items-center justify-center gap-2.5 cursor-pointer">
              <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </div>
        </div>
        <p className="text-center text-slate-500 text-sm mt-6">
          Already have an account?{" "}
          <button onClick={() => setActivePage("login")} className="text-sky-400 hover:text-sky-300 font-semibold transition">Log In</button>
        </p>

        {/* Trust strip */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
            { value: "Free",  label: "No deposit fee"  },
            { value: "24/7",  label: "Support online"  },
            { value: "Fast",  label: "Instant trading" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-slate-950/60 border border-slate-800/60 p-3 text-center">
              <div className="text-sky-400 font-black text-sm">{s.value}</div>
              <div className="text-slate-600 text-[10px] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-slate-700">
          <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> 256-bit SSL</span>
          <span>·</span>
          <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> KYC Verified</span>
          <span>·</span>
          <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> 100+ Countries</span>
        </div>
      </motion.div>
    </div>
  );
}

// ─── HOW IT WORKS ────────────────────────────────────────────────────────────
function HowItWorksSection() {
  const steps = [
    { n: "01", title: "Create Account",   desc: "Sign up in minutes, verify your email and complete basic KYC.",          icon: <User className="h-6 w-6" />          },
    { n: "02", title: "Deposit Funds",    desc: "Add USDT, BTC, ETH or wire funds via bank transfer or card.",            icon: <Wallet className="h-6 w-6" />        },
    { n: "03", title: "Start Trading",    desc: "Access Futures, Spot and Binary Options markets 24/7, 365 days.",        icon: <TrendingUp className="h-6 w-6" />     },
    { n: "04", title: "Withdraw Profits", desc: "Track your gains and withdraw to any external wallet instantly.",        icon: <ArrowUpRight className="h-6 w-6" />   },
  ];
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 sm:p-8">
      <h2 className="mb-8 text-center text-2xl font-black text-white sm:mb-10 sm:text-3xl">Start Trading in <span className="text-sky-400">4 Simple Steps</span></h2>
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {steps.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
            className="flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center mb-3 text-sky-400">{s.icon}</div>
            <div className="text-sky-400 font-black text-xs tracking-widest mb-1">{s.n}</div>
            <h3 className="text-white font-bold mb-2">{s.title}</h3>
            <p className="text-slate-500 text-xs leading-relaxed">{s.desc}</p>
            {i < steps.length - 1 && (
              <div className="hidden md:block absolute right-0 top-7 text-slate-700 text-lg">→</div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── TRADING PRODUCTS ─────────────────────────────────────────────────────────
function TradingProductsSection() {
  const products = [
    { title: "Spot Desk",        desc: "Execute on major pairs with live marks and clear market context.",  icon: <BarChart3 className="h-6 w-6" />,      accent: "amber"  },
    { title: "Trade Desk",       desc: "Perpetual-style workspace with leverage controls and live charts.", icon: <TrendingUp className="h-6 w-6" />,     accent: "blue"   },
    { title: "Portfolio",        desc: "Balances, activity, and P&L in one institutional overview.",       icon: <PieChart className="h-6 w-6" />,       accent: "rose"   },
    { title: "Market Analytics", desc: "Charts, signals, and market structure tools in real time.",         icon: <Activity className="h-6 w-6" />,       accent: "cyan"   },
    { title: "Client Desk",      desc: "Deposit, withdraw, and support flows with clear status tracking.", icon: <Users className="h-6 w-6" />,          accent: "green"  },
  ];
  const accents = {
    amber:  "bg-sky-500/10 border-sky-500/30 text-sky-400",
    blue:   "bg-blue-500/10 border-blue-500/30 text-blue-400",
    purple: "bg-indigo-500/10 border-indigo-500/30 text-indigo-300",
    green:  "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    rose:   "bg-rose-500/10 border-rose-500/30 text-rose-400",
    cyan:   "bg-cyan-500/10 border-cyan-500/30 text-cyan-400",
  };
  return (
    <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-8">
      <h2 className="text-3xl font-extrabold text-white text-center mb-10 tracking-tight">A complete <span className="text-sky-400">trading workspace</span></h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p, i) => (
          <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
            className="rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition p-5">
            <div className={`h-12 w-12 rounded-2xl border flex items-center justify-center mb-4 ${accents[p.accent]}`}>{p.icon}</div>
            <h3 className="text-white font-bold mb-2">{p.title}</h3>
            <p className="text-slate-500 text-sm leading-relaxed">{p.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── PLATFORM STATS ───────────────────────────────────────────────────────────
function PlatformStatsSection() {
  const stats = [
    { value: "$2.1T",  label: "Total Volume Traded",   sub: "All time"          },
    { value: "2M+",    label: "Registered Users",       sub: "Worldwide"         },
    { value: "100+",   label: "Countries Served",       sub: "Globally"          },
    { value: "99.9%",  label: "Platform Uptime",        sub: "SLA guaranteed"    },
    { value: "1,800+", label: "Trading Pairs",          sub: "Crypto & Metals"   },
    { value: "< 10ms", label: "Execution Speed",        sub: "Ultra-low latency" },
  ];
  return (
    <div className="rounded-3xl bg-gradient-to-br from-sky-500/8 via-slate-950 to-slate-950 border border-sky-500/20 p-8">
      <h2 className="text-3xl font-black text-white text-center mb-8">Bitloom by the <span className="text-sky-400">Numbers</span></h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
            className="text-center rounded-2xl bg-slate-900/50 border border-slate-800 p-4">
            <div className="text-2xl font-black text-sky-400 tabular-nums">{s.value}</div>
            <div className="text-white text-xs font-bold mt-1">{s.label}</div>
            <div className="text-slate-600 text-[10px] mt-0.5">{s.sub}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── SUPPORTED ASSETS ─────────────────────────────────────────────────────────
function SupportedAssetsSection() {
  const COINS = [
    { sym: "BTC",   color: "#0ea5e9" }, { sym: "ETH",  color: "#627EEA" },
    { sym: "USDT",  color: "#26A17B" }, { sym: "BNB",  color: "#F3BA2F" },
    { sym: "XRP",   color: "#00AAE4" }, { sym: "ADA",  color: "#3CC8C8" },
    { sym: "SOL",   color: "#9945FF" }, { sym: "DOGE", color: "#C3A634" },
    { sym: "AVAX",  color: "#E84142" }, { sym: "DOT",  color: "#E6007A" },
    { sym: "LINK",  color: "#2A5ADA" }, { sym: "LTC",  color: "#BFBBBB" },
    { sym: "UNI",   color: "#FF007A" }, { sym: "ATOM", color: "#6F7390" },
    { sym: "NEAR",  color: "#00C1DE" }, { sym: "FTM",  color: "#13B5EC" },
    { sym: "MATIC", color: "#8247E5" }, { sym: "SHIB", color: "#E44C41" },
    { sym: "AAVE",  color: "#B6509E" }, { sym: "SAND", color: "#00ADEF" },
  ];
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 sm:p-8">
      <h2 className="mb-3 text-center text-2xl font-black text-white sm:text-3xl">1,800+ <span className="text-sky-400">Supported Assets</span></h2>
      <p className="mb-6 text-center text-sm text-slate-500 sm:mb-8">Trade the world's top cryptocurrencies, stablecoins, and digital assets.</p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 sm:gap-3 md:grid-cols-10">
        {COINS.map((c) => (
          <div key={c.sym} className="flex flex-col items-center gap-1.5 group cursor-pointer">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-lg group-hover:scale-110 transition"
              style={{ background: c.color }}>{c.sym[0]}</div>
            <span className="text-slate-500 text-[9px] font-semibold group-hover:text-slate-300 transition">{c.sym}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TESTIMONIALS ─────────────────────────────────────────────────────────────
function TestimonialsSection() {
  const reviews = [
    { name: "Alex M.",    country: "🇺🇸 USA",       rating: 5, text: "Bitloom is the fastest trading platform I've ever used. The binary options are addictive — simple, quick, and transparent payouts. Been trading for 2 years without issues.", role: "Professional Trader" },
    { name: "Sarah K.",   country: "🇬🇧 UK",         rating: 5, text: "The Futures page with real-time charts is incredible. Customer support responded in under 2 minutes when I had a deposit question. Highly recommended.", role: "Crypto Investor" },
    { name: "David L.",   country: "🇦🇺 Australia",  rating: 5, text: "I've tried Binance, Bybit, and OKX. Bitloom beats them all on interface simplicity. The amber dark theme is beautiful and the P&L tracking is spot on.", role: "Day Trader" },
    { name: "Maria G.",   country: "🇩🇪 Germany",    rating: 4, text: "Withdrawals process within hours. The multi-currency support is great and the live prices feed is always accurate. The referral program is also generous.", role: "Portfolio Manager" },
    { name: "James T.",   country: "🇨🇦 Canada",     rating: 5, text: "The security features are top-notch. 256-bit encryption, 2FA, and the KYC process was smooth. I feel my funds are safe here.", role: "Security Analyst" },
    { name: "Priya S.",   country: "🇮🇳 India",      rating: 5, text: "Started with $100, now managing $50k portfolio. The technical analysis tools and live market data helped me level up my trading significantly.", role: "Crypto Enthusiast" },
  ];
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 sm:p-8">
      <h2 className="mb-3 text-center text-2xl font-black text-white sm:text-3xl">Trusted by <span className="text-sky-400">Traders Worldwide</span></h2>
      <div className="mb-6 flex flex-wrap items-center justify-center gap-2 sm:mb-8">
        {[1,2,3,4,5].map(i => <span key={i} className="text-lg text-sky-400">★</span>)}
        <span className="ml-2 font-bold text-white">4.8 / 5.0</span>
        <span className="text-sm text-slate-500">from 14,000+ reviews</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reviews.map((r, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
            className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 flex flex-col gap-3">
            <div className="flex items-center gap-1">
              {Array.from({ length: r.rating }).map((_, j) => <span key={j} className="text-sky-400 text-sm">★</span>)}
            </div>
            <p className="text-slate-300 text-sm leading-relaxed flex-1">"{r.text}"</p>
            <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center text-black font-black text-xs flex-shrink-0">
                {r.name[0]}
              </div>
              <div>
                <div className="text-white font-bold text-xs">{r.name}</div>
                <div className="text-slate-600 text-[10px]">{r.role} · {r.country}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── MARKET HEATMAP (for Markets page) ────────────────────────────────────────
function MarketHeatmapSection({ livePairs = [] }) {
  const EXTRA = [
    { symbol: "LINKUSDT", change: 3.21  }, { symbol: "LTCUSDT",  change: -0.58 },
    { symbol: "UNIUSDT",  change: 4.12  }, { symbol: "ATOMUSDT", change: -1.22 },
    { symbol: "NEARUSDT", change: 2.89  }, { symbol: "FTMUSDT",  change: 5.44  },
    { symbol: "MATICUSDT",change: 1.73  }, { symbol: "SHIBUSDT", change: -2.10 },
    { symbol: "AAVEUSDT", change: 3.65  }, { symbol: "SANDUSDT", change: -0.87 },
  ];
  const all = [
    ...livePairs,
    ...EXTRA.filter(e => !livePairs.find(p => p.symbol === e.symbol)).map(e => ({ ...e, price: 0, volume: "—", name: e.symbol.replace("USDT","") })),
  ];
  const getStyle = (c) => {
    const v = c ?? 0;
    if (v >= 5)  return "bg-emerald-400 text-black";
    if (v >= 2)  return "bg-emerald-500/80 text-white";
    if (v >= 0)  return "bg-emerald-700/60 text-emerald-200";
    if (v >= -2) return "bg-rose-700/60 text-rose-200";
    if (v >= -5) return "bg-rose-500/80 text-white";
    return "bg-rose-400 text-black";
  };
  return (
    <div className="rounded-3xl bg-slate-950 border border-slate-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold flex items-center gap-2"><Layers className="h-4 w-4 text-sky-400" /> Market Heatmap <span className="text-slate-600 text-xs font-normal">24h performance</span></h3>
        <div className="flex items-center gap-3 text-[10px] text-slate-600">
          <span className="flex items-center gap-1"><div className="h-2.5 w-2.5 rounded bg-emerald-500" />Bullish</span>
          <span className="flex items-center gap-1"><div className="h-2.5 w-2.5 rounded bg-rose-500" />Bearish</span>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-10">
        {all.map((p) => (
          <div key={p.symbol} className={`rounded-2xl p-2 text-center cursor-pointer hover:opacity-90 hover:scale-105 transition-all sm:p-3 ${getStyle(p.change)}`}>
            <div className="text-[10px] font-black sm:text-xs">{p.symbol.replace("USDT","")}</div>
            <div className="mt-0.5 text-[9px] opacity-80 sm:text-[10px]">{(p.change ?? 0) >= 0 ? "+" : ""}{(p.change ?? 0).toFixed(2)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ABOUT PAGE ────────────────────────────────────────────────────────────────
function AboutPage({ setActivePage }) {
  const stats = [
    { label: "Active Users",   value: "2M+"    },
    { label: "Countries",      value: "100+"   },
    { label: "Trading Pairs",  value: "1,800+" },
    { label: "Daily Volume",   value: "$142B"  },
  ];
  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-5 text-center sm:p-10 md:p-14">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-cyan-500/5 pointer-events-none" />
        <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-sky-500/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-sky-400/5 blur-3xl pointer-events-none" />
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative">
          <span className="text-xs font-bold text-sky-400 bg-sky-500/10 px-3 py-1.5 rounded-full border border-sky-500/20 inline-block mb-5">Bitloom Trading</span>
          <h1 className="mb-4 text-3xl font-extrabold leading-tight tracking-tight text-white sm:mb-5 sm:text-4xl md:text-6xl">
            Clarity in every<span className="text-sky-400"> market.</span>
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base md:text-lg">
            Bitloom is an institutional-style trading interface for crypto and gold markets — live data, a focused trade desk,
            and portfolio tools designed for precision, not noise.
          </p>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl bg-slate-900 border border-slate-800 p-4 text-center">
                <div className="text-2xl font-black text-sky-400">{s.value}</div>
                <div className="text-xs text-slate-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          {/* CTA buttons */}
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <button type="button" onClick={() => setActivePage?.("futures")}
              className="cursor-pointer rounded-xl bg-sky-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:bg-sky-400">
              Launch trade desk
            </button>
            <button type="button" onClick={() => setActivePage?.("markets")}
              className="cursor-pointer rounded-xl border border-slate-800 bg-slate-900 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-700">
              View markets
            </button>
          </div>
        </motion.div>
      </div>

      {/* How It Works */}
      <HowItWorksSection />

      {/* Security Features — wrapped in card */}
      <div className="rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden">
        <SecurityFeaturesSection />
      </div>

      {/* Platform Stats */}
      <PlatformStatsSection />

      {/* Values */}
      <ValuesSection />

      {/* Trading Products */}
      <TradingProductsSection />

      {/* Supported Assets */}
      <SupportedAssetsSection />

      {/* Awards — wrapped in card */}
      <div className="rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden">
        <AwardsSection />
      </div>

      {/* Events — wrapped in card */}
      <div className="rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden">
        <EventsSection />
      </div>

      {/* Testimonials */}
      <TestimonialsSection />

      {/* Customer Service */}
      <CustomerServiceSection />

      {/* Risk Warning */}
      <RiskWarning />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PAGE COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// ── BINANCE REAL-TIME PRICES ──────────────────────────────────────────────────
// Opens ONE multi-stream WebSocket at the App level; XAUUSDT comes from futures.
function useBinancePrices() {
  const [prices, setPrices] = useState({});

  useEffect(() => {
    const spotStreams = "btcusdt@miniTicker/ethusdt@miniTicker/solusdt@miniTicker/bnbusdt@miniTicker/xrpusdt@miniTicker/adausdt@miniTicker/dogeusdt@miniTicker/avaxusdt@miniTicker/dotusdt@miniTicker";
    const spotWs = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${spotStreams}`);
    const xauWs  = new WebSocket(`wss://fstream.binance.com/stream?streams=xauusdt@miniTicker`);

    const handle = (e) => {
      try {
        const { data: t } = JSON.parse(e.data);
        if (!t?.s || !t?.c) return;
        setPrices((prev) => ({
          ...prev,
          [t.s.toUpperCase()]: {
            price:  parseFloat(t.c),
            change: isNaN(parseFloat(t.P)) ? 0 : parseFloat(parseFloat(t.P).toFixed(2)),
          },
        }));
      } catch {}
    };

    spotWs.onmessage = handle;
    xauWs.onmessage  = handle;
    spotWs.onerror   = () => {};
    xauWs.onerror    = () => {};

    return () => { spotWs.close(); xauWs.close(); };
  }, []);

  return prices;
}

function useLivePrice(initialPair, livePairs = [], focusPair = null) {
  const [selected, setSelected] = useState(initialPair);
  const [prevSelected, setPrevSelected] = useState(initialPair);
  const [livePrice, setLivePrice] = useState(initialPair.price);
  const [appliedFocus, setAppliedFocus] = useState(null);

  if (selected !== prevSelected) {
    setPrevSelected(selected);
    setLivePrice(selected.price);
  }

  // Header search asks for a pair: apply it once per pick (same render-phase
  // derived-state pattern as above, so it lands before paint).
  if (focusPair && focusPair.at !== appliedFocus) {
    const wanted = livePairs.find((p) => p.symbol === focusPair.symbol);
    if (wanted) {
      setAppliedFocus(focusPair.at);
      setSelected(wanted);
    }
  }

  // Sync from Binance live data when available
  useEffect(() => {
    if (livePairs.length === 0) return;
    const livePair = livePairs.find((p) => p.symbol === selected.symbol);
    if (livePair?.price) setLivePrice(livePair.price);
  }, [livePairs, selected.symbol]);

  // Fallback: random drift only when no live data has arrived yet
  useEffect(() => {
    if (livePairs.length > 0) return;
    const t = setInterval(() => {
      setLivePrice((p) => p + (Math.random() - 0.48) * (selected.symbol === "BTCUSDT" ? 65 : selected.symbol === "XAUUSDT" ? 2.4 : 1.8));
    }, 1200);
    return () => clearInterval(t);
  }, [livePairs.length, selected.symbol]);

  const displayPair = useMemo(() => ({ ...selected, price: livePrice }), [selected, livePrice]);
  return { selected, setSelected, livePrice, displayPair };
}

// ── MARKETS ──────────────────────────────────────────────────────────────────
function MarketsPage({ livePairs = pairs, focusPair = null }) {
  const { selected, setSelected, livePrice, displayPair } = useLivePrice(livePairs[0] || pairs[0], livePairs, focusPair);
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
      {/* Columns size to their own content — the chart column now carries the
          stat panels, so nothing needs stretching to a fixed height. */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[250px_minmax(0,1fr)_280px] xl:items-start">
        <aside className="flex flex-col gap-3">
          <div className="flex max-h-[280px] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 sm:max-h-[360px] xl:max-h-none">
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
          </div>
          <FearGreedWidget />
        </aside>

        <section className="flex flex-col gap-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 px-3 py-3 sm:px-4">
            <div className="flex flex-wrap items-end gap-2 sm:gap-3">
              <div>
                <div className="text-[11px] text-slate-500">{displayPair.name}</div>
                <div className="text-lg font-extrabold tracking-tight text-white sm:text-xl">{displayPair.symbol}</div>
              </div>
              <div className="text-xl font-extrabold tabular-nums text-white sm:text-2xl">{formatPrice(livePrice)}</div>
              <div className={`flex items-center gap-1 text-sm font-bold ${displayPair.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {displayPair.change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {displayPair.change >= 0 ? "+" : ""}
                {(displayPair.change ?? 0).toFixed(2)}%
              </div>
              <div className="ml-auto grid w-full grid-cols-2 gap-x-4 gap-y-1 text-xs sm:w-auto sm:grid-cols-4 sm:gap-x-5">
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
          <ChartPanel symbol={selected.symbol} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
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
                        <div className={`h-full rounded-full ${up ? "bg-emerald-500" : "bg-rose-500"}`} style={{ width: `${pct}%` }} />
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
                  <button key={`g-${p.symbol}`} type="button" onClick={() => setSelected(p)}
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
                  <button key={`l-${p.symbol}`} type="button" onClick={() => setSelected(p)}
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
                    <div className={`mt-0.5 text-sm font-bold tabular-nums ${s.up ? "text-emerald-400" : "text-white"}`}>{s.value}</div>
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
                    <span className={`font-bold tabular-nums ${s.up === true ? "text-emerald-400" : s.up === false ? "text-rose-400" : "text-slate-300"}`}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <aside className="flex flex-col gap-3">
          <OrderBook mid={livePrice} />
          <div className="h-[220px] shrink-0 sm:h-[260px] xl:h-[380px]">
            <TradesFeed mid={livePrice} />
          </div>
        </aside>
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
                    className={`cursor-pointer border-t border-slate-800/70 hover:bg-slate-900/40 ${selected.symbol === p.symbol ? "bg-sky-500/5" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{p.symbol}</div>
                      <div className="text-[11px] text-slate-500">{p.name}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-slate-200">{formatPrice(p.price)}</td>
                    <td className={`px-4 py-3 font-bold tabular-nums ${up ? "text-emerald-400" : "text-rose-400"}`}>
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
                  <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400" style={{ width: `${Math.max(16, 100 - i * 8)}%` }} />
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
                  <span className={`text-xs font-bold ${f.up ? "text-emerald-400" : "text-rose-400"}`}>{f.net}</span>
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

      <NewsFeed />
      <FundingRateWidget />
      <LiquidationTracker />
      <MarketHeatmapSection livePairs={livePairs} />
      <GlobalStatsBar />
    </div>
  );
}


// ── FUTURES ───────────────────────────────────────────────────────────────────
function FuturesPage({ balance, onTradeDone, onBalanceChange, currentUser, tradeHistory, livePairs = pairs, setActivePage }) {
  const navigate = useNavigate();
  const { selected, setSelected, livePrice, displayPair } = useLivePrice(livePairs[0] || pairs[0], livePairs);
  return (
    <div className="space-y-4">
      {/* items-start: columns keep their own height instead of being padded out
          to match the tallest one, which is what left the dead space below them. */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[210px_1fr_360px] xl:items-start">
        <aside className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-white font-bold text-sm">Perpetual Futures</h2>
            <span className="text-[10px] text-sky-400 bg-sky-400/10 px-2 py-0.5 rounded-full font-semibold">PERP</span>
          </div>
          <PairSidebar pairs={livePairs} selected={selected} livePrice={livePrice} onSelect={setSelected} />
          <div className="rounded-3xl bg-slate-950 border border-slate-800 p-4">
            <h3 className="text-white font-bold text-sm mb-3">Account Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-400"><span>Equity</span><span className="text-white font-bold">{formatPrice(balance)} USDT</span></div>
              <div className="flex justify-between text-slate-400"><span>Margin Used</span><span className="text-sky-400 font-bold">$1,240.00</span></div>
              <div className="flex justify-between text-slate-400"><span>Available</span><span className="text-emerald-400 font-bold">{formatPrice(balance - 1240)}</span></div>
              <div className="h-px bg-slate-800 my-1" />
              <div className="flex justify-between text-slate-400"><span>Margin Ratio</span><span className="text-emerald-400 font-bold">18.4%</span></div>
              <div className="flex justify-between text-slate-400"><span>Liq. Risk</span><span className="text-emerald-400 font-bold">Low</span></div>
            </div>
          </div>

          {/* Margin Health Gauge */}
          <div className="rounded-3xl bg-slate-950 border border-slate-800 p-4">
            <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-sky-400" /> Margin Health
            </h3>
            <div className="space-y-2.5">
              {[
                { label: "Account Health", pct: 88, color: "bg-emerald-500", text: "text-emerald-400", value: "Excellent" },
                { label: "Margin Used",    pct: 18, color: "bg-sky-500",   text: "text-sky-400",  value: "18.4%"     },
                { label: "Free Margin",    pct: 82, color: "bg-blue-500",    text: "text-blue-400",   value: "81.6%"     },
              ].map((r) => (
                <div key={r.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">{r.label}</span>
                    <span className={`${r.text} font-bold`}>{r.value}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className={`h-full ${r.color} rounded-full`} style={{ width: `${r.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-3xl bg-slate-950 border border-slate-800 p-4">
            <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-sky-400" /> Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Deposit",   icon: <Wallet className="h-4 w-4" />,        color: "text-sky-400 border-sky-500/20 hover:border-sky-500/40 hover:bg-sky-500/5",     action: () => navigate("/deposit")        },
                { label: "History",   icon: <Clock className="h-4 w-4" />,         color: "text-slate-400 border-slate-700 hover:border-slate-600 hover:bg-slate-800/50",  action: () => setActivePage?.("assets")   },
                { label: "Analytics", icon: <BarChart3 className="h-4 w-4" />,     color: "text-slate-400 border-slate-700 hover:border-slate-600 hover:bg-slate-800/50",  action: () => setActivePage?.("markets")  },
                { label: "Support",   icon: <MessageCircle className="h-4 w-4" />, color: "text-slate-400 border-slate-700 hover:border-slate-600 hover:bg-slate-800/50",  action: () => window.dispatchEvent(new CustomEvent("bitloom:open-chat")) },
              ].map((a) => (
                <button key={a.label} type="button" onClick={a.action}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${a.color}`}>
                  {a.icon}
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sits with the other account panels and keeps this column level with the chart */}
          <RiskOverview />
        </aside>
        <section className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="rounded-3xl border border-slate-800 bg-slate-950 px-3 py-3 sm:px-5 sm:py-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <div className="text-xl font-black text-white sm:text-2xl">{displayPair.symbol}</div>
                <div className="text-2xl font-black text-white sm:text-3xl">{formatPrice(livePrice)}</div>
                <div className={`flex items-center gap-1 text-sm font-bold ${displayPair.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {displayPair.change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {displayPair.change}%
                </div>
                <div className="ml-auto grid w-full grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500 sm:flex sm:w-auto sm:flex-wrap sm:gap-5">
                  <span>24h High: <span className="text-slate-300">{formatPrice(livePrice * 1.018)}</span></span>
                  <span>24h Low: <span className="text-slate-300">{formatPrice(livePrice * 0.982)}</span></span>
                  <span>Funding: <span className="font-semibold text-emerald-400">+0.0100%</span></span>
                  <span>Open Int: <span className="text-slate-300">$1.42B</span></span>
                </div>
              </div>
            </div>
          </motion.div>
          <ChartPanel symbol={selected.symbol} />
          <Positions mode="futures" />
          <PairStatsPanel symbol={selected.symbol} livePrice={livePrice} pair={displayPair} />
          <TechnicalSignalsPanel livePrice={livePrice} pair={displayPair} />
        </section>
        <aside className="space-y-4">
          <BinaryTradePanel
            symbol={selected.symbol}
            mid={livePrice}
            balance={balance}
            onTradeDone={onTradeDone}
            onBalanceChange={onBalanceChange}
            currentUser={currentUser}
          />
          <OrderBook mid={livePrice} />
          {/* Bounded: unconstrained it renders the whole feed and runs far past
              the other two columns. It scrolls internally. */}
          <div className="h-[320px]">
            <TradesFeed mid={livePrice} />
          </div>
        </aside>
      </div>
      <ProfitHistoryTable trades={tradeHistory} />
      <OpenOrdersPanel mode="futures" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FundingRateWidget />
        <LiquidationTracker />
      </div>
      <NewsFeed />
      <GlobalStatsBar />
    </div>
  );
}

// ── ASSETS ────────────────────────────────────────────────────────────────────
function AssetsPage({ balance, tradeHistory, transactions, livePairs = pairs, setActivePage }) {
  const navigate = useNavigate();
  const holdings = [
    { asset: "USDT", name: "Tether",    balance: formatPrice(balance), value: `$${formatPrice(balance)}`, change: "0.00%"  },
    { asset: "BTC",  name: "Bitcoin",   balance: "0.0000",             value: "$0.00",                    change: "+2.14%" },
    { asset: "ETH",  name: "Ethereum",  balance: "0.0000",             value: "$0.00",                    change: "+1.28%" },
    { asset: "SOL",  name: "Solana",    balance: "0.0000",             value: "$0.00",                    change: "-0.72%" },
    { asset: "BNB",  name: "BNB",       balance: "0.0000",             value: "$0.00",                    change: "+3.08%" },
    { asset: "XRP",  name: "Ripple",    balance: "0.0000",             value: "$0.00",                    change: "+1.89%" },
    { asset: "ADA",  name: "Cardano",   balance: "0.0000",             value: "$0.00",                    change: "+1.54%" },
    { asset: "DOGE", name: "Dogecoin",  balance: "0.0000",             value: "$0.00",                    change: "-1.30%" },
    { asset: "AVAX", name: "Avalanche", balance: "0.0000",             value: "$0.00",                    change: "+2.67%" },
    { asset: "DOT",  name: "Polkadot",  balance: "0.0000",             value: "$0.00",                    change: "-0.41%" },
  ];
  const totalVal = balance;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-sky-400 to-cyan-500 p-5 text-black relative overflow-hidden cursor-pointer sm:p-6" onClick={() => navigate('/deposit')}>
          <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-black/10" />
          <div className="absolute -bottom-6 -right-8 h-32 w-32 rounded-full bg-black/5" />
          <Wallet className="h-7 w-7 mb-3 relative z-10" />
          <div className="text-sm font-bold opacity-70 relative z-10">Total Portfolio Value</div>
          <div className="relative z-10 text-3xl font-black sm:text-4xl">${formatPrice(totalVal)}</div>
          <div className="text-xs mt-2 font-semibold opacity-60 relative z-10 flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3" /> +$584.20 (2.03%) today
          </div>
        </div>
        <div className="rounded-3xl bg-slate-950 border border-slate-800 p-6">
          <div className="text-xs text-slate-500 mb-1">Available Balance</div>
          <div className="text-2xl font-black text-white">{formatPrice(balance)}</div>
          <div className="text-xs text-slate-500 mt-1">USDT</div>
        </div>
        <div className="rounded-3xl bg-slate-950 border border-slate-800 p-6">
          <div className="text-xs text-slate-500 mb-1">Trade P&amp;L</div>
          <div className={`text-2xl font-black ${tradeHistory.reduce((s, t) => s + t.pnl, 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {tradeHistory.reduce((s, t) => s + t.pnl, 0) >= 0 ? "+" : ""}
            {formatPrice(tradeHistory.reduce((s, t) => s + t.pnl, 0))} USDT
          </div>
          <div className="text-xs text-slate-500 mt-1">{tradeHistory.length} trades placed</div>
        </div>
      </div>
      <div className="rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-800 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <h3 className="font-bold text-white">Holdings</h3>
          <div className="flex gap-2">
            <button onClick={() => navigate('/deposit')} className="cursor-pointer rounded-xl bg-sky-500 px-3 py-1.5 text-xs font-bold text-black transition hover:bg-sky-400">Deposit</button>
            <button onClick={() => navigate('/withdraw')} className="cursor-pointer rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-slate-700">Withdraw</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-500 bg-slate-900/40">
              <tr>{["Asset", "Balance", "Value", "24h Change", "Actions"].map((h) => <th key={h} className="text-left px-5 py-3 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {holdings.map((h) => (
                <tr key={h.asset} className="border-t border-slate-800/60 hover:bg-slate-900/30 transition">
                  <td className="px-5 py-4"><div className="text-white font-bold">{h.asset}</div><div className="text-xs text-slate-500">{h.name}</div></td>
                  <td className="px-5 py-4 text-slate-300">{h.balance}</td>
                  <td className="px-5 py-4 text-white font-semibold">{h.value}</td>
                  <td className={`px-5 py-4 font-semibold ${h.change.startsWith("+") ? "text-emerald-400" : h.change === "0.00%" ? "text-slate-400" : "text-rose-400"}`}>{h.change}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setActivePage?.("futures")}
                        className="cursor-pointer px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition">Trade</button>
                      <button type="button" onClick={() => navigate("/deposit")}
                        className="cursor-pointer px-3 py-1 rounded-lg bg-slate-900 text-slate-400 text-xs font-semibold hover:bg-slate-800 transition">Deposit</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PortfolioAllocation balance={balance} />
        <RiskOverview />
      </div>
      <ProfitHistoryTable trades={tradeHistory} />
      <DepositWithdrawHistory transactions={transactions} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FearGreedWidget />
        <NewsFeed />
      </div>

      {/* ── Live Market Rates ── */}
      <div className="rounded-3xl bg-slate-950 border border-slate-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Activity className="h-4 w-4 text-sky-400" /> Live Market Rates
          </h3>
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <CircleDot className="h-2.5 w-2.5 text-emerald-400 animate-pulse" /> Real-time
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {livePairs.map((p) => (
            <div key={p.symbol} className="rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition p-3 sm:p-4 text-center cursor-pointer"
              onClick={() => setActivePage?.("futures")}>
              <div className="mb-1 truncate text-xs text-slate-500">{p.symbol}</div>
              <div className="text-white font-black tabular-nums text-sm">{formatPrice(p.price)}</div>
              <div className={`text-xs font-bold mt-1 ${(p.change ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {(p.change ?? 0) >= 0 ? "+" : ""}{(p.change ?? 0).toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="rounded-3xl bg-slate-950 border border-slate-800 p-5">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
          <Zap className="h-4 w-4 text-sky-400" /> Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: "Deposit",   sub: "Add funds",       icon: <ArrowUpRight className="h-5 w-5" />,   color: "bg-sky-500/10 border-sky-500/30 text-sky-400 hover:bg-sky-500/20",   action: () => navigate('/deposit')     },
            { label: "Withdraw",  sub: "Send to wallet",  icon: <ArrowDownRight className="h-5 w-5" />, color: "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20", action: () => navigate('/withdraw')    },
            { label: "Trade",     sub: "Futures market",  icon: <BarChart3 className="h-5 w-5" />,      color: "bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20", action: () => setActivePage?.("futures") },
          ].map((a) => (
            <button key={a.label} onClick={a.action}
              className={`flex flex-col items-center gap-2 py-5 rounded-2xl border transition cursor-pointer ${a.color}`}>
              {a.icon}
              <div>
                <div className="font-bold text-sm">{a.label}</div>
                <div className="text-[10px] opacity-70 mt-0.5">{a.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Account Security + Platform Stats ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Account Security */}
        <div className="rounded-3xl bg-slate-950 border border-slate-800 p-5">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-sky-400" /> Account Security
          </h3>
          <div className="space-y-3">
            {[
              { label: "Email Verification",  done: true,  detail: "Verified"            },
              { label: "2FA Authentication",  done: false, detail: "Not enabled"          },
              { label: "Withdrawal Whitelist",done: true,  detail: "Active"               },
              { label: "Anti-phishing Code",  done: false, detail: "Not configured"       },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`h-4 w-4 rounded-full flex items-center justify-center flex-shrink-0 ${item.done ? "bg-emerald-500" : "bg-slate-800 border border-slate-700"}`}>
                    {item.done && <CheckCircle2 className="h-2.5 w-2.5 text-black" />}
                  </div>
                  <span className="text-sm text-slate-300">{item.label}</span>
                </div>
                <span className={`text-xs font-semibold ${item.done ? "text-emerald-400" : "text-sky-400"}`}>{item.detail}</span>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setActivePage?.("profile")}
            className="mt-4 w-full py-2.5 rounded-2xl border border-sky-500/30 text-sky-400 text-xs font-bold hover:bg-sky-500/10 transition cursor-pointer">
            Improve Security Score
          </button>
        </div>

        {/* Platform Stats */}
        <div className="rounded-3xl bg-slate-950 border border-slate-800 p-5">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <Globe className="h-4 w-4 text-sky-400" /> Bitloom Platform
          </h3>
          <div className="space-y-3 mb-4">
            {[
              { label: "Total Users",    value: "2,000,000+", bar: 82, color: "bg-sky-500"   },
              { label: "Countries",      value: "100+",        bar: 65, color: "bg-blue-500"    },
              { label: "Trading Pairs",  value: "1,800+",      bar: 90, color: "bg-emerald-500" },
              { label: "Daily Volume",   value: "$142B+",      bar: 74, color: "bg-purple-500"  },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">{s.label}</span>
                  <span className="text-white font-bold">{s.value}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className={`h-full ${s.color} rounded-full`} style={{ width: `${s.bar}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-3 text-center">
              <div className="text-sky-400 font-black text-lg">99.9%</div>
              <div className="text-slate-600 text-[10px]">Uptime SLA</div>
            </div>
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-3 text-center">
              <div className="text-emerald-400 font-black text-lg">24 / 7</div>
              <div className="text-slate-600 text-[10px]">Support Available</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Referral Banner ── */}
      <div className="rounded-3xl bg-gradient-to-r from-sky-500/10 via-cyan-500/10 to-sky-500/10 border border-sky-500/20 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-white font-black text-xl">Invite Friends · Earn Together</h3>
          <p className="text-slate-400 text-sm mt-1">Get up to <span className="text-sky-400 font-bold">40% commission</span> for every friend you refer to Bitloom.</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 px-4 py-2.5 font-mono text-sky-400 text-sm font-bold tracking-wider">
            {REFERRAL_CODE}
          </div>
          <button
            type="button"
            onClick={() => {
              const text = `Join me on Bitloom — use my referral code ${REFERRAL_CODE}`;
              if (navigator.share) navigator.share({ title: "Bitloom", text }).catch(() => {});
              else navigator.clipboard?.writeText(text);
            }}
            className="px-5 py-2.5 rounded-2xl bg-sky-500 text-black font-black text-sm hover:bg-sky-400 transition shadow-lg shadow-sky-500/25 cursor-pointer flex items-center gap-2">
            <Share2 className="h-4 w-4" /> Share
          </button>
        </div>
      </div>

      <GlobalStatsBar />
    </div>
  );
}

// ─── MAIN APP COMPONENT ────────────────────────────────────────────────────────
function App() {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState("markets");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [balanceError, setBalanceError] = useState("");
  const [focusPair, setFocusPair] = useState(null);   // set by the header market search
  const [tradeHistory, setTradeHistory] = useState([]);
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [adminState, setAdminState] = useState({ open: false, loggedIn: false, credentials: null });

  // Real-time prices from Binance WebSocket
  const binancePrices = useBinancePrices();
  const livePairs = useMemo(
    () => pairs.map((p) => ({
      ...p,
      price:  binancePrices[p.symbol]?.price  ?? p.price,
      change: binancePrices[p.symbol]?.change ?? p.change,
    })),
    [binancePrices]
  );

  // Balance is server-owned. /api/me reads it through the Admin SDK, which is the
  // only path that works: Firestore rules deny the browser direct access to
  // users/{uid}, so the client SDK cannot see admin credits at all.
  const refreshBalance = useCallback(async (user = auth.currentUser) => {
    if (!user) return null;
    try {
      const me = await fetchMe(user);
      setBalance(Number(me.balance) || 0);
      setBalanceError("");
      return me;
    } catch (err) {
      // Never fail silently to $0 — that is what hid this for so long.
      setBalanceError(err.message || "Could not load balance");
      console.error("[balance] refresh failed:", err);
      return null;
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setIsLoggedIn(!!user);
      setCurrentUser(user);
      if (!user) {
        setBalance(0);
        setBalanceError("");
        setTradeHistory([]);
        return;
      }

      await refreshBalance(user);

      // Best-effort and deliberately separate: trade history is read with the
      // client SDK, so it must never be able to blank out the balance above.
      try {
        setTradeHistory((await loadTrades(user.uid)) || []);
      } catch (e) {
        console.error("[trades] load failed:", e);
        setTradeHistory([]);
      }
    });
    return () => unsub();
  }, [refreshBalance]);

  // An admin can credit the account while this tab is open — re-check on return.
  useEffect(() => {
    const recheck = () => {
      if (document.visibilityState === "visible") refreshBalance();
    };
    window.addEventListener("focus", recheck);
    document.addEventListener("visibilitychange", recheck);
    return () => {
      window.removeEventListener("focus", recheck);
      document.removeEventListener("visibilitychange", recheck);
    };
  }, [refreshBalance]);

  const handleLogout = async () => {
    await signOut(auth);
    setActivePage("markets");
  };

  const handleTradeDone = (trade) => {
    // Balance already updated from server open/settle responses
    setTradeHistory((prev) => [trade, ...prev]);
  };

  const renderContent = () => {
    switch (activePage) {
      case "markets":
        return <MarketsPage livePairs={livePairs} focusPair={focusPair} />;
      case "futures":
        return (
          <FuturesPage
            livePairs={livePairs}
            balance={balance}
            onTradeDone={handleTradeDone}
            onBalanceChange={setBalance}
            currentUser={currentUser}
            tradeHistory={tradeHistory}
            setActivePage={setActivePage}
          />
        );
      case "assets":
        return <AssetsPage livePairs={livePairs} balance={balance} tradeHistory={tradeHistory} transactions={transactions} setActivePage={setActivePage} />;
      case "about":
        return <AboutPage setActivePage={setActivePage} />;
      case "login":
        return <LoginPage onLogin={() => setActivePage("markets")} setActivePage={setActivePage} />;
      case "signup":
        return <SignupPage onSignup={() => setActivePage("markets")} setActivePage={setActivePage} />;
      case "profile":
        return <ProfilePage currentUser={currentUser} balance={balance} tradeHistory={tradeHistory} onLogout={handleLogout} setActivePage={setActivePage} />;
      default:
        return <MarketsPage />;
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#080d16] pb-[calc(4.5rem+env(safe-area-inset-bottom))] font-sans text-white selection:bg-sky-500/25 lg:pb-0">
      {/* Soft institutional wash */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: -1 }}>
        <div className="absolute -top-48 -left-32 h-[520px] w-[520px] rounded-full bg-sky-500/[0.07] blur-[100px]" />
        <div className="absolute top-[35%] -right-40 h-[420px] w-[420px] rounded-full bg-cyan-400/[0.04] blur-[90px]" />
        <div className="absolute bottom-0 left-[35%] h-[280px] w-[480px] rounded-full bg-indigo-500/[0.03] blur-[80px]" />
      </div>
      <Header
        activePage={activePage}
        setActivePage={setActivePage}
        isLoggedIn={isLoggedIn}
        currentUser={currentUser}
        onLogout={handleLogout}
        onAdminClick={() => setAdminState((s) => ({ ...s, open: true }))}
        livePairs={livePairs}
        onPickPair={(pair) => {
          setFocusPair({ symbol: pair.symbol, at: Date.now() });
          setActivePage("markets");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
      <TickerBar livePairs={livePairs} />
      {isLoggedIn && balanceError && (
        <div className="mx-auto max-w-[1600px] px-3 pt-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-300">
            <span>Balance unavailable — {balanceError}</span>
            <button
              type="button"
              onClick={() => refreshBalance()}
              className="cursor-pointer rounded-lg border border-amber-500/40 px-2.5 py-1 font-semibold text-amber-200 hover:bg-amber-500/15"
            >
              Retry
            </button>
          </div>
        </div>
      )}
      <main className="mx-auto max-w-[1600px] px-3 pb-4 pt-3 sm:px-4 sm:pt-4 md:p-6 lg:p-8">
        {renderContent()}
      </main>
      <Footer onNavigate={setActivePage} />
      {/* Admin login modal */}
      {adminState.open && !adminState.loggedIn && (
        <AdminLoginModal
          onSuccess={(creds) => setAdminState({ open: true, loggedIn: true, credentials: creds })}
          onClose={() => setAdminState({ open: false, loggedIn: false, credentials: null })}
        />
      )}
      {/* Admin panel full-screen overlay */}
      {adminState.loggedIn && adminState.credentials && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 overflow-y-auto">
          <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
              <AdminPanel
                credentials={adminState.credentials}
                onLogout={() => setAdminState({ open: false, loggedIn: false, credentials: null })}
              />
            </div>
          </div>
        </div>
      )}
      <ChatWidget />
    </div>
  );
}

export default App;
