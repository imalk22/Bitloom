# NovaX Full UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild NovaX’s entire web UI into a professional hybrid trading product (light marketing/money + dark terminal/app) with real routes, design tokens, and exchange-style terminal while preserving Firebase, Socket.IO, binary trading, and money-flow logic.

**Architecture:** Replace the `App.jsx` monolith with layout shells + page routes + focused components. CSS variables in `tokens.css` drive both light and dark shells. Terminal uses lightweight-charts; Spot/Futures are UI chrome; Binary keeps the real resolve engine.

**Tech Stack:** React 19, Vite 8, React Router 7, Tailwind 4, Framer Motion, Lucide, Firebase, Socket.IO client, lightweight-charts

**Spec:** `docs/superpowers/specs/2026-08-24-novax-ui-redesign-design.md`

---

## File map (target)

| Path | Responsibility |
|------|----------------|
| `src/styles/tokens.css` | Design tokens (dark + marketing) |
| `src/index.css` | Tailwind import + token import + base |
| `src/layouts/*.jsx` | MarketingShell, AuthMoneyShell, AppShell, TerminalShell |
| `src/components/**` | Logo, TopBar, chart, market, trade, ui primitives |
| `src/pages/**` | Route-level pages |
| `src/hooks/**` | useBinancePrices, useAuth, useSocket (extracted) |
| `src/main.jsx` | Full route table |
| `src/App.jsx` | Shrink to router outlet host or remove |
| Existing `firebase.js`, `socket.js`, money pages | Keep logic; restyle |

---

### Task 1: Design tokens + fonts

**Files:**
- Create: `src/styles/tokens.css`
- Modify: `src/index.css`, `index.html`

- [ ] **Step 1:** Add CSS variables from spec (bg, panel, accent `#3b82f6`, up/down, marketing colors)
- [ ] **Step 2:** Load IBM Plex Sans + IBM Plex Mono in `index.html`; set body font; `tabular-nums` utility class
- [ ] **Step 3:** Verify `npm run dev` still loads

---

### Task 2: Router + empty shells

**Files:**
- Create: `src/layouts/MarketingShell.jsx`, `AuthMoneyShell.jsx`, `AppShell.jsx`, `TerminalShell.jsx`
- Create: stub pages under `src/pages/`
- Modify: `src/main.jsx`

- [ ] **Step 1:** Define routes per spec (`/`, `/about`, `/login`, `/signup`, `/markets`, `/portfolio`, `/trade/:symbol`, money routes, `/profile`)
- [ ] **Step 2:** Shells render nav chrome only + `<Outlet />`
- [ ] **Step 3:** Temporary stubs so every route renders without crashing
- [ ] **Step 4:** Keep old App behind a flag OR migrate incrementally — prefer new routes as source of truth once stubs exist

---

### Task 3: Extract hooks from App.jsx

**Files:**
- Create: `src/hooks/useBinancePrices.js`, `src/hooks/useAuthSession.js`, `src/hooks/useSocketStatus.js`
- Modify: consume from new pages; leave binary/admin logic accessible

- [ ] **Step 1:** Move Binance WS logic into `useBinancePrices`
- [ ] **Step 2:** Wrap Firebase auth state in `useAuthSession`
- [ ] **Step 3:** Expose socket connection state for `ConnectionStatus`

---

### Task 4: UI primitives + Logo

**Files:**
- Create: `src/components/ui/{Button,Input,Tabs,Badge,Toast}.jsx`
- Create: `src/components/brand/Logo.jsx`
- Create: `src/components/nav/TopBar.jsx`, `ConnectionStatus.jsx`

- [ ] **Step 1:** Button variants: primary (accent), buy, sell, ghost, danger
- [ ] **Step 2:** Logo wordmark NovaX in accent blue
- [ ] **Step 3:** App/Terminal TopBar with nav links + balance slot + connection badge

---

### Task 5: Marketing + Auth pages

**Files:**
- Create: `src/pages/LandingPage.jsx`, `AboutPage.jsx`, `LoginPage.jsx`, `SignupPage.jsx`

- [ ] **Step 1:** Landing — brand hero, one CTA, terminal preview panel (light shell)
- [ ] **Step 2:** About — honest copy only
- [ ] **Step 3:** Login/Signup — wire existing Firebase methods; professional form card

---

### Task 6: Markets + Portfolio + Profile

**Files:**
- Create: `src/pages/MarketsPage.jsx`, `PortfolioPage.jsx`, `ProfilePage.jsx`
- Create: `src/components/market/MarketsTable.jsx`

- [ ] **Step 1:** Markets table from Binance price hook; navigate to `/trade/:symbol`
- [ ] **Step 2:** Portfolio equity/holdings from Firestore balance
- [ ] **Step 3:** Profile referral + deposit/withdraw links

---

### Task 7: Terminal workspace

**Files:**
- Create: `src/pages/TradePage.jsx`
- Create: `src/components/chart/CandleChart.jsx`, `ChartToolbar.jsx`
- Create: `src/components/market/Watchlist.jsx`, `OrderBook.jsx`, `TradesTape.jsx`
- Create: `src/components/trade/OrderTicket.jsx`, `BinaryTicket.jsx`, `Blotter.jsx`

- [ ] **Step 1:** Grid layout matching spec widths
- [ ] **Step 2:** lightweight-charts dark theme bound to symbol + timeframes
- [ ] **Step 3:** OrderTicket Spot/Futures chrome; BinaryTicket wired to existing resolve API
- [ ] **Step 4:** Blotter tabs including Binary history from Firestore
- [ ] **Step 5:** Watchlist / simulated order book / trades tape

---

### Task 8: Restyle money flows

**Files:**
- Modify: `src/pages/DepositPage.jsx`, `WithdrawPage.jsx`, `CheckoutPage.jsx`, `ContactCarePage.jsx` (or move into `src/pages` and update imports)

- [ ] **Step 1:** Wrap in AuthMoneyShell
- [ ] **Step 2:** Apply light institutional form styling; keep QR/network/logic

---

### Task 9: Chat + Admin chrome + polish

**Files:**
- Extract/restyle chat widget + admin panel from old App
- Modify: global motion, empty states, responsive

- [ ] **Step 1:** Restyle ChatWidget to tokens
- [ ] **Step 2:** Admin entry + panel match dark elevated surfaces
- [ ] **Step 3:** Responsive pass; reduced-motion; remove dead Inter/amber leftovers
- [ ] **Step 4:** Delete or gut obsolete monolith UI once parity reached
- [ ] **Step 5:** Manual QA checklist: auth, trade binary, markets nav, deposit path, socket badge

---

## Manual QA checklist

- [ ] `/` light landing, CTA → trade or signup
- [ ] Login/signup Firebase works
- [ ] `/markets` shows live % and opens `/trade/BTCUSDT`
- [ ] Terminal chart renders; Binary trade still resolves
- [ ] Portfolio shows balance
- [ ] Deposit/withdraw pages usable
- [ ] Connection badge reflects socket state
- [ ] No unimplemented “copy trading” claims on About

---

## Notes

- Prefer professional restraint over crypto-casino effects (ignore Orbitron/purple recommendations from generic design DBs).
- Do not commit unless the user asks.
- Keep `npm run dev` green after each task.
