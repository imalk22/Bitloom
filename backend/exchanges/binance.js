const axios = require('axios');
const WebSocket = require('ws');
const crypto = require('crypto');

class BinanceExchange {
  constructor(apiKey, secretKey, testnet = false) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.baseUrl = testnet
      ? 'https://testnet.binancefuture.com'
      : 'https://fapi.binance.com';
    this.wsBase = testnet
      ? 'wss://stream.binancefuture.com'
      : 'wss://fstream.binance.com';
  }

  sign(params) {
    const qs = new URLSearchParams(params).toString();
    const sig = crypto.createHmac('sha256', this.secretKey || '').update(qs).digest('hex');
    return `${qs}&signature=${sig}`;
  }

  async pub(path, params = {}) {
    const res = await axios.get(`${this.baseUrl}${path}`, { params });
    return res.data;
  }

  async priv(method, path, params = {}) {
    if (!this.apiKey || !this.secretKey) throw new Error('API keys required');
    const all = { ...params, timestamp: Date.now() };
    const signed = this.sign(all);
    const url = `${this.baseUrl}${path}?${signed}`;
    const cfg = { headers: { 'X-MBX-APIKEY': this.apiKey } };
    const res = method === 'GET'
      ? await axios.get(url, cfg)
      : method === 'DELETE'
        ? await axios.delete(url, cfg)
        : await axios.post(url, null, cfg);
    return res.data;
  }

  normSym(s) { return s.replace('-', '').toUpperCase(); }

  async getTicker(symbol) {
    const s = this.normSym(symbol);
    const d = await this.pub('/fapi/v1/ticker/24hr', { symbol: s });
    return {
      symbol: s,
      price: parseFloat(d.lastPrice),
      change: parseFloat(d.priceChange),
      changePercent: parseFloat(d.priceChangePercent),
      high: parseFloat(d.highPrice),
      low: parseFloat(d.lowPrice),
      volume: parseFloat(d.volume),
      quoteVolume: parseFloat(d.quoteVolume),
      fundingRate: null,
      indexPrice: parseFloat(d.lastPrice),
    };
  }

  async getOrderBook(symbol, limit = 20) {
    const s = this.normSym(symbol);
    const d = await this.pub('/fapi/v1/depth', { symbol: s, limit });
    return {
      bids: d.bids.map(([p, q]) => ({ price: parseFloat(p), qty: parseFloat(q) })),
      asks: d.asks.map(([p, q]) => ({ price: parseFloat(p), qty: parseFloat(q) })),
    };
  }

  async getRecentTrades(symbol, limit = 30) {
    const s = this.normSym(symbol);
    const data = await this.pub('/fapi/v1/trades', { symbol: s, limit });
    return data.map(t => ({
      price: parseFloat(t.price),
      qty: parseFloat(t.qty),
      time: t.time,
      isBuyerMaker: t.isBuyerMaker,
    }));
  }

  async getPositions() {
    const data = await this.priv('GET', '/fapi/v2/positionRisk');
    return data
      .filter(p => parseFloat(p.positionAmt) !== 0)
      .map(p => ({
        symbol: p.symbol,
        side: parseFloat(p.positionAmt) > 0 ? 'LONG' : 'SHORT',
        size: Math.abs(parseFloat(p.positionAmt)),
        entryPrice: parseFloat(p.entryPrice),
        markPrice: parseFloat(p.markPrice),
        pnl: parseFloat(p.unRealizedProfit),
        leverage: parseInt(p.leverage),
        liquidationPrice: parseFloat(p.liquidationPrice),
        margin: parseFloat(p.isolatedMargin),
      }));
  }

  async getBalance() {
    const data = await this.priv('GET', '/fapi/v2/balance');
    const usdt = data.find(b => b.asset === 'USDT') || {};
    return {
      total: parseFloat(usdt.balance || 0),
      available: parseFloat(usdt.availableBalance || 0),
      unrealizedPnl: parseFloat(usdt.crossUnPnl || 0),
    };
  }

  async getOpenOrders(symbol) {
    const params = symbol ? { symbol: this.normSym(symbol) } : {};
    const data = await this.priv('GET', '/fapi/v1/openOrders', params);
    return data.map(o => ({
      orderId: String(o.orderId),
      symbol: o.symbol,
      side: o.side,
      type: o.type,
      price: parseFloat(o.price),
      qty: parseFloat(o.origQty),
      filled: parseFloat(o.executedQty),
      status: o.status,
      time: o.time,
      reduceOnly: o.reduceOnly,
    }));
  }

  async placeOrder({ symbol, side, type, quantity, price, reduceOnly, positionSide }) {
    const s = this.normSym(symbol);
    const params = {
      symbol: s,
      side: side.toUpperCase(),
      type: type.toUpperCase(),
      quantity: String(quantity),
      ...(type.toUpperCase() === 'LIMIT' && { price: String(price), timeInForce: 'GTC' }),
      ...(reduceOnly && { reduceOnly: 'true' }),
      ...(positionSide && { positionSide }),
    };
    return await this.priv('POST', '/fapi/v1/order', params);
  }

  async cancelOrder(symbol, orderId) {
    return await this.priv('DELETE', '/fapi/v1/order', {
      symbol: this.normSym(symbol),
      orderId,
    });
  }

  async setLeverage(symbol, leverage) {
    return await this.priv('POST', '/fapi/v1/leverage', {
      symbol: this.normSym(symbol),
      leverage,
    });
  }

  subscribeToStream(symbol, callback) {
    const s = this.normSym(symbol).toLowerCase();
    const streams = [`${s}@depth20@100ms`, `${s}@aggTrade`, `${s}@ticker`].join('/');
    const ws = new WebSocket(`${this.wsBase}/stream?streams=${streams}`);

    ws.on('message', raw => {
      try {
        const msg = JSON.parse(raw);
        const name = msg.stream || '';
        const d = msg.data || msg;

        if (name.includes('depth')) {
          callback('orderbook', {
            bids: (d.b || []).map(([p, q]) => ({ price: parseFloat(p), qty: parseFloat(q) })),
            asks: (d.a || []).map(([p, q]) => ({ price: parseFloat(p), qty: parseFloat(q) })),
          });
        } else if (name.includes('aggTrade')) {
          callback('trade', {
            price: parseFloat(d.p),
            qty: parseFloat(d.q),
            time: d.T,
            isBuyerMaker: d.m,
          });
        } else if (name.includes('ticker')) {
          callback('ticker', {
            price: parseFloat(d.c),
            change: parseFloat(d.p),
            changePercent: parseFloat(d.P),
            high: parseFloat(d.h),
            low: parseFloat(d.l),
            volume: parseFloat(d.v),
            quoteVolume: parseFloat(d.q),
          });
        }
      } catch (_) {}
    });

    ws.on('error', e => console.error('[Binance WS]', e.message));
    ws.on('close', () => console.log('[Binance WS] closed'));

    return { close: () => ws.readyState === WebSocket.OPEN && ws.close() };
  }
}

module.exports = BinanceExchange;
