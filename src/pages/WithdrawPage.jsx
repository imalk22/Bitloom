import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, CandlestickChart, ChevronDown, AlertTriangle,
  CheckCircle2, Shield, Lock, Clock, Copy, Wallet,
  Building2, Globe, Info, Zap, X,
  ArrowDownLeft, TrendingDown,
} from "lucide-react";

// ─── DATA ──────────────────────────────────────────────────────────────────────
const ASSETS = [
  { sym: "USDT", label: "Tether",   color: "#26A17B", balance: 9_540.00, balanceStr: "9,540.00" },
  { sym: "BTC",  label: "Bitcoin",  color: "#0ea5e9", balance: 0.0425,   balanceStr: "0.0425"   },
  { sym: "ETH",  label: "Ethereum", color: "#627EEA", balance: 1.24,     balanceStr: "1.2400"   },
  { sym: "BNB",  label: "BNB",      color: "#F3BA2F", balance: 3.81,     balanceStr: "3.8100"   },
];

const NETWORKS = {
  USDT: [
    { id: "TRC20", label: "TRON (TRC20)",      fee: 1,    feeStr: "1 USDT",    min: 10,    time: "~2 min",   prefix: "T"  },
    { id: "ERC20", label: "Ethereum (ERC20)",  fee: 5,    feeStr: "~5 USDT",   min: 20,    time: "~5 min",   prefix: "0x" },
    { id: "BEP20", label: "BNB Chain (BEP20)", fee: 0.5,  feeStr: "0.5 USDT",  min: 10,    time: "~1 min",   prefix: "0x" },
  ],
  BTC:  [{ id: "BTC",   label: "Bitcoin Network",     fee: 0.0005, feeStr: "0.0005 BTC", min: 0.001,  time: "~30 min", prefix: "bc1" }],
  ETH:  [{ id: "ERC20", label: "Ethereum (ERC20)",    fee: 0.001,  feeStr: "~0.001 ETH", min: 0.01,   time: "~5 min",  prefix: "0x"  }],
  BNB:  [{ id: "BEP20", label: "BNB Chain (BEP20)",   fee: 0.001,  feeStr: "0.001 BNB",  min: 0.01,   time: "~1 min",  prefix: "0x"  }],
};

const RECENT = [
  { asset: "USDT", network: "TRC20", amount: "500.00",  status: "Completed", date: "2025-05-08",  addr: "TYk7...d5m2" },
  { asset: "BTC",  network: "BTC",   amount: "0.0100",  status: "Pending",   date: "2025-05-06",  addr: "bc1q...x0wlh" },
  { asset: "ETH",  network: "ERC20", amount: "0.5000",  status: "Completed", date: "2025-05-01",  addr: "0x7A...E8f9" },
];

const PCT_BTNS = [25, 50, 75, 100];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function validateAddress(addr, network) {
  if (!addr) return null;
  const prefixes = { TRC20: "T", ERC20: "0x", BEP20: "0x", BTC: "bc1" };
  const ok = addr.startsWith(prefixes[network] ?? "") && addr.length >= 20;
  return ok;
}

