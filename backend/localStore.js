const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const LEDGER_FILE = path.join(DATA_DIR, "ledger.json");
const TRADES_FILE = path.join(DATA_DIR, "trades.json");

function ensureFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  for (const f of [USERS_FILE, LEDGER_FILE, TRADES_FILE]) {
    if (!fs.existsSync(f)) fs.writeFileSync(f, f.includes("ledger") || f.includes("trades") ? "[]" : "{}", "utf8");
  }
}

function readJson(file, fallback) {
  ensureFiles();
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  ensureFiles();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

const pendingTrades = new Map();

function moneyError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function parseAmount(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) throw moneyError("Amount must be a positive number");
  if (n > 1_000_000) throw moneyError("Amount exceeds max 1000000");
  return Math.round(n * 100) / 100;
}

function pushLedger(row) {
  const ledger = readJson(LEDGER_FILE, []);
  ledger.unshift({ id: `l-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ...row, createdAt: new Date().toISOString() });
  writeJson(LEDGER_FILE, ledger.slice(0, 2000));
}

function ensureUserDoc(uid, { email = "", displayName = "" } = {}) {
  const users = readJson(USERS_FILE, {});
  if (!users[uid]) {
    users[uid] = {
      email: normalizeEmail(email),
      displayName: displayName || "",
      balance: 0,
      frozen: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    writeJson(USERS_FILE, users);
  } else {
    let changed = false;
    if (email && !users[uid].email) { users[uid].email = normalizeEmail(email); changed = true; }
    if (displayName && !users[uid].displayName) { users[uid].displayName = displayName; changed = true; }
    if (changed) {
      users[uid].updatedAt = new Date().toISOString();
      writeJson(USERS_FILE, users);
    }
  }
  return users[uid];
}

function findUserByEmail(email) {
  const users = readJson(USERS_FILE, {});
  const normalized = normalizeEmail(email);
  const entry = Object.entries(users).find(([, u]) => u.email === normalized);
  if (!entry) throw moneyError("No account found for that email. User must sign up / log in once first.", 404);
  return { uid: entry[0], ...entry[1] };
}

function getUser(uid) {
  const users = readJson(USERS_FILE, {});
  if (!users[uid]) throw moneyError("User not found", 404);
  return { uid, ...users[uid] };
}

function saveUser(uid, data) {
  const users = readJson(USERS_FILE, {});
  users[uid] = { ...users[uid], ...data, updatedAt: new Date().toISOString() };
  writeJson(USERS_FILE, users);
  return users[uid];
}

function creditByEmail(email, amount, { adminId, note }) {
  const user = findUserByEmail(email);
  const amt = parseAmount(amount);
  const balance = Math.round(((Number(user.balance) || 0) + amt) * 100) / 100;
  saveUser(user.uid, { balance });
  pushLedger({ uid: user.uid, email: user.email, type: "credit", amount: amt, balanceAfter: balance, adminId, note: note || "Manual deposit credit" });
  return { uid: user.uid, email: user.email, balance };
}

function debitByEmail(email, amount, { adminId, note }) {
  const user = findUserByEmail(email);
  const amt = parseAmount(amount);
  const balance = Math.max(0, Math.round(((Number(user.balance) || 0) - amt) * 100) / 100);
  saveUser(user.uid, { balance });
  pushLedger({ uid: user.uid, email: user.email, type: "debit", amount: -amt, balanceAfter: balance, adminId, note: note || "Manual debit" });
  return { uid: user.uid, email: user.email, balance };
}

function setBalanceByEmail(email, amount, { adminId, note }) {
  const user = findUserByEmail(email);
  const balance = Math.round(Number(amount) * 100) / 100;
  if (!Number.isFinite(balance) || balance < 0) throw moneyError("Balance must be >= 0");
  saveUser(user.uid, { balance });
  pushLedger({ uid: user.uid, email: user.email, type: "set", amount: balance, balanceAfter: balance, adminId, note: note || "Balance set by admin" });
  return { uid: user.uid, email: user.email, balance };
}

function freezeByEmail(email, frozen, { adminId }) {
  const user = findUserByEmail(email);
  saveUser(user.uid, { frozen: !!frozen });
  pushLedger({
    uid: user.uid,
    email: user.email,
    type: frozen ? "freeze" : "unfreeze",
    amount: 0,
    balanceAfter: Number(user.balance) || 0,
    adminId,
    note: frozen ? "Account frozen" : "Account unfrozen",
  });
  return { uid: user.uid, email: user.email, frozen: !!frozen, balance: Number(user.balance) || 0 };
}

function listLedgerByEmail(email, limit = 40) {
  const ledger = readJson(LEDGER_FILE, []);
  return ledger.filter((r) => r.email === normalizeEmail(email)).slice(0, limit);
}

function openTrade({ uid, email, amount, pct, symbol, side, sessionId }) {
  ensureUserDoc(uid, { email });
  const user = getUser(uid);
  const amt = parseAmount(amount);
  const payoutPct = Number(pct);
  if (!Number.isFinite(payoutPct) || payoutPct <= 0) throw moneyError("Invalid payout percent");
  if (user.frozen) throw moneyError("Account is frozen — contact support", 403);
  const balance = Number(user.balance) || 0;
  if (balance <= 0) throw moneyError("Insufficient balance — deposit via support first", 402);
  if (amt > balance) throw moneyError("Trade amount exceeds available balance", 402);
  const balanceAfter = Math.round((balance - amt) * 100) / 100;
  saveUser(uid, { balance: balanceAfter });
  const tradeId = `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  pendingTrades.set(tradeId, { uid, email: normalizeEmail(email), amount: amt, pct: payoutPct, symbol, side, sessionId: sessionId || null, openedAt: Date.now() });
  pushLedger({ uid, email, type: "trade_open", amount: -amt, balanceAfter, adminId: null, note: `Open ${side} ${symbol} ${amt}` });
  return { tradeId, balance: balanceAfter, amount: amt };
}

function settleTrade({ tradeId, uid, marketWon, wonOverride, assignedAdmin }) {
  const pending = pendingTrades.get(tradeId);
  if (!pending) throw moneyError("Trade not found or already settled", 404);
  if (pending.uid !== uid) throw moneyError("Trade does not belong to this user", 403);
  const won = typeof wonOverride === "boolean" ? wonOverride : !!marketWon;
  const profit = Math.round((pending.amount * (pending.pct / 100)) * 100) / 100;
  const credit = won ? pending.amount + profit : 0;
  const pnl = won ? profit : -pending.amount;
  let balanceAfter;
  if (credit > 0) {
    const user = getUser(uid);
    balanceAfter = Math.round(((Number(user.balance) || 0) + credit) * 100) / 100;
    saveUser(uid, { balance: balanceAfter });
  } else {
    balanceAfter = Number(getUser(uid).balance) || 0;
  }
  pushLedger({
    uid,
    email: pending.email,
    type: "trade_settle",
    amount: credit,
    balanceAfter,
    adminId: assignedAdmin || null,
    note: won ? `Settle WIN ${pending.symbol}` : `Settle LOSS ${pending.symbol}`,
  });
  pendingTrades.delete(tradeId);
  const tradeDoc = {
    id: tradeId,
    symbol: pending.symbol,
    side: pending.side,
    amount: pending.amount,
    pct: pending.pct,
    won,
    pnl,
    assignedAdmin: assignedAdmin || null,
    completedAt: Date.now(),
  };
  const trades = readJson(TRADES_FILE, []);
  trades.unshift({ uid, ...tradeDoc });
  writeJson(TRADES_FILE, trades.slice(0, 2000));
  return { won, pnl, balance: balanceAfter, trade: tradeDoc };
}

module.exports = {
  ensureUserDoc,
  findUserByEmail,
  getUser,
  creditByEmail,
  debitByEmail,
  setBalanceByEmail,
  freezeByEmail,
  listLedgerByEmail,
  openTrade,
  settleTrade,
  pendingTrades,
};
