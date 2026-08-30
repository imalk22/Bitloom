import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, loadTrades, saveTrade } from "../firebase";
import { API_BASE } from "../config";
import { useBinancePrices } from "../hooks/useBinancePrices";
import { PAIRS } from "../lib/market";

const TradingContext = createContext(null);

/**
 * Balance is owned by the backend. Firestore rules deny the browser direct
 * access to users/{uid}, so reading it with the client SDK always fails —
 * balance must come from /api/me, which reads through the Admin SDK.
 */
async function fetchMe(user) {
  const token = await user.getIdToken();
  const res = await fetch(`${API_BASE}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Could not load balance (HTTP ${res.status})`);
  return data;
}

export function TradingProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [frozen, setFrozen] = useState(false);
  const [balanceError, setBalanceError] = useState("");
  const [tradeHistory, setTradeHistory] = useState([]);
  const [authReady, setAuthReady] = useState(false);
  const binancePrices = useBinancePrices();

  const livePairs = useMemo(
    () =>
      PAIRS.map((p) => ({
        ...p,
        price: binancePrices[p.symbol]?.price ?? p.price,
        change: binancePrices[p.symbol]?.change ?? p.change,
      })),
    [binancePrices]
  );

  /** Pull the authoritative balance from the backend. */
  const refreshBalance = useCallback(async (user = auth.currentUser) => {
    if (!user) return null;
    try {
      const me = await fetchMe(user);
      setBalance(Number(me.balance) || 0);
      setFrozen(!!me.frozen);
      setBalanceError("");
      return me;
    } catch (err) {
      // Don't silently show $0 — that hides admin credits and backend outages alike.
      setBalanceError(err.message);
      console.error("[balance] refresh failed:", err.message);
      return null;
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (!user) {
        setBalance(0);
        setFrozen(false);
        setBalanceError("");
        setTradeHistory([]);
        setAuthReady(true);
        return;
      }

      await refreshBalance(user);

      // Kept separate: a trade-history failure must never reset the balance.
      try {
        setTradeHistory((await loadTrades(user.uid)) || []);
      } catch {
        setTradeHistory([]);
      }

      setAuthReady(true);
    });
    return () => unsub();
  }, [refreshBalance]);

  // An admin can credit the account while this tab sits open — re-check on return.
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") refreshBalance();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refreshBalance]);

  const logout = async () => {
    await signOut(auth);
  };

  const handleTradeDone = (trade) => {
    const pnl = Number(trade?.pnl);
    if (Number.isFinite(pnl)) {
      // Optimistic; the server is still the source of truth.
      setBalance((b) => +(b + pnl).toFixed(2));
    }
    if (currentUser) saveTrade(currentUser.uid, trade).catch(() => {});
    setTradeHistory((prev) => [trade, ...prev]);
    refreshBalance();
  };

  const value = {
    currentUser,
    isLoggedIn: !!currentUser,
    authReady,
    balance,
    setBalance,
    frozen,
    balanceError,
    refreshBalance,
    tradeHistory,
    livePairs,
    logout,
    handleTradeDone,
  };

  return <TradingContext.Provider value={value}>{children}</TradingContext.Provider>;
}

export function useTrading() {
  const ctx = useContext(TradingContext);
  if (!ctx) throw new Error("useTrading must be used within TradingProvider");
  return ctx;
}
