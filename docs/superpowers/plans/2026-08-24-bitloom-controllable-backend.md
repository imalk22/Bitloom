# Bitloom Controllable Backend — Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Server-owned balances, admin credit-by-email, zero-balance trade block, support-mediated deposits.

**Architecture:** Extend Express on `:3001` with Firebase Admin; Admin Accounts tab; wire binary trade open/settle through API.

**Tech Stack:** Node, Express, firebase-admin, Firestore, existing Socket.IO admin auth, React App.jsx

---

### Task 1: Firebase Admin + money module
- Create: `backend/firebaseAdmin.js`, `backend/money.js`, `backend/.env.example`, gitignore service account
- Modify: `backend/package.json`, `backend/server.js`
- [ ] Install firebase-admin dotenv
- [ ] Init Admin SDK from `serviceAccountKey.json` or env
- [ ] User ensure/lookup by email, credit/debit/set/freeze, ledger writes
- [ ] Trade open/settle with balance checks

### Task 2: REST routes
- Modify: `backend/server.js`
- [ ] `GET /api/me`, `POST /api/trade/open`, harden `POST /api/trade/resolve`
- [ ] Admin credit/debit/set/freeze/search/ledger

### Task 3: Frontend trade gate + settle
- Modify: `src/App.jsx`, `src/firebase.js`
- [ ] placeTrade checks login + balance; calls `/api/trade/open`
- [ ] resolve sends Bearer token; apply `balanceAfter` from server
- [ ] Stop client `updateUserBalance` on trade done

### Task 4: Admin Accounts tab
- Modify: `src/App.jsx` AdminPanel
- [ ] Email + amount credit/debit/set + freeze + search

### Task 5: Deposit UX
- Modify: `src/pages/DepositPage.jsx`
- [ ] Contact support primary path; no fake auto-credit

### Task 6: Verify
- [ ] Health + credit flow smoke test; zero-balance rejected
