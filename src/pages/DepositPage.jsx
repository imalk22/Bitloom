import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Copy, CheckCircle2, CreditCard, Building2,
  Shield, Zap, Clock, AlertTriangle, Info, Smartphone,
  CandlestickChart, Lock, ChevronDown, ChevronRight,
  Wallet, Globe,
} from "lucide-react";

// ── Crypto network/address data ──────────────────────────────────────────────
const NETWORKS = {
  USDT: [
    { id: "TRC20", label: "TRON (TRC20)", note: "Lowest fee · ~2 min", fee: "1 USDT",   address: "TYk7RqFm9GznXvpBjNLsKw4P8cMEeAd5m2" },
    { id: "ERC20", label: "Ethereum (ERC20)", note: "Standard · ~5 min", fee: "~5 USDT", address: "0x7A3b1f2C8D9e4a5F6b7c0D1e2F3A4b5C6d7E8f" },
    { id: "BEP20", label: "BNB Chain (BEP20)", note: "Fast · ~1 min",   fee: "0.5 USDT",address: "0xB3c4D5e6F7a8B9c0D1E2f3A4B5c6D7e8F9a0B1" },
  ],
  BTC:  [{ id: "BTC",   label: "Bitcoin Network",     note: "~30 min",   fee: "0",       address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh" }],
  ETH:  [{ id: "ERC20", label: "Ethereum (ERC20)",    note: "~5 min",    fee: "~5 USDT", address: "0x7A3b1f2C8D9e4a5F6b7c0D1e2F3A4b5C6d7E8f" }],
  BNB:  [{ id: "BEP20", label: "BNB Chain (BEP20)",   note: "~1 min",    fee: "0.1 BNB", address: "0xB3c4D5e6F7a8B9c0D1E2f3A4B5c6D7e8F9a0B1" }],
};

const FIAT_METHODS = [
  { id: "card",  name: "Credit / Debit Card",   sub: "Visa · Mastercard · Amex", fee: "2.5%", time: "Instant",   icon: CreditCard,  recommended: true,  accent: "amber",  glow: "rgba(14,165,233,0.15)"  },
  { id: "bank",  name: "Bank Transfer (SWIFT)", sub: "International wire",        fee: "0%",   time: "1–3 days",  icon: Building2,   recommended: false, accent: "blue",   glow: "rgba(59,130,246,0.15)"  },
  { id: "apple", name: "Apple Pay",             sub: "Powered by BPay",          fee: "3.5%", time: "Instant",   icon: Smartphone,  recommended: false, accent: "slate",  glow: "rgba(148,163,184,0.1)"  },
];

const CURRENCIES = [
  { sym: "USDT", label: "Tether",    color: "#26A17B" },
  { sym: "BTC",  label: "Bitcoin",   color: "#0ea5e9" },
  { sym: "ETH",  label: "Ethereum",  color: "#627EEA" },
  { sym: "BNB",  label: "BNB",       color: "#F3BA2F" },
];

const QUICK_AMOUNTS = [100, 500, 1000, 5000, 10000];

// ── QR code visual (not scannable — demo only) ────────────────────────────────
function QRCode({ value }) {
  const S = 25;
  const seed = value.split("").reduce((a, c, i) => a + c.charCodeAt(0) * (i + 1), 0);
  const rnd = (n) => ((Math.sin(seed * n + 7) + 1) / 2) > 0.48;

  const isCornerSquare = (r, c) => {
    const corners = [[0, 0], [0, S - 7], [S - 7, 0]];
    for (const [br, bc] of corners) {
      const lr = r - br, lc = c - bc;
      if (lr >= 0 && lr <= 6 && lc >= 0 && lc <= 6) {
        if (lr === 0 || lr === 6 || lc === 0 || lc === 6) return true;
        if (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4) return true;
        return false;
      }
    }
    return null;
  };

  const cells = [];
  for (let r = 0; r < S; r++) {
    for (let c = 0; c < S; c++) {
      const corner = isCornerSquare(r, c);
      const filled = corner !== null ? corner : rnd(r * S + c);
      if (filled) cells.push(<rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#0b0f17" />);
    }
  }

  return (
    <div className="p-3 bg-white rounded-2xl inline-block shadow-xl shadow-black/40">
      <svg width="156" height="156" viewBox={`0 0 ${S} ${S}`} style={{ background: "white" }}>
        {cells}
      </svg>
    </div>
  );
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <motion.button
      onClick={handle}
      whileTap={{ scale: 0.92 }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer
        bg-sky-500/10 border border-sky-500/30 text-sky-400 hover:bg-sky-500/20"
    >
      {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied!" : "Copy"}
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function DepositPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab]       = useState("deposit");
  const [depositType, setDepositType]   = useState("crypto");   // "crypto" | "fiat"
  const [currency, setCurrency]         = useState("USDT");
  const [network, setNetwork]           = useState(NETWORKS.USDT[0]);
  const [showNetDrop, setShowNetDrop]   = useState(false);
  const [fiatMethod, setFiatMethod]     = useState(null);
  const [amount, setAmount]             = useState("");
  const [agreedRisk, setAgreedRisk]     = useState(false);

  const handleCurrencyChange = (sym) => {
    setCurrency(sym);
    setNetwork(NETWORKS[sym][0]);
    setShowNetDrop(false);
  };

  const feeAmt = fiatMethod
    ? (Number(amount) * parseFloat(fiatMethod.fee) / 100).toFixed(2)
    : "0.00";
  const receiveAmt = fiatMethod
    ? (Number(amount) - parseFloat(feeAmt)).toFixed(2)
    : amount;

  // Crypto: the amount is entered first — the address is only revealed after it,
  // so support can match the incoming transfer to the account.
  const cryptoAmountOk = Number(amount) > 0;

  const canContinue = depositType === "crypto"
    ? cryptoAmountOk
    : (fiatMethod && Number(amount) > 0 && agreedRisk);

  const handleContinue = () => {
    if (!canContinue) return;
    if (depositType === "fiat") {
      navigate("/checkout", { state: { amount, method: fiatMethod?.name, fee: feeAmt, receive: receiveAmt, currency: "USDT" } });
    }
  };

  const TABS = ["Buy & Sell", "Deposit", "Withdraw"];

  return (
    <div className="min-h-screen bg-[#0b0f17] text-white"
      style={{ backgroundImage: "radial-gradient(circle at 1px 1px,rgba(14,165,233,0.05) 1px,transparent 0)", backgroundSize: "40px 40px" }}>

      {/* ── Fixed ambient orbs ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-0">
        <div className="absolute -top-40 -left-32 h-[500px] w-[500px] rounded-full bg-sky-500/[0.04] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-sky-600/[0.03] blur-3xl" />
      </div>

      {/* ── Top bar ── */}
      <motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }}
        className="relative z-10 flex items-center justify-between gap-2 border-b border-slate-800/70 bg-[#0b0f17]/95 px-3 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <button onClick={() => navigate("/")}
            className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-400 transition hover:text-white">
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Back</span>
          </button>
          <div className="hidden h-5 w-px bg-slate-800 sm:block" />
          <div className="flex min-w-0 cursor-pointer items-center gap-2" onClick={() => navigate("/")}>
            <img src="/bitloom-logo.png" alt="Bitloom" className="h-8 w-8 shrink-0 rounded-xl object-cover ring-1 ring-sky-400/30" />
            <span className="truncate text-lg font-extrabold tracking-tight text-white">Bitloom</span>
            <span className="ml-2 hidden text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-400/80 sm:inline">Trading</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 text-[10px] text-emerald-400 sm:text-xs">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          <span className="sm:hidden">SSL</span>
          <span className="hidden sm:inline">Secured · 256-bit SSL</span>
        </div>
      </motion.header>

      {/* ── Nav tabs ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="relative z-10 border-b border-slate-800/50 bg-[#0b0f17]/80 px-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center gap-0 overflow-x-auto">
          {TABS.map((tab) => {
            const active = tab.toLowerCase() === activeTab || (tab === "Deposit" && activeTab === "deposit") || (tab === "Withdraw" && activeTab === "withdraw") || (tab === "Buy & Sell" && activeTab === "buy");
            return (
              <button key={tab}
                onClick={() => {
                  if (tab === "Withdraw") { navigate("/withdraw"); return; }
                  setActiveTab(tab === "Buy & Sell" ? "buy" : tab.toLowerCase());
                }}
                className={`relative shrink-0 cursor-pointer px-3 py-3.5 text-sm font-semibold transition sm:px-5 sm:py-4 ${active ? "text-sky-400" : "text-slate-500 hover:text-slate-300"}`}>
                {tab}
                {active && (
                  <motion.div layoutId="tabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-sky-400" />
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ── Main ── */}
      <div className="relative z-10 mx-auto max-w-5xl px-3 py-6 sm:px-4 sm:py-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h1 className="mb-1 text-xl font-black text-white sm:text-2xl">
            {activeTab === "deposit" ? "Deposit Funds" : activeTab === "withdraw" ? "Withdraw Funds" : "Buy & Sell"}
          </h1>
          <p className="text-slate-500 text-sm mb-8">
            Deposits are credited by Bitloom support after confirmation — contact care with your email and amount. Funds are not auto-added.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">

          {/* ── LEFT PANEL ── */}
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            className="space-y-5">

            {/* Deposit type toggle */}
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-1 flex gap-1">
              {[{ id: "crypto", label: "Crypto", icon: <Wallet className="h-4 w-4" /> },
                { id: "fiat",   label: "Fiat / Card", icon: <CreditCard className="h-4 w-4" /> }
              ].map((t) => (
                <button key={t.id} onClick={() => { setDepositType(t.id); setFiatMethod(null); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                    depositType === t.id
                      ? "bg-sky-500 text-black shadow-lg shadow-sky-500/25"
                      : "text-slate-400 hover:text-slate-300"
                  }`}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {depositType === "crypto" ? (
                <motion.div key="crypto" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                  className="space-y-5">

                  {/* Currency tabs */}
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wide mb-2 block">Select Currency</label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {CURRENCIES.map((c) => (
                        <motion.button key={c.sym} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          onClick={() => handleCurrencyChange(c.sym)}
                          className={`py-3 rounded-2xl border text-sm font-bold transition cursor-pointer flex flex-col items-center gap-1 ${
                            currency === c.sym
                              ? "border-sky-500/60 bg-sky-500/10 text-sky-400 shadow-lg shadow-sky-500/10"
                              : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700"
                          }`}>
                          <div className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                            style={{ background: c.color }}>{c.sym[0]}</div>
                          <span className="text-xs">{c.sym}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Network selector */}
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wide mb-2 block">Network</label>
                    <div className="relative">
                      <button onClick={() => setShowNetDrop((p) => !p)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition cursor-pointer">
                        <div>
                          <span className="text-white font-semibold text-sm">{network.label}</span>
                          <span className="text-slate-500 text-xs ml-2">· {network.note}</span>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${showNetDrop ? "rotate-180" : ""}`} />
                      </button>
                      <AnimatePresence>
                        {showNetDrop && (
                          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                            className="absolute top-full left-0 right-0 mt-1 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden z-20 shadow-2xl">
                            {NETWORKS[currency].map((net) => (
                              <button key={net.id} onClick={() => { setNetwork(net); setShowNetDrop(false); }}
                                className={`w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800 transition cursor-pointer text-left ${network.id === net.id ? "bg-sky-500/5" : ""}`}>
                                <div>
                                  <div className="text-white text-sm font-semibold">{net.label}</div>
                                  <div className="text-slate-500 text-xs">{net.note}</div>
                                </div>
                                <div className="text-xs text-sky-400 font-bold">Fee: {net.fee}</div>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Warning */}
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                    className="flex items-start gap-3 p-4 rounded-2xl bg-sky-500/8 border border-sky-500/25">
                    <AlertTriangle className="h-4 w-4 text-sky-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-sky-200/80 leading-relaxed">
                      Only send <strong>{currency}</strong> on the <strong>{network.label}</strong> network. Sending the wrong asset or using the wrong network may result in permanent loss of funds.
                    </p>
                  </motion.div>

                  {/* Min deposit info */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    {[
                      { label: "Min Deposit", value: currency === "BTC" ? "0.0001 BTC" : "10 USDT" },
                      { label: "Deposit Fee",  value: network.fee },
                      { label: "Arrival Time", value: network.note.split("·").pop().trim() },
                    ].map((s) => (
                      <div key={s.label} className="rounded-2xl bg-slate-900/60 border border-slate-800 p-3">
                        <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-wide">{s.label}</div>
                        <div className="text-sm font-bold text-white">{s.value}</div>
                      </div>
                    ))}
                  </div>
                </motion.div>

              ) : (
                <motion.div key="fiat" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                  className="space-y-3">
                  <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Select Payment Method</div>

                  {FIAT_METHODS.map((m, idx) => {
                    const Icon = m.icon;
                    const sel = fiatMethod?.id === m.id;
                    return (
                      <motion.button key={m.id} onClick={() => setFiatMethod(m)}
                        initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.06 }}
                        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                        style={sel ? { boxShadow: `0 0 24px ${m.glow}` } : {}}
                        className={`w-full text-left flex items-center gap-4 p-4 rounded-2xl border transition cursor-pointer ${
                          sel
                            ? `bg-gradient-to-r ${m.accent === "amber" ? "from-sky-500/15 to-cyan-500/10 border-sky-500/50" : m.accent === "blue" ? "from-blue-500/15 to-cyan-500/10 border-blue-500/50" : "from-slate-500/15 to-slate-600/10 border-slate-500/50"}`
                            : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                        }`}>
                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                          sel
                            ? m.accent === "amber" ? "bg-sky-500/20 text-sky-400" : m.accent === "blue" ? "bg-blue-500/20 text-blue-400" : "bg-slate-600/40 text-slate-300"
                            : "bg-slate-800 text-slate-400"
                        }`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold text-sm">{m.name}</span>
                            {m.recommended && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-sky-500 text-black uppercase tracking-wide">Recommended</span>
                            )}
                          </div>
                          <div className="text-slate-500 text-xs mt-0.5">{m.sub}</div>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="flex items-center gap-1 text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-lg">
                              <Clock className="h-2.5 w-2.5" /> {m.time}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold ${
                              m.fee === "0%" ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-400"
                            }`}>
                              {m.fee === "0%" ? "No Fee" : `${m.fee} fee`}
                            </span>
                          </div>
                        </div>
                        {sel && <div className="h-5 w-5 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0">
                          <div className="h-2 w-2 rounded-full bg-black" />
                        </div>}
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── RIGHT PANEL ── */}
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}
            className="space-y-4">

            <AnimatePresence mode="wait">
              {depositType === "crypto" ? (
                <motion.div key="crypto-right" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
                  className="rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden">
                  <div className="p-5 border-b border-slate-800">
                    <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Step 1 · Amount</div>
                    <div className="text-white font-bold">How much {currency} are you sending?</div>
                  </div>

                  <div className="space-y-4 p-5">
                    <div className="relative">
                      <input type="number" min="0" value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-4 pr-20 py-4 text-white text-xl font-black outline-none focus:border-sky-500/50 transition tabular-nums"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">{currency}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
                      {QUICK_AMOUNTS.map((v) => (
                        <motion.button key={v} whileTap={{ scale: 0.93 }}
                          onClick={() => setAmount(String(v))}
                          className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                            Number(amount) === v
                              ? "bg-sky-500/20 border-sky-500/50 text-sky-400"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                          }`}>{v >= 1000 ? `${v / 1000}k` : v}</motion.button>
                      ))}
                    </div>
                  </div>

                  {!cryptoAmountOk ? (
                    <div className="border-t border-slate-800 px-5 py-10 text-center">
                      <Lock className="mx-auto mb-3 h-5 w-5 text-slate-600" />
                      <p className="text-sm font-semibold text-slate-400">Enter an amount to see the deposit address</p>
                      <p className="mx-auto mt-1 max-w-xs text-xs text-slate-600">
                        Support matches your transfer using the amount you enter here.
                      </p>
                    </div>
                  ) : (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="border-t border-slate-800">
                      <div className="px-5 pt-5">
                        <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Step 2 · Deposit Address</div>
                        <div className="text-white font-bold">{currency} · {network.id}</div>
                      </div>

                      {/* QR Code */}
                      <div className="flex flex-col items-center py-6 px-5 gap-5">
                        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 20 }}>
                          <QRCode value={network.address} />
                        </motion.div>

                        {/* Address display */}
                        <div className="w-full space-y-2">
                          <div className="text-xs text-slate-500 text-center">Scan QR or copy address below</div>
                          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-3">
                            <code className="flex-1 text-xs text-slate-300 break-all leading-relaxed font-mono">{network.address}</code>
                            <div className="flex-shrink-0">
                              <CopyBtn text={network.address} />
                            </div>
                          </div>
                        </div>

                        {/* Steps */}
                        <div className="w-full space-y-2">
                          {[
                            "Open your external wallet or exchange",
                            `Send ${Number(amount)} ${currency} to the address above`,
                            "Funds arrive after network confirmation",
                          ].map((step, i) => (
                            <div key={i} className="flex items-start gap-3 text-xs text-slate-400">
                              <div className="h-5 w-5 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-400 font-black text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</div>
                              <span>{step}</span>
                            </div>
                          ))}
                        </div>

                        {/* Done button */}
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                          onClick={() => navigate("/contact-care", { state: { amount, method: `${currency} ${network?.id || ""}`, receive: amount, currency } })}
                          className="w-full py-3.5 rounded-2xl bg-sky-500 text-black font-black text-sm hover:bg-sky-400 transition shadow-lg shadow-sky-500/25 cursor-pointer">
                          Contact Support to Credit Account
                        </motion.button>
                        <p className="text-center text-[11px] text-slate-500">
                          Tell support your login email and amount. An admin will credit your Bitloom balance.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </motion.div>

              ) : (
                <motion.div key="fiat-right" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
                  className="rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden">
                  <div className="p-5 border-b border-slate-800">
                    <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Amount</div>
                    <div className="text-white font-bold">{fiatMethod ? fiatMethod.name : "Select a method"}</div>
                  </div>
                  <div className="p-5 space-y-4">
                    {/* Amount input */}
                    <div>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                        <input type="number" min="0" value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-8 pr-16 py-4 text-white text-xl font-black outline-none focus:border-sky-500/50 transition tabular-nums"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">USD</span>
                      </div>
                    </div>

                    {/* Quick amounts */}
                    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
                      {QUICK_AMOUNTS.map((v) => (
                        <motion.button key={v} whileTap={{ scale: 0.93 }}
                          onClick={() => setAmount(String(v))}
                          className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                            Number(amount) === v
                              ? "bg-sky-500/20 border-sky-500/50 text-sky-400"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                          }`}>${v >= 1000 ? `${v / 1000}k` : v}</motion.button>
                      ))}
                    </div>

                    {/* Fee breakdown */}
                    {fiatMethod && Number(amount) > 0 && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                        className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 space-y-2.5">
                        {[
                          { label: "You deposit",  value: `$${Number(amount).toFixed(2)}`,                       color: "text-white"        },
                          { label: `Fee (${fiatMethod.fee})`, value: `- $${feeAmt}`,                             color: "text-rose-400"     },
                          { label: "You receive",  value: `$${receiveAmt}`,                                      color: "text-emerald-400"  },
                          { label: "Rate",         value: "1 USD = 1 USDT",                                      color: "text-slate-400"    },
                        ].map((r) => (
                          <div key={r.label} className="flex justify-between text-sm">
                            <span className="text-slate-500">{r.label}</span>
                            <span className={`font-bold tabular-nums ${r.color}`}>{r.value}</span>
                          </div>
                        ))}
                        <div className="border-t border-slate-800 pt-2.5 flex justify-between text-sm">
                          <span className="text-slate-300 font-semibold">Total in USDT</span>
                          <span className="text-white font-black">{receiveAmt} USDT</span>
                        </div>
                      </motion.div>
                    )}

                    {/* Risk agreement */}
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <div
                        onClick={() => setAgreedRisk((p) => !p)}
                        className={`mt-0.5 h-4 w-4 rounded flex items-center justify-center flex-shrink-0 border transition cursor-pointer ${
                          agreedRisk ? "bg-sky-500 border-sky-500" : "border-slate-700 bg-slate-900"
                        }`}>
                        {agreedRisk && <div className="h-2 w-2 rounded-sm bg-black" />}
                      </div>
                      <span className="text-xs text-slate-500 leading-relaxed">
                        I confirm this deposit and agree to Bitloom's{" "}
                        <span className="text-sky-400">Terms of Service</span> and{" "}
                        <span className="text-sky-400">Privacy Policy</span>.
                      </span>
                    </label>

                    {/* Continue */}
                    <motion.button
                      whileHover={canContinue ? { scale: 1.02 } : {}}
                      whileTap={canContinue ? { scale: 0.98 } : {}}
                      onClick={handleContinue}
                      disabled={!canContinue}
                      className={`w-full py-4 rounded-2xl font-black text-sm transition cursor-pointer ${
                        canContinue
                          ? "bg-sky-500 text-black hover:bg-sky-400 shadow-lg shadow-sky-500/25"
                          : "bg-slate-800 text-slate-500 cursor-not-allowed"
                      }`}>
                      {!fiatMethod ? "Select a payment method" : !Number(amount) ? "Enter an amount" : !agreedRisk ? "Agree to terms" : "Continue →"}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Trust badges */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="grid grid-cols-3 gap-2">
              {[
                { icon: Shield, label: "Bank-grade", sub: "256-bit SSL", color: "text-emerald-400" },
                { icon: Lock,   label: "Encrypted",  sub: "End-to-end",  color: "text-blue-400"    },
                { icon: Globe,  label: "Global",      sub: "100+ banks",  color: "text-sky-400"   },
              ].map((t) => {
                const Icon = t.icon;
                return (
                  <div key={t.label} className="rounded-2xl bg-slate-950 border border-slate-800 p-3 text-center">
                    <Icon className={`h-4 w-4 ${t.color} mx-auto mb-1.5`} />
                    <div className="text-white text-xs font-bold">{t.label}</div>
                    <div className="text-slate-600 text-[10px]">{t.sub}</div>
                  </div>
                );
              })}
            </motion.div>

            {/* Info notice */}
            <div className="flex items-start gap-2 text-xs text-slate-600">
              <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>Deposits are credited within minutes for crypto and up to 3 business days for bank transfers. Support available 24/7.</span>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
