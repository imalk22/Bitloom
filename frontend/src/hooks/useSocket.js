import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import useTradingStore from '../store/tradingStore';

let socket = null;

export default function useSocket() {
  const { symbol, setTicker, setOrderBook, addTrade } = useTradingStore();
  const prevSymbol = useRef('');

  useEffect(() => {
    if (!socket) {
      socket = io('http://localhost:3001', { transports: ['websocket'] });
    }

    if (prevSymbol.current !== symbol) {
      prevSymbol.current = symbol;
      socket.emit('subscribe', { symbol });
    }

    socket.on('ticker', setTicker);
    socket.on('orderbook', setOrderBook);
    socket.on('trade', addTrade);

    return () => {
      socket.off('ticker', setTicker);
      socket.off('orderbook', setOrderBook);
      socket.off('trade', addTrade);
    };
  }, [symbol, setTicker, setOrderBook, addTrade]);
}
