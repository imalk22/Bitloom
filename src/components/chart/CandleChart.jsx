import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries } from "lightweight-charts";

const TF_TO_INTERVAL = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "1h": "1h",
  "4h": "4h",
  "1D": "1d",
};

export default function CandleChart({ symbol, timeframe = "15m" }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#0b0e11" },
        textColor: "#848e9c",
        fontFamily: "IBM Plex Sans, system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: "#1e2329" },
        horzLines: { color: "#1e2329" },
      },
      rightPriceScale: { borderColor: "#2b3139" },
      timeScale: { borderColor: "#2b3139", timeVisible: true },
      crosshair: { mode: 0 },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#0ecb81",
      downColor: "#f6465d",
      borderVisible: false,
      wickUpColor: "#0ecb81",
      wickDownColor: "#f6465d",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver(() => {
      if (!containerRef.current) return;
      chart.applyOptions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const interval = TF_TO_INTERVAL[timeframe] || "15m";
    const base = symbol === "XAUUSDT" ? "https://fapi.binance.com/fapi/v1/klines" : "https://api.binance.com/api/v3/klines";

    async function load() {
      try {
        const res = await fetch(`${base}?symbol=${symbol}&interval=${interval}&limit=200`);
        const raw = await res.json();
        if (cancelled || !seriesRef.current || !Array.isArray(raw)) return;
        const data = raw.map((k) => ({
          time: Math.floor(k[0] / 1000),
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
        }));
        seriesRef.current.setData(data);
        chartRef.current?.timeScale().fitContent();
      } catch {
        /* keep empty chart */
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [symbol, timeframe]);

  return <div ref={containerRef} className="h-full w-full min-h-[240px]" />;
}
