const axios = require('axios');
const WebSocket = require('ws');
const crypto = require('crypto');
const zlib = require('zlib');

class BingXExchange {
  constructor(apiKey, secretKey) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.baseUrl = 'https://open-api.bingx.com';
    this.wsUrl = 'wss://open-api-ws.bingx.com/market';
  }

  sign(params) {
    const qs = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
    return crypto.createHmac('sha256', this.secretKey || '').update(qs).digest('hex');
  }

  async pub(path, params = {}) {
    const res = await axios.get(`${this.baseUrl}${path}`, { params });
    return res.data;
  }

  async priv(method, path, params = {}) {
    if (!this.apiKey || !this.secretKey) throw new Error('API keys required');
    const all = { ...params, timestamp: Date.now() };
    const signature = this.sign(all);
    const cfg = {
      headers: { 'X-BX-APIKEY': this.apiKey },
      params: { ...all, signature },
    };
    const url = `${this.baseUrl}${path}`;
    const res = method === 'GET'
      ? await axios.get(url, cfg)
      : method === 'DELETE'
        ? await axios.delete(url, cfg)
        : await axios.post(url, null, cfg);
    return res.data;
  }

  normSym(s) {
    if (s.includes('-')) return s.toUpperCase();
    const base = s.replace('USDT', '').replace('BUSD', '');
    return `${base}-USDT`;
  }

  async getTicker(symbol) {
    const s = this.normSym(symbol);
    const res = await this.pub('/openApi/swap/v2/quote/ticker', { symbol: s });
    const d = res.data;
    return {
      symbol: s,
      price: parseFloat(d.lastPrice),
      change: parseFloat(d.priceChange),
      changePercent: parseFloat(d.priceChangePercent),
      high: parseFloat(d.highPrice),
      low: parseFloat(d.lowPrice),
      volume: parseFloat(d.volume),
      quoteVolume: parseFloat(d.quoteVolume),
    };
  }

  async getOrderBook(symbol, limit = 20) {
    const s = this.normSym(symbol);
    const res = await this.pub('/openApi/swap/v2/quote/depth', { symbol: s, limit });
    const d = res.data;
    return {
      bids: (d.bids || []).map(([p, q]) => ({ price: parseFloat(p), qty: parseFloat(q) })),
      asks: (d.asks || []).map(([p, q]) => ({ price: parseFloat(p), qty: parseFloat(q) })),
    };
  }

  async getRecentTrades(symbol, limit = 30) {
    const s = this.normSym(symbol);
    const res = await this.pub('/openApi/swap/v2/quote/trades', { symbol: s, limit });
    return (res.data || []).map(t => ({
      price: parseFloat(t.price),
      qty: parseFloat(t.qty),
      time: t.time,
      isBuyerMaker: t.side === 'sell',
    }));
  }

  async getPositions() {
    const res = await this.priv('GET', '/openApi/swap/v2/user/positions');
    return (res.data || [])
      .filter(p => parseFloat(p.positionAmt) !== 0)
      .map(p => ({
        symbol: p.symbol,
        side: p.positionSide,
        size: Math.abs(parseFloat(p.positionAmt)),
        entryPrice: parseFloat(p.avgPrice),
        markPrice: parseFloat(p.markPrice),
        pnl: parseFloat(p.unrealizedProfit),
        leverage: parseInt(p.leverage),
        liquidationPrice: parseFloat(p.liquidationPrice),
        margin: parseFloat(p.initialMargin),
      }));
  }

  async getBalance() {
    const res = await this.priv('GET', '/openApi/swap/v2/user/balance');
    const b = res.data?.balance || {};
    return {
      total: parseFloat(b.balance || 0),
      available: parseFloat(b.availableMargin || 0),
      unrealizedPnl: parseFloat(b.unrealizedProfit || 0),
    };
  }

  async getOpenOrders(symbol) {
    const params = symbol ? { symbol: this.normSym(symbol) } : {};
    const res = await this.priv('GET', '/openApi/swap/v2/trade/openOrders', params);
    return (res.data?.orders || []).map(o => ({
      orderId: String(o.orderId),
      symbol: o.symbol,
      side: o.side,
      type: o.type,
      price: parseFloat(o.price),
      qty: parseFloat(o.origQty),
      filled: parseFloat(o.executedQty),
      status: o.status,
      time: o.time,
    }));
  }

  async placeOrder({ symbol, side, type, quantity, price, reduceOnly }) {
    const s = this.normSym(symbol);
    const params = {
      symbol: s,
      side: side.toUpperCase(),
      type: type.toUpperCase(),
      quantity: String(quantity),
      positionSide: side.toUpperCase() === 'BUY' ? 'LONG' : 'SHORT',
      ...(type.toUpperCase() === 'LIMIT' && { price: String(price) }),
      ...(reduceOnly && { reduceOnly: 'true' }),
    };
    return await this.priv('POST', '/openApi/swap/v2/trade/order', params);
  }

  async cancelOrder(symbol, orderId) {
    return await this.priv('DELETE', '/openApi/swap/v2/trade/order', {
      symbol: this.normSym(symbol),
      orderId,
    });
  }

  async setLeverage(symbol, leverage) {
    return await this.priv('POST', '/openApi/swap/v2/trade/leverage', {
      symbol: this.normSym(symbol),
      side: 'LONG',
      leverage,
    });
  }

  subscribeToStream(symbol, callback) {
    const s = this.normSym(symbol);
    const ws = new WebSocket(this.wsUrl);
    let pingTimer;

    ws.on('open', () => {
      ['depth20', 'trade', 'ticker'].forEach(t => {
        ws.send(JSON.stringify({ id: `${t}_${Date.now()}`, reqType: 'sub', dataType: `${s}@${t}` }));
      });
      pingTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ ping: Date.now() }));
      }, 20000);
    });

    ws.on('message', raw => {
      zlib.gunzip(raw, (err, buf) => {
        if (err) return;
        try {
          const msg = JSON.parse(buf.toString());
          if (!msg.dataType) return;

          if (msg.dataType.includes('depth')) {
            callback('orderbook', {
              bids: (msg.data?.bids || []).map(([p, q]) => ({ price: parseFloat(p), qty: parseFloat(q) })),
              asks: (msg.data?.asks || []).map(([p, q]) => ({ price: parseFloat(p), qty: parseFloat(q) })),
            });
          } else if (msg.dataType.includes('trade')) {
            const t = msg.data || {};
            callback('trade', {
              price: parseFloat(t.p || t.price || 0),
              qty: parseFloat(t.q || t.qty || 0),
              time: t.T || t.time || Date.now(),
              isBuyerMaker: t.m || false,
            });
          } else if (msg.dataType.includes('ticker')) {
            const d = msg.data || {};
            callback('ticker', {
              price: parseFloat(d.c || d.lastPrice || 0),
              change: parseFloat(d.p || 0),
              changePercent: parseFloat(d.P || 0),
              high: parseFloat(d.h || 0),
              low: parseFloat(d.l || 0),
              volume: parseFloat(d.v || 0),
              quoteVolume: parseFloat(d.q || 0),
            });
          }
        } catch (_) {}
      });
    });

    ws.on('error', e => console.error('[BingX WS]', e.message));
    ws.on('close', () => clearInterval(pingTimer));

    return {
      close: () => {
        clearInterval(pingTimer);
        if (ws.readyState === WebSocket.OPEN) ws.close();
      },
    };
  }
}

module.exports = BingXExchange;
