# Bitloom Controllable Backend — Design Spec

**Date:** 2026-08-24  
**Status:** Approved  
**Brand:** Bitloom (`bitloom.online`)

## Goal

Give the employer full control of customer balances and trade outcomes from the existing admin panel, block zero-balance trading, and route deposits through support (manual credit by email). Money mutations happen only on the Node backend.

## Approach

**A — Firebase Auth + Firestore + Firebase Admin SDK on Express (port 3001).**  
Keep current login; stop client-side balance writes; extend existing admin auth and P&L modes.

## Non-goals (this phase)

- Real payment gateway / on-chain deposit detection  
- New SQL database  
- Replacing Firebase Auth  
- Public self-serve deposit auto-credit  

## Data model (Firestore)

### `users/{uid}`
| Field | Type | Notes |
|-------|------|--------|
| email | string | Lowercased; indexed for admin lookup |
| displayName | string | Optional |
| balance | number | USDT; server-owned |
| frozen | boolean | If true, trades rejected |
| createdAt | string (ISO) | |
| updatedAt | string (ISO) | |

### `ledger/{autoId}`
| Field | Type | Notes |
|-------|------|--------|
| uid | string | |
| email | string | |
| type | `credit` \| `debit` \| `set` \| `trade_open` \| `trade_settle` | |
| amount | number | Signed delta or absolute for `set` |
| balanceAfter | number | |
| adminId | string \| null | Admin username or null for system |
| note | string | e.g. "Deposit via support" |
| createdAt | string (ISO) | |

### `users/{uid}/trades/{autoId}`
Existing trade docs; written by backend on settle (client may still read).

## API (Express)

### Auth
- **Customer:** `Authorization: Bearer <Firebase ID token>` on money/trade routes  
- **Admin:** existing `{ username, password }` body/query (unchanged accounts)

### Customer
| Method | Path | Behavior |
|--------|------|----------|
| GET | `/api/me` | Profile + balance (creates user doc if missing) |
| POST | `/api/trade/open` | Validate balance ≥ amount, not frozen; reserve/deduct stake; return tradeId |
| POST | `/api/trade/resolve` | Extended: requires auth + tradeId/amount; applies P&L mode; settles balance; writes trade + ledger |

### Admin
| Method | Path | Behavior |
|--------|------|----------|
| POST | `/api/admin/users/credit` | `{ email, amount, note }` → add balance + ledger |
| POST | `/api/admin/users/debit` | Subtract (floor at 0) + ledger |
| POST | `/api/admin/users/set-balance` | Absolute set + ledger |
| POST | `/api/admin/users/freeze` | `{ email, frozen }` |
| GET | `/api/admin/users/search?email=` | Lookup user + balance |
| GET | `/api/admin/ledger?email=` | Recent ledger rows |

Existing: `/api/admin/login`, P&L, chats, stats — keep.

## Frontend rules

1. `BinaryTradePanel.placeTrade`: require login; `amount > 0` and `amount <= balance`; show deposit CTA if zero.  
2. `handleTradeDone`: refresh balance from `/api/me` or settle response — **do not** `updateUserBalance` from client.  
3. Remove / stop exporting client `updateUserBalance` for money paths (or make it a no-op / deprecated).  
4. Deposit page: primary CTA = Contact Care / open chat; remove “I've paid → auto success” credit illusion.  
5. Admin panel: new **Accounts** tab — email, amount, credit/debit/set, freeze, search result.

## Security

- Service account JSON only on server (`backend/serviceAccountKey.json` or env); never shipped to Vite.  
- Firestore security rules should deny client writes to `balance` / `ledger` once Admin SDK is live (document in setup).  
- Validate amounts: positive numbers, sane max per credit (e.g. 1_000_000).

## Setup (operator)

1. Firebase Console → Project settings → Service accounts → Generate new private key.  
2. Save as `backend/serviceAccountKey.json` (gitignored).  
3. `cd backend && npm i firebase-admin dotenv && npm run dev`.  
4. Harden Firestore rules (optional same PR / follow-up).

## Success criteria

- [ ] User with balance 0 cannot open a trade  
- [ ] Admin can credit `user@email` by amount and user sees new balance after refresh  
- [ ] Trade settle updates balance only via backend  
- [ ] Ledger records every credit/debit/trade  
- [ ] Existing chat + P&L modes still work  

## Out of scope follow-ups

- Multi-currency wallets  
- Automated deposit matching from chain address  
- Role-based admin (superadmin vs agent)  
