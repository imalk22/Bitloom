import { useEffect, useRef, useState } from 'react';
import useTradingStore from '../store/tradingStore';

const TV_SYMBOLS = {
  BTCUSDT:  'BINANCE:BTCUSDT.P',
  ETHUSDT:  'BINANCE:ETHUSDT.P',
  BNBUSDT:  'BINANCE:BNBUSDT.P',
  SOLUSDT:  'BINANCE:SOLUSDT.P',
  XRPUSDT:  'BINANCE:XRPUSDT.P',
  DOGEUSDT: 'BINANCE:DOGEUSDT.P',
  ADAUSDT:  'BINANCE:ADAUSDT.P',
  AVAXUSDT: 'BINANCE:AVAXUSDT.P',
};

// Load TV script exactly once, return a promise
let tvReady = null;
function loadTV() {
  if (!tvReady) {
    tvReady = new Promise((resolve, reject) => {
      if (window.TradingView) { resolve(); return; }
      const s = document.createElement('script');
      s.src = 'https://s3.tradingview.com/tv.js';
      s.onload  = () => resolve();
      s.onerror = () => reject(new Error('TradingView script failed to load'));
      document.head.appendChild(s);
    });
  }
  return tvReady;
}

let uid = 0;

export default function Chart() {
  const { symbol } = useTradingStore();
  const wrapperRef  = useRef(null);
  const widgetRef   = useRef(null);
  const containerIdRef = useRef(`tv_${++uid}`);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    // Give a fresh container id on each symbol change so there are no stale DOM refs
    containerIdRef.current = `tv_${++uid}`;
    const containerId = containerIdRef.current;
    const tvSymbol = TV_SYMBOLS[symbol] || `BINANCE:${symbol}.P`;

    // Destroy previous widget
    if (widgetRef.current) {
      try { widgetRef.current.remove(); } catch (_) {}
      widgetRef.current = null;
    }

    // Clear wrapper and inject fresh target div
    if (wrapperRef.current) {
      wrapperRef.current.innerHTML =
        `<div id="${containerId}" style="width:100%;height:100%;"></div>`;
    }

    loadTV()
      .then(() => {
        if (cancelled || !wrapperRef.current) return;
        if (!document.getElementById(containerId)) return;

        widgetRef.current = new window.TradingView.widget({
          autosize:            true,
          symbol:              tvSymbol,
          interval:            '1',
          timezone:            'Etc/UTC',
          theme:               'dark',
          style:               '1',
          locale:              'en',
          toolbar_bg:          '#161a1e',
          enable_publishing:   false,
          allow_symbol_change: false,
          save_image:          false,
          hide_side_toolbar:   false,
          withdateranges:      true,
          container_id:        containerId,
        });

        setLoading(false);
      })
      .catch(err => {
        if (!cancelled) { setError(err.message); setLoading(false); }
      });

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return (
    // Must be `position:relative` so the absolute children fill it correctly
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#0b0e11' }}>
      {/* TV mounts its iframe inside this wrapper */}
      <div ref={wrapperRef} style={{ position: 'absolute', inset: 0 }} />

      {loading && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#0b0e11', color: '#848e9c', fontSize: 12,
          gap: 10, pointerEvents: 'none',
        }}>
          <div style={{
            width: 28, height: 28,
            border: '3px solid #2b3139',
            borderTopColor: '#f0b90b',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          Loading chart…
        </div>
      )}

      {error && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#0b0e11', color: '#f6465d', fontSize: 12, gap: 6,
        }}>
          <span style={{ fontSize: 24 }}>⚠</span>
          <span>Chart failed to load</span>
          <span style={{ color: '#848e9c' }}>{error}</span>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
