# NovaX Full UI Redesign — Design Spec

**Date:** 2026-08-24  
**Product:** NovaX — Professional Trading Platform  
**Status:** Approved direction (user: full rebuild, professional quality, creative license on details)

---

## 1. Goals

Rebuild the entire NovaX web UI from scratch into a **professional exchange-grade product**, not a cosmetic reskin.

- Every surface (landing, auth, money flows, markets, portfolio, terminal) shares one coherent design system.
- Terminal feels like Binance / Bybit / Coinbase Advanced — dense, calm, trustworthy.
- Marketing and money flows feel institutional (light, clear, low noise).
- Keep existing backend behavior: Firebase auth, Firestore balances/trades, Socket.IO chat/admin, binary resolve API, Binance live prices.

**Non-goals:** Real spot/futures matching engine, new backend features, mobile native apps, light/dark theme toggle (dark app + light marketing is enough).

---

## 2. Decisions locked

| Decision | Choice |
|----------|--------|
| Scope | Full site rebuild (all surfaces equal quality) |
| Visual model | Hybrid: light marketing/money + dark terminal/app |
| Trade UX | Exchange-style Spot/Futures ticket; Binary as secondary mode |
| Brand | Keep **NovaX** name; full visual rebrand |
| Accent | Electric blue `#3b82f6` |
| Engineering | Full UI architecture rebuild (split monolith, real routes) |

---

## 3. Information architecture

### Shells

1. **MarketingShell (light)** — public brand pages  
2. **AuthMoneyShell (light forms)** — login, signup, deposit, withdraw, checkout, contact-care  
3. **AppShell (dark)** — markets, portfolio, profile (top nav + padded content)  
4. **TerminalShell (dark, full viewport)** — `/trade/:symbol`

### Routes

| Route | Shell | Purpose |
|-------|-------|---------|
| `/` | Marketing | Landing |
| `/about` | Marketing | Product story (honest copy only) |
| `/login`, `/signup` | AuthMoney | Firebase auth |
| `/deposit`, `/withdraw`, `/checkout`, `/contact-care` | AuthMoney | Money flows (logic preserved) |
| `/markets` | App | Full markets table |
| `/portfolio` | App | Equity, holdings, activity |
| `/profile` | App | Account, referral, links |
| `/trade` → `/trade/:symbol` | Terminal | Trading workspace (default `BTCUSDT`) |

Replace in-app `activePage` state navigation with URL routes.

Admin P&L panel and live chat remain available; restyle chrome to match tokens. Do not remove functionality.

---

## 4. Visual system

### Color tokens

| Token | Hex | Use |
|-------|-----|-----|
| `--bg` | `#0b0e11` | Dark canvas |
| `--panel` | `#12161c` | Header, panels |
| `--elevated` | `#1e2329` | Modals, inputs |
| `--border` | `#2b3139` | Hairlines only |
| `--text` | `#eaecef` | Primary text (dark) |
| `--muted` | `#848e9c` | Labels, secondary |
| `--accent` | `#3b82f6` | Brand CTAs, active nav, focus |
| `--up` | `#0ecb81` | Gains, bids, Buy fill |
| `--down` | `#f6465d` | Losses, asks, Sell fill |
| `--mkt-bg` | `#f8fafc` | Marketing canvas |
| `--mkt-text` | `#0a2540` | Marketing primary text |
| `--mkt-muted` | `#5b6b7c` | Marketing secondary |

**Rules**
- Green/red only for market semantics (price, PnL, Buy/Sell fills).
- Success/error toasts use accent/neutral — not green/red.
- Accent is scarce: logo, primary CTA, selected nav, focus rings.
- Terminal radius: `0–4px`. Marketing/auth cards: `8px` max.
- No glassmorphism, multi-layer glows, or neon gradients inside the terminal.

### Typography

- **UI:** IBM Plex Sans (400/500/600/700)
- **Numbers:** IBM Plex Sans or IBM Plex Mono with `font-variant-numeric: tabular-nums`
- Chart/book/blotter: 11–13px; avoid Inter (current default)

### Motion

- Tick flash: 150–250ms background opacity pulse on price cells
- Page transitions: subtle opacity/translate only on marketing; terminal prefers instant
- Respect `prefers-reduced-motion`

---

## 5. Terminal layout (`/trade/:symbol`)

