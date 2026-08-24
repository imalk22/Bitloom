import { useEffect, useState } from "react";

export function useBinancePrices() {
  const [prices, setPrices] = useState({});

  useEffect(() => {
    const spotStreams =
      "btcusdt@miniTicker/ethusdt@miniTicker/solusdt@miniTicker/bnbusdt@miniTicker/xrpusdt@miniTicker/adausdt@miniTicker/dogeusdt@miniTicker/avaxusdt@miniTicker/dotusdt@miniTicker";
    const spotWs = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${spotStreams}`);
    const xauWs = new WebSocket("wss://fstream.binance.com/stream?streams=xauusdt@miniTicker");

    const handle = (e) => {
      try {
        const { data: t } = JSON.parse(e.data);
        if (!t?.s || !t?.c) return;
        setPrices((prev) => ({
          ...prev,
          [t.s.toUpperCase()]: {
            price: parseFloat(t.c),
            change: Number.isNaN(parseFloat(t.P)) ? 0 : parseFloat(parseFloat(t.P).toFixed(2)),
          },
        }));
      } catch {
        /* ignore malformed ticks */
      }
    };

    spotWs.onmessage = handle;
    xauWs.onmessage = handle;
    spotWs.onerror = () => {};
    xauWs.onerror = () => {};

    return () => {
      spotWs.close();
      xauWs.close();
    };
  }, []);

  return prices;
}