function AddressError({ show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
          className="flex items-center gap-2 text-xs text-rose-400 mt-1.5">
          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
          Invalid address format for this network
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── CONFIRMATION MODAL ───────────────────────────────────────────────────────
function ConfirmModal({ details, onConfirm, onClose }) {
  const [checked, setChecked] = useState(false);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="w-full max-w-sm bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl shadow-black/60">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-rose-500/5">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-rose-400" />
            <span className="text-white font-black">Confirm Withdrawal</span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition cursor-pointer p-1 rounded-lg hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Amount hero */}
          <div className="text-center py-3 rounded-2xl bg-rose-500/5 border border-rose-500/15">
            <div className="text-3xl font-black text-white tabular-nums">{details.amount} <span className="text-rose-400">{details.asset}</span></div>
            <div className="text-slate-500 text-xs mt-1">You will send</div>
          </div>

          {/* Details */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 divide-y divide-slate-800 text-sm">
            {[
              { label: "Network",   value: details.network },
              { label: "Address",   value: `${details.address.slice(0, 8)}…${details.address.slice(-6)}` },
              { label: "Fee",       value: details.feeStr, color: "text-rose-400" },
              { label: "You Receive", value: `${details.receive} ${details.asset}`, color: "text-emerald-400 font-black" },
              { label: "Arrival",   value: details.time, color: "text-sky-400" },
            ].map((r) => (
              <div key={r.label} className="flex justify-between px-4 py-2.5">
                <span className="text-slate-500">{r.label}</span>
                <span className={`font-semibold ${r.color ?? "text-white"}`}>{r.value}</span>
              </div>
            ))}
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-sky-500/8 border border-sky-500/20 text-xs text-sky-200/80">
            <AlertTriangle className="h-3.5 w-3.5 text-sky-400 flex-shrink-0 mt-0.5" />
            Crypto withdrawals are irreversible. Double-check the address and network before confirming.
          </div>

          {/* Confirm checkbox */}
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <div onClick={() => setChecked(p => !p)}
              className={`mt-0.5 h-4 w-4 rounded flex items-center justify-center flex-shrink-0 border transition cursor-pointer ${checked ? "bg-sky-500 border-sky-500" : "border-slate-700"}`}>
              {checked && <div className="h-2 w-2 rounded-sm bg-black" />}
            </div>
            <span className="text-xs text-slate-400 leading-relaxed">I have verified the address and network. I understand this action cannot be undone.</span>
          </label>

          {/* Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button onClick={onClose}
              className="py-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-sm font-semibold hover:border-slate-700 transition cursor-pointer">
              Cancel
            </button>
            <motion.button whileHover={checked ? { scale: 1.03 } : {}} whileTap={checked ? { scale: 0.97 } : {}}
              onClick={() => checked && onConfirm()}
              className={`py-3 rounded-2xl text-sm font-black transition cursor-pointer ${checked ? "bg-sky-500 text-black hover:bg-sky-400 shadow-lg shadow-sky-500/25" : "bg-slate-800 text-slate-500 cursor-not-allowed"}`}>
              Submit
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function WithdrawPage() {
  const navigate = useNavigate();

  const [method,      setMethod]      = useState("crypto");   // "crypto" | "bank"
  const [asset,       setAsset]       = useState(ASSETS[0]);
  const [network,     setNetwork]     = useState(NETWORKS.USDT[0]);
  const [showNetDrop, setShowNetDrop] = useState(false);
  const [address,     setAddress]     = useState("");
  const [amount,      setAmount]      = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [addrTouched, setAddrTouched] = useState(false);

  // Bank fields
  const [bankName,    setBankName]    = useState("");
  const [accountName, setAccountName] = useState("");
  const [iban,        setIban]        = useState("");
  const [swift,       setSwift]       = useState("");

  useEffect(() => {
    setNetwork(NETWORKS[asset.sym][0]);
    setAddress("");
    setAmount("");
    setAddrTouched(false);
  }, [asset.sym]);

  const numAmt   = parseFloat(amount) || 0;
  const fee      = network.fee;
  const receive  = Math.max(0, numAmt - fee);
  const addrOk   = !addrTouched || validateAddress(address, network.id);
  const amtOk    = numAmt >= network.min && numAmt <= asset.balance;
  const cryptoOk = method === "crypto" && validateAddress(address, network.id) && amtOk;
  const bankOk   = method === "bank"   && bankName && accountName && iban && swift && numAmt > 0;
  const canSubmit = cryptoOk || bankOk;

  const handlePct = (pct) => {
    const raw = ((asset.balance * pct) / 100);
    setAmount(raw > fee ? (raw - fee).toFixed(asset.sym === "USDT" ? 2 : 6) : "");
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    navigate("/contact-care", {
      state: {
        amount: `${amount} ${asset.sym}`,
        method: method === "crypto" ? `${asset.sym} via ${network.label}` : `Bank Wire – ${bankName}`,
        receive: `${receive.toFixed(asset.sym === "USDT" ? 2 : 6)} ${asset.sym}`,
        currency: asset.sym,
        isWithdraw: true,
      },
    });
  };

  const TABS = ["Deposit", "Withdraw"];

  return (
    <>
      <div className="min-h-screen bg-[#0b0f17] text-white"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px,rgba(14,165,233,0.05) 1px,transparent 0)", backgroundSize: "40px 40px" }}>

        {/* Ambient orbs */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden -z-0">
          <div className="absolute -top-32 right-1/3 h-[500px] w-[500px] rounded-full bg-rose-500/[0.03] blur-3xl" />
          <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-sky-600/[0.03] blur-3xl" />
        </div>

        {/* Header */}
        <motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="relative z-10 flex items-center justify-between gap-2 border-b border-slate-800/70 bg-[#0b0f17]/95 px-3 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <button onClick={() => navigate(-1)}
              className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-400 transition hover:text-white">
              <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Back</span>
            </button>
            <div className="hidden h-5 w-px bg-slate-800 sm:block" />
            <div className="flex min-w-0 cursor-pointer items-center gap-2" onClick={() => navigate("/")}>
              <img src="/bitloom-logo.png" alt="Bitloom" className="h-8 w-8 shrink-0 rounded-xl object-cover ring-1 ring-sky-400/30" />
              <span className="truncate text-lg font-black tracking-tight bg-gradient-to-r from-sky-300 to-cyan-400 bg-clip-text text-transparent">Bitloom</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 text-[10px] text-emerald-400 sm:text-xs">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="sm:hidden">SSL</span>
            <span className="hidden sm:inline">Secured · 256-bit SSL</span>
          </div>
        </motion.header>

        {/* Nav tabs */}
        <div className="relative z-10 border-b border-slate-800/50 bg-[#0b0f17]/80 px-3 sm:px-6">
          <div className="mx-auto flex max-w-5xl items-center gap-0 overflow-x-auto">
            {TABS.map((tab) => {
              const active = tab === "Withdraw";
              return (
                <button key={tab}
                  onClick={() => tab === "Deposit" && navigate("/deposit")}
                  className={`relative shrink-0 cursor-pointer px-3 py-3.5 text-sm font-semibold transition sm:px-5 sm:py-4 ${active ? "text-sky-400" : "text-slate-500 hover:text-slate-300"}`}>
                  {tab}
                  {active && <motion.div layoutId="wdTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-sky-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main content */}
        <div className="relative z-10 mx-auto max-w-5xl px-3 py-6 sm:px-4 sm:py-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h1 className="mb-1 text-xl font-black text-white sm:text-2xl">Withdraw Funds</h1>
            <p className="mb-6 text-sm text-slate-500 sm:mb-8">Transfer your funds to an external wallet or bank account.</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">

            {/* ── LEFT PANEL ── */}
            <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
              className="space-y-5">

              {/* Method toggle */}
              <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-1 flex gap-1">
                {[
                  { id: "crypto", label: "Crypto Withdrawal", icon: <Wallet className="h-4 w-4" /> },
                  { id: "bank",   label: "Bank Wire",         icon: <Building2 className="h-4 w-4" /> },
                ].map((t) => (
                  <button key={t.id} onClick={() => setMethod(t.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                      method === t.id ? "bg-sky-500 text-black shadow-lg shadow-sky-500/25" : "text-slate-400 hover:text-slate-300"
                    }`}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {method === "crypto" ? (
                  <motion.div key="crypto" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="space-y-5">

                    {/* Asset selector */}
                    <div>
                      <label className="text-xs text-slate-500 uppercase tracking-wide mb-2 block">Select Asset</label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {ASSETS.map((a) => (
                          <motion.button key={a.sym} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            onClick={() => setAsset(a)}
                            className={`py-3 rounded-2xl border text-sm font-bold transition cursor-pointer flex flex-col items-center gap-1.5 ${
                              asset.sym === a.sym
                                ? "border-sky-500/60 bg-sky-500/10 text-sky-400 shadow-lg shadow-sky-500/10"
                                : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700"
                            }`}>
                            <div className="h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-black text-white shadow-sm"
                              style={{ background: a.color }}>{a.sym[0]}</div>
                            <span className="text-xs">{a.sym}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Available balance */}
                    <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-900/60 border border-slate-800">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                          style={{ background: asset.color }}>{asset.sym[0]}</div>
                        <span className="text-slate-400">Available Balance</span>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-black text-sm tabular-nums">{asset.balanceStr} <span className="text-slate-500">{asset.sym}</span></div>
                      </div>
                    </div>

                    {/* Network selector */}
                    <div>
                      <label className="text-xs text-slate-500 uppercase tracking-wide mb-2 block">Network</label>
                      <div className="relative">
                        <button onClick={() => setShowNetDrop(p => !p)}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition cursor-pointer">
                          <div>
                            <span className="text-white font-semibold text-sm">{network.label}</span>
                            <span className="text-slate-500 text-xs ml-2">· Fee: {network.feeStr}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-600 bg-slate-800 px-2 py-0.5 rounded-md">{network.time}</span>
                            <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${showNetDrop ? "rotate-180" : ""}`} />
                          </div>
                        </button>
                        <AnimatePresence>
                          {showNetDrop && (
                            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                              className="absolute top-full left-0 right-0 mt-1 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden z-20 shadow-2xl">
                              {NETWORKS[asset.sym].map((net) => (
                                <button key={net.id} onClick={() => { setNetwork(net); setShowNetDrop(false); setAddress(""); setAddrTouched(false); }}
                                  className={`w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800 transition cursor-pointer text-left border-b border-slate-800/50 last:border-0 ${network.id === net.id ? "bg-sky-500/5" : ""}`}>
                                  <div>
                                    <div className="text-white text-sm font-semibold">{net.label}</div>
                                    <div className="text-slate-500 text-xs">{net.time}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs text-rose-400 font-bold">Fee: {net.feeStr}</div>
                                    <div className="text-xs text-slate-600">Min: {net.min} {asset.sym}</div>
                                  </div>
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Withdrawal address */}
                    <div>
                      <label className="text-xs text-slate-500 uppercase tracking-wide mb-2 block">Destination Address</label>
                      <div className="relative">
                        <input type="text" value={address}
                          onChange={(e) => { setAddress(e.target.value); setAddrTouched(true); }}
                          placeholder={`Enter ${asset.sym} address (${network.id})`}
                          className={`w-full bg-slate-900/60 border rounded-2xl px-4 py-3.5 text-white text-sm outline-none transition font-mono placeholder:font-sans pr-10 ${
                            addrTouched && address
                              ? addrOk ? "border-emerald-500/40 focus:border-emerald-500/60" : "border-rose-500/50 focus:border-rose-500/70"
                              : "border-slate-800 focus:border-sky-500/50"
                          }`}
                        />
                        {addrTouched && address && (
                          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                            {addrOk
                              ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                              : <AlertTriangle className="h-4 w-4 text-rose-400" />}
                          </div>
                        )}
                      </div>
                      <AddressError show={addrTouched && address.length > 2 && !addrOk} />
                      {addrOk && address && (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Valid {network.id} address format
                        </motion.p>
                      )}
                    </div>

                    {/* Limits & fees info */}
                    <div className="grid grid-cols-3 gap-3 text-center">
                      {[
                        { label: "Min Withdraw", value: `${network.min} ${asset.sym}`  },
                        { label: "Network Fee",  value: network.feeStr                 },
                        { label: "Arrival",      value: network.time                   },
                      ].map((s) => (
                        <div key={s.label} className="rounded-2xl bg-slate-900/60 border border-slate-800 p-3">
                          <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-wide">{s.label}</div>
                          <div className="text-sm font-bold text-white">{s.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Warning */}
                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-500/8 border border-rose-500/20">
                      <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-rose-200/80 leading-relaxed">
                        Ensure the destination address supports the <strong>{network.label}</strong> network. Sending to the wrong network results in permanent fund loss.
                      </p>
                    </div>
                  </motion.div>

                ) : (
                  /* BANK WIRE FORM */
                  <motion.div key="bank" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="space-y-4">
                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-500/8 border border-blue-500/20 text-xs text-blue-200/80">
                      <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                      Bank withdrawals are processed in USD equivalent. Processing takes 1–3 business days. Minimum $50 USD.
                    </div>
                    {[
                      { label: "Bank Name",          state: bankName,    set: setBankName,    placeholder: "e.g. Bank of America" },
                      { label: "Account Holder Name",state: accountName, set: setAccountName, placeholder: "Full legal name"       },
                      { label: "IBAN / Account No.", state: iban,        set: setIban,        placeholder: "IBAN or account number" },
                      { label: "SWIFT / BIC Code",   state: swift,       set: setSwift,       placeholder: "e.g. BOFAUS3N"          },
                    ].map((f) => (
                      <div key={f.label}>
                        <label className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">{f.label}</label>
                        <input type="text" value={f.state} onChange={(e) => f.set(e.target.value)} placeholder={f.placeholder}
                          className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl px-4 py-3 text-white text-sm outline-none focus:border-sky-500/50 transition placeholder:text-slate-600" />
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* ── RIGHT PANEL ── */}
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
              className="space-y-4">

              {/* Amount card */}
              <div className="rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">Amount</div>
                    <div className="text-white font-bold text-sm">{method === "crypto" ? `${asset.sym} · ${network.id}` : "USD equivalent"}</div>
                  </div>
                  {method === "crypto" && (
                    <div className="text-right text-xs">
                      <div className="text-slate-500">Available</div>
                      <div className="text-sky-400 font-black tabular-nums">{asset.balanceStr}</div>
                    </div>
                  )}
                </div>
                <div className="p-5 space-y-4">
                  {/* Amount input */}
                  <div className="relative">
                    <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className={`w-full bg-slate-900 border rounded-2xl px-4 py-4 text-white text-2xl font-black outline-none transition tabular-nums pr-20 ${
                        amount && !amtOk ? "border-rose-500/50 focus:border-rose-500/70" : "border-slate-800 focus:border-sky-500/50"
                      }`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">{asset.sym}</span>
                  </div>

                  {/* Amount validation */}
                  <AnimatePresence>
                    {amount && !amtOk && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-2 text-xs text-rose-400">
                        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                        {numAmt < network.min
                          ? `Minimum withdrawal is ${network.min} ${asset.sym}`
                          : `Exceeds available balance (${asset.balanceStr} ${asset.sym})`}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* % quick buttons — crypto only */}
                  {method === "crypto" && (
                    <div className="grid grid-cols-4 gap-2">
                      {PCT_BTNS.map((p) => (
                        <motion.button key={p} whileTap={{ scale: 0.92 }} onClick={() => handlePct(p)}
                          className="py-2 rounded-xl text-xs font-bold border border-slate-800 bg-slate-900 text-slate-400 hover:border-sky-500/40 hover:text-sky-400 transition cursor-pointer">
                          {p}%
                        </motion.button>
                      ))}
                    </div>
                  )}

                  {/* Fee breakdown */}
                  {amount && numAmt > 0 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                      className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 space-y-2.5">
                      {[
                        { label: "You Send",     value: `${amount} ${asset.sym}`,                              color: "text-white"        },
                        { label: "Network Fee",  value: `- ${network.feeStr}`,                                  color: "text-rose-400"     },
                        { label: "You Receive",  value: `${Math.max(0, receive).toFixed(asset.sym === "USDT" || method === "bank" ? 2 : 6)} ${asset.sym}`, color: "text-emerald-400" },
                      ].map((r) => (
                        <div key={r.label} className="flex justify-between text-sm">
                          <span className="text-slate-500">{r.label}</span>
                          <span className={`font-bold tabular-nums ${r.color}`}>{r.value}</span>
                        </div>
                      ))}
                      <div className="border-t border-slate-800 pt-2.5 flex justify-between items-center">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Clock className="h-3 w-3" /> Est. arrival: {network.time}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-emerald-400">
                          <Zap className="h-3 w-3" /> Fast
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Submit button */}
                  <motion.button whileHover={canSubmit ? { scale: 1.02 } : {}} whileTap={canSubmit ? { scale: 0.98 } : {}}
                    onClick={() => canSubmit && setShowConfirm(true)}
                    disabled={!canSubmit}
                    className={`w-full py-4 rounded-2xl font-black text-sm transition cursor-pointer ${
                      canSubmit
                        ? "bg-sky-500 text-black hover:bg-sky-400 shadow-lg shadow-sky-500/25"
                        : "bg-slate-800 text-slate-500 cursor-not-allowed"
                    }`}>
                    {method === "crypto"
                      ? (!address ? "Enter destination address" : !addrOk ? "Invalid address" : !amount ? "Enter amount" : !amtOk ? "Invalid amount" : "Submit Withdrawal →")
                      : (!bankName || !accountName || !iban || !swift ? "Fill in bank details" : !amount ? "Enter amount" : "Submit Withdrawal →")
                    }
                  </motion.button>
                </div>
              </div>

              {/* Trust badges */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Shield,       label: "Secure",    sub: "256-bit SSL",   color: "text-emerald-400" },
                  { icon: Lock,         label: "Encrypted", sub: "End-to-end",    color: "text-blue-400"    },
                  { icon: Globe,        label: "Global",    sub: "100+ networks", color: "text-sky-400"   },
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
              </div>

              {/* Recent withdrawals */}
              <div className="rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-white font-bold text-sm flex items-center gap-2">
                    <ArrowDownLeft className="h-4 w-4 text-sky-400" /> Recent Withdrawals
                  </h3>
                  <span className="text-xs text-slate-600">{RECENT.length} records</span>
                </div>
                <div className="divide-y divide-slate-800/60">
                  {RECENT.map((r, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.07 }}
                      className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] font-black text-white"
                          style={{ color: ASSETS.find(a => a.sym === r.asset)?.color }}>
                          {r.asset[0]}
                        </div>
                        <div>
                          <div className="text-white text-xs font-bold">{r.amount} {r.asset}</div>
                          <div className="text-slate-600 text-[10px]">{r.addr} · {r.network}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${
                          r.status === "Completed" ? "bg-emerald-500/10 text-emerald-400" : "bg-sky-500/10 text-sky-400"
                        }`}>{r.status}</div>
                        <div className="text-slate-600 text-[10px] mt-0.5">{r.date}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-2 text-xs text-slate-600">
                <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                <span>Withdrawals are reviewed by our security team. First-time withdrawals may take longer for verification.</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Confirmation modal */}
      <AnimatePresence>
        {showConfirm && (
          <ConfirmModal
            details={{
              asset:   asset.sym,
              network: network.label,
              address,
              amount,
              feeStr:  network.feeStr,
              receive: Math.max(0, receive).toFixed(asset.sym === "USDT" ? 2 : 6),
              time:    network.time,
            }}
            onConfirm={handleConfirm}
            onClose={() => setShowConfirm(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
