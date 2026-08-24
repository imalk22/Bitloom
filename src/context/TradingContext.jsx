import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, loadTrades, loadUserProfile, saveTrade, updateUserBalance } from "../firebase";
import { useBinancePrices } from "../hooks/useBinancePrices";
import { PAIRS } from "../lib/market";

const TradingContext = createContext(null);

export function TradingProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [balance, setBalance] = useState(0);
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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const profile = await loadUserProfile(user.uid);
          setBalance(profile?.balance || 0);
          const trades = await loadTrades(user.uid);
          setTradeHistory(trades || []);
        } catch {
          setBalance(0);
          setTradeHistory([]);
        }
      } else {
        setBalance(0);
        setTradeHistory([]);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  const handleTradeDone = (trade) => {
    setBalance((b) => {
      const next = +(b + trade.pnl).toFixed(2);
      if (currentUser) {
        saveTrade(currentUser.uid, trade);
        updateUserBalance(currentUser.uid, next);
      }
      return next;
    });
    setTradeHistory((prev) => [trade, ...prev]);
  };

  const value = {
    currentUser,
    isLoggedIn: !!currentUser,
    authReady,
    balance,
    setBalance,
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
