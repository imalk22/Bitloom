import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle2, Mail, MessageCircle, ArrowLeft,
  CandlestickChart, Clock, Shield, Headphones, Send,
} from "lucide-react";
import { useState } from "react";

const CARD_COLORS = {
  amber: { bg: "bg-sky-500/10 border-sky-500/25",        icon: "text-sky-400",     btn: "bg-sky-500 text-black hover:bg-sky-400 shadow-sky-500/25" },
  blue:  { bg: "bg-blue-500/10 border-blue-500/25",      icon: "text-blue-400",    btn: "bg-blue-500 text-white hover:bg-blue-400 shadow-blue-500/25" },
  green: { bg: "bg-emerald-500/10 border-emerald-500/25", icon: "text-emerald-400", btn: "bg-emerald-500 text-black hover:bg-emerald-400 shadow-emerald-500/25" },
};

/** One contact channel. Its own component so the hook is not called inside a map callback. */
function ChannelCard({ channel, index, onAction }) {
  const [copied, setCopied] = useState(false);
  const Icon = channel.icon;
  const col = CARD_COLORS[channel.accent];

  const handle = () => {
    if (channel.copyText) {
      navigator.clipboard?.writeText(channel.copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }
    onAction?.(channel);
  };

  return (
    <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + index * 0.07 }}
      className={`flex items-center gap-4 p-4 rounded-2xl border ${col.bg}`}>
      <div className={`h-11 w-11 rounded-2xl bg-slate-900 flex items-center justify-center flex-shrink-0 ${col.icon}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white font-bold text-sm">{channel.title}</div>
        <div className="text-slate-400 text-xs truncate">{channel.desc}</div>
        <div className="flex items-center gap-1 text-slate-600 text-[10px] mt-0.5">
          <Clock className="h-2.5 w-2.5" /> {channel.detail}
        </div>
      </div>
      <motion.button
        type="button"
        whileTap={{ scale: 0.93 }}
        onClick={handle}
        className={`px-3.5 py-2 rounded-xl text-xs font-black shadow-lg transition cursor-pointer flex-shrink-0 ${col.btn}`}>
        {copied ? "Copied!" : channel.action}
      </motion.button>
    </motion.div>
  );
}

export default function ContactCarePage() {
  const { state }  = useLocation();
  const navigate   = useNavigate();
  const amount     = state?.amount      ?? "—";
  const method     = state?.method      ?? "—";
  const receive    = state?.receive     ?? "—";
  const currency   = state?.currency   ?? "USDT";
  const isWithdraw = state?.isWithdraw  ?? false;

  // The chat widget lives on the main app route, so flag it and navigate there.
  const startChat = () => {
    try { sessionStorage.setItem("bitloom_open_chat", "1"); } catch { /* storage blocked */ }
    navigate("/");
  };

  const channels = [
    {
      icon: MessageCircle,
      title: "Live Chat",
      desc: "Chat with a support agent",
      detail: "Usually responds in < 2 min",
      accent: "amber",
      action: "Start Chat",
    },
    {
      icon: Mail,
      title: "Email Support",
      desc: "support@bitloom.online",
      detail: "Responds within 24 hours",
      accent: "blue",
      action: "Copy Email",
      copyText: "support@bitloom.online",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0b0f17] text-white flex flex-col items-center justify-center p-4"
      style={{ backgroundImage: "radial-gradient(circle at 1px 1px,rgba(14,165,233,0.05) 1px,transparent 0)", backgroundSize: "40px 40px" }}>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 right-1/4 h-[500px] w-[500px] rounded-full bg-sky-500/[0.04] blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-[400px] w-[400px] rounded-full bg-sky-600/[0.03] blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="w-full max-w-lg relative z-10">

        <button onClick={() => navigate("/checkout")}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition text-sm mb-6 cursor-pointer">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {/* Success badge */}
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="flex justify-center mb-6">
          <div className="relative">
            <div className="h-20 w-20 rounded-full bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shadow-2xl shadow-sky-500/20">
              <CheckCircle2 className="h-9 w-9 text-sky-400" />
            </div>
            <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 rounded-full border border-sky-500/30" />
          </div>
        </motion.div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-white">{isWithdraw ? "Withdrawal Request Received" : "Deposit Request Received"}</h1>
          <p className="text-slate-500 text-sm mt-2 max-w-sm mx-auto">
            Your request is being processed. Contact our support team to {isWithdraw ? "finalize and process your withdrawal." : "finalize and accelerate your deposit."}
          </p>
        </div>

        {/* Order summary pill */}
        {amount !== "—" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-2xl bg-slate-950 border border-slate-800 px-5 py-4 flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <img src="/bitloom-logo.png" alt="Bitloom" className="h-10 w-10 rounded-xl object-cover ring-1 ring-sky-400/30" />
              <div>
                <div className="text-white font-bold text-sm">{isWithdraw ? amount : `$${Number(amount).toLocaleString()} via ${method}`}</div>
                <div className="text-slate-500 text-xs">{receive} {isWithdraw ? "sent to your wallet" : `${currency} credited to your account`}</div>
              </div>
            </div>
            <div className="text-xs text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-xl font-bold">
              Pending
            </div>
          </motion.div>
        )}

        {/* Contact channels */}
        <div className="space-y-3 mb-6">
          {channels.map((c, i) => (
            <ChannelCard key={c.title} channel={c} index={i} onAction={startChat} />
          ))}
        </div>

        {/* Status info */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
          className="rounded-2xl bg-slate-950 border border-slate-800 p-4 mb-6 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Headphones className="h-4 w-4 text-sky-400" />
            <span className="text-white text-sm font-bold">Support Hours</span>
            <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online now
            </div>
          </div>
          {[
            { day: "Monday – Friday", hours: "9:00 AM – 10:00 PM UTC" },
            { day: "Saturday",        hours: "10:00 AM – 6:00 PM UTC" },
            { day: "Sunday",          hours: "Live Chat only · 24/7"  },
          ].map((r) => (
            <div key={r.day} className="flex justify-between text-xs">
              <span className="text-slate-500">{r.day}</span>
              <span className="text-slate-300">{r.hours}</span>
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="space-y-3">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/")}
            className="w-full py-4 rounded-2xl bg-sky-500 text-black font-black text-sm hover:bg-sky-400 transition shadow-lg shadow-sky-500/25 cursor-pointer flex items-center justify-center gap-2">
            Return to Dashboard <Send className="h-4 w-4" />
          </motion.button>
          <button onClick={() => navigate(isWithdraw ? "/withdraw" : "/deposit")}
            className="w-full py-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 font-semibold text-sm hover:border-slate-700 hover:text-slate-300 transition cursor-pointer">
            {isWithdraw ? "Make Another Withdrawal" : "Make Another Deposit"}
          </button>
        </motion.div>

        {/* Security footer */}
        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-slate-700">
          <Shield className="h-3 w-3" />
          <span>All communications are encrypted and secure</span>
        </div>
      </motion.div>
    </div>
  );
}