```
┌─ TopBar 48px: Logo | Trade Markets Portfolio | Symbol+meta | Live | Balance | Account ─┐
├─ Left 260px ─┬─ Chart (flex) ──────────────────────────┬─ Ticket 300px ──────────────┤
│ Markets      │ TF toolbar                               │ Spot | Futures | Binary     │
│ Order book   │ lightweight-charts                       │ Buy/Sell · size · % · CTA   │
│ Trades       │                                          │                             │
├──────────────┴──────────────────────────────────────────┴─────────────────────────────┤
│ Blotter ~200px: Positions | Open orders | History | Binary                            │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

- Chart flush to panel edges (no card chrome).
- Left column tabs: Markets | Order book | Recent trades.
- Ticket modes:
  - **Spot / Futures:** exchange chrome (Buy/Sell, size, leverage on Futures). Simulated fill UX unless real engine exists.
  - **Binary:** existing Up/Down + duration + payout engine (real).
- Connection status badge from Socket.IO: live / reconnecting / offline.
- Replace TradingView iframe with **lightweight-charts** (already in dependencies) themed to tokens.

---

## 6. Other surfaces

### Landing `/`
- Light canvas; NovaX wordmark as hero-level brand.
- One headline, one supporting sentence, one CTA group (“Launch terminal” / “Create account”).
- Dominant visual: dark terminal preview (screenshot-style mock of real UI).
- No stat strips, pill clusters, or floating badges on the hero.

### Markets `/markets`
- Dense table: Pair | Last | 24h% | High | Low | Volume
- Search + favorites; row → `/trade/:symbol`
- Row height 32–36px; tabular nums; signed % with color + sign

### Portfolio `/portfolio`
- Equity (large) → day PnL → Available / In use → Holdings table → Recent activity
- Deposit / Withdraw CTAs in header actions

### Auth
- Centered card `max-w-md`; email/password + Google; inline errors; loading on CTA

### Money flows
- Preserve existing deposit/withdraw/checkout/contact-care logic
- Restyle to light institutional forms; clearer step indicator; no demo clutter in chrome

### About
- Honest product copy only — do not advertise copy trading / features that are not built

---

## 7. Component architecture

Break `src/App.jsx` monolith into:

```
src/
  styles/tokens.css          # CSS variables
  layouts/
    MarketingShell.jsx
    AuthMoneyShell.jsx
    AppShell.jsx
    TerminalShell.jsx
  components/
    brand/Logo.jsx
    nav/TopBar.jsx
    market/MarketsTable.jsx, Watchlist.jsx, OrderBook.jsx, TradesTape.jsx
    chart/CandleChart.jsx, ChartToolbar.jsx
    trade/OrderTicket.jsx, BinaryTicket.jsx, Blotter.jsx
    ui/Button.jsx, Input.jsx, Tabs.jsx, Badge.jsx, Toast.jsx, ConnectionStatus.jsx
  pages/
    LandingPage.jsx
    AboutPage.jsx
    LoginPage.jsx
    SignupPage.jsx
    MarketsPage.jsx
    PortfolioPage.jsx
    TradePage.jsx
    ProfilePage.jsx
    DepositPage.jsx          # restyle existing
    WithdrawPage.jsx
    CheckoutPage.jsx
    ContactCarePage.jsx
  hooks/
    useBinancePrices.js      # extract from App
    useAuth.js
    useSocket.js
  firebase.js                # keep
  socket.js                  # keep
  main.jsx                   # route table
```

Preserve business logic extraction carefully: balances, binary resolve, admin modes, chat widget.

---

## 8. Data / integration contracts

- **Firebase:** guard trade/portfolio/deposit/withdraw/profile; marketing public; post-login → last symbol or `/trade/BTCUSDT`
- **Binance WS:** drive last price, 24h change, chart updates
- **Socket.IO:** chat + admin; header connection badge
- **Binary:** existing `/api/trade/resolve` flow unchanged; UI lives under Binary ticket + blotter tab
- **Spot/Futures ticket:** UI-complete; label simulated fills clearly in UI microcopy if not wired to a real engine

---

## 9. Quality bar (“professional”)

| Pro | Avoid |
|-----|--------|
| Hairline panels, aligned dense grid | Glass cards, glow stacks |
| Tabular numbers, stable columns | Jumping proportional digits |
| One accent, scarce | Neon rainbow CTAs |
| Live/stale feed indicator | Silent disconnect |
| Honest empty states | Fake social proof / unimplemented feature claims |
| 44px touch targets on mobile nav | Tiny icon-only hits |

Responsive: terminal may stack or prioritize chart+ticket on narrow screens; markets/portfolio remain usable tables with horizontal scroll if needed.

---

## 10. Implementation phases

1. **Foundation** — tokens, fonts, shells, router, Logo  
2. **Marketing + Auth** — landing, about, login, signup  
3. **App pages** — markets, portfolio, profile  
4. **Terminal** — chart, ticket modes, blotter, watchlist/book  
5. **Money flows** — restyle deposit/withdraw/checkout/contact-care  
6. **Polish** — chat/admin chrome, motion, connection badge, empty/error states, responsive pass  

Each phase must leave the app runnable (`npm run dev`).

---

## 11. Out of scope (explicit)

- Building a real CEX matching engine  
- Replacing Firebase or backend admin P&L semantics  
- Multi-theme user toggle  
- Rewriting `backend/` unless required for UI contracts  

---

## Spec self-review

- No TBD placeholders on core decisions  
- Hybrid model consistent across IA and visual system  
- Spot/Futures clearly marked as chrome; Binary remains real  
- Scope is large but phased; one product, one design system  
