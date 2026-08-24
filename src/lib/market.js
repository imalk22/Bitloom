export const PAIRS = [
  { symbol: "BTCUSDT", name: "Bitcoin", price: 104832.6, change: 2.14, volume: "4.82B" },
  { symbol: "ETHUSDT", name: "Ethereum", price: 3864.25, change: 1.28, volume: "2.19B" },
  { symbol: "SOLUSDT", name: "Solana", price: 176.84, change: -0.72, volume: "829.4M" },
  { symbol: "XAUUSDT", name: "Gold Perp", price: 3368.4, change: 0.44, volume: "188.2M" },
  { symbol: "BNBUSDT", name: "BNB", price: 702.19, change: 3.08, volume: "642.7M" },
  { symbol: "XRPUSDT", name: "Ripple", price: 0.524, change: 1.89, volume: "1.24B" },
  { symbol: "ADAUSDT", name: "Cardano", price: 0.912, change: 1.54, volume: "312.1M" },
  { symbol: "DOGEUSDT", name: "Dogecoin", price: 0.184, change: -1.3, volume: "890.4M" },
  { symbol: "AVAXUSDT", name: "Avalanche", price: 35.24, change: 2.67, volume: "245.8M" },
  { symbol: "DOTUSDT", name: "Polkadot", price: 7.83, change: -0.41, volume: "118.6M" },
];

export const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1D"];

export const BINARY_DURATIONS = [
  { label: "30s", seconds: 30, pct: 15 },
  { label: "60s", seconds: 60, pct: 30 },
  { label: "90s", seconds: 90, pct: 45 },
  { label: "120s", seconds: 120, pct: 60 },
];

export function formatPrice(v) {
  if (v == null || Number.isNaN(v)) return "—";
  if (v >= 1000) return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (v >= 1) return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return v.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

export function formatUsd(v) {
  return Number(v || 0).toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function displaySymbol(symbol) {
  if (!symbol) return "";
  if (symbol.endsWith("USDT")) return `${symbol.slice(0, -4)}/USDT`;
  return symbol;
}
