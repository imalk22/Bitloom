import { create } from 'zustand';

const STARTING_BALANCE = 10000;

const useTradingStore = create((set, get) => ({
  exchange: 'binance',
  symbol: 'BTCUSDT',
  ticker: { price: 0, change: 0, changePercent: 0, high: 0, low: 0, volume: 0, quoteVolume: 0 },
  orderBook: { bids: [], asks: [] },
  recentTrades: [],

  // Mock paper trading account
  balance: STARTING_BALANCE,
  positions: [],
  orderHistory: [],
  leverage: 20,
  orderType: 'MARKET',
  side: 'buy',
  notification: null,

  setExchange: exchange => set({ exchange }),
  setSymbol: symbol => set({ symbol }),
  setTicker: ticker => set({ ticker }),
  setOrderBook: orderBook => set({ orderBook }),
  addTrade: trade => set(s => ({ recentTrades: [trade, ...s.recentTrades].slice(0, 50) })),
  setLeverage: leverage => set({ leverage }),
  setOrderType: orderType => set({ orderType }),
  setSide: side => set({ side }),

  notify: (msg, type = 'info') => {
    set({ notification: { msg, type } });
    setTimeout(() => set({ notification: null }), 4000);
  },

  placeOrder: ({ quantity, price }) => {
    const { symbol, side, orderType, leverage, balance, ticker } = get();
    const execPrice = orderType === 'MARKET' ? ticker.price : parseFloat(price);
    const size = parseFloat(quantity);

    if (!execPrice || !size || size <= 0) {
      get().notify('Enter a valid quantity', 'error');
      return false;
    }

    const notional = size * execPrice;
    const margin = notional / leverage;

    if (margin > balance) {
      get().notify('Insufficient balance', 'error');
      return false;
    }

    const position = {
      id: Date.now(),
      symbol,
      side: side === 'buy' ? 'LONG' : 'SHORT',
      size,
      entryPrice: execPrice,
      leverage,
      margin,
      notional,
      openTime: Date.now(),
    };

    set(s => ({
      balance: s.balance - margin,
      positions: [...s.positions, position],
    }));

    get().notify(
      `${position.side} ${size} ${symbol} @ $${execPrice.toFixed(2)} | ${leverage}x`,
      'success'
    );
    return true;
  },

  closePosition: (posId) => {
    const { positions, ticker } = get();
    const pos = positions.find(p => p.id === posId);
    if (!pos) return;

    const currentPrice = ticker.price || pos.entryPrice;
    const pnl = pos.side === 'LONG'
      ? (currentPrice - pos.entryPrice) * pos.size
      : (pos.entryPrice - currentPrice) * pos.size;

    const returned = pos.margin + pnl;

    set(s => ({
      balance: s.balance + returned,
      positions: s.positions.filter(p => p.id !== posId),
      orderHistory: [
        {
          id: pos.id,
          symbol: pos.symbol,
          side: pos.side,
          size: pos.size,
          entryPrice: pos.entryPrice,
          closePrice: currentPrice,
          pnl,
          leverage: pos.leverage,
          closeTime: Date.now(),
        },
        ...s.orderHistory,
      ].slice(0, 100),
    }));

    get().notify(
      `Closed ${pos.side} — PnL: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`,
      pnl >= 0 ? 'success' : 'error'
    );
  },

  resetAccount: () => {
    set({ balance: STARTING_BALANCE, positions: [], orderHistory: [] });
    get().notify('Account reset to $10,000', 'info');
  },
}));

export default useTradingStore;
