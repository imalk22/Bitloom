const { db, auth } = require("./firebaseAdmin");

const MAX_CREDIT = 1_000_000;
const pendingTrades = new Map(); // tradeId -> { uid, email, amount, pct, symbol, side, sessionId, openedAt }

function moneyError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function parseAmount(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) throw moneyError("Amount must be a positive number");
  if (n > MAX_CREDIT) throw moneyError(`Amount exceeds max ${MAX_CREDIT}`);
  return Math.round(n * 100) / 100;
}

async function writeLedger({ uid, email, type, amount, balanceAfter, adminId = null, note = "" }) {
  await db().collection("ledger").add({
    uid,
    email: normalizeEmail(email),
    type,
    amount,
    balanceAfter,
    adminId,
    note: note || "",
    createdAt: new Date().toISOString(),
  });
}

async function ensureUserDoc(uid, { email = "", displayName = "" } = {}) {
  const ref = db().collection("users").doc(uid);
  const snap = await ref.get();
  const now = new Date().toISOString();
  if (!snap.exists) {
    const profile = {
      email: normalizeEmail(email),
      displayName: displayName || "",
      balance: 0,
      frozen: false,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(profile);
    return profile;
  }
  const data = snap.data();
  const patch = {};
  if (email && !data.email) patch.email = normalizeEmail(email);
  if (displayName && !data.displayName) patch.displayName = displayName;
  if (Object.keys(patch).length) {
    patch.updatedAt = now;
    await ref.update(patch);
    return { ...data, ...patch };
  }
  return data;
}

async function findUserByEmail(email) {
  const q = await db().collection("users").where("email", "==", normalizeEmail(email)).limit(1).get();
  if (q.empty) {
    // Fallback: Auth lookup then ensure Firestore doc
    try {
      const userRecord = await auth().getUserByEmail(normalizeEmail(email));
      const profile = await ensureUserDoc(userRecord.uid, {
        email: userRecord.email,
        displayName: userRecord.displayName || "",
      });
      return { uid: userRecord.uid, ...profile };
    } catch {
      throw moneyError("No account found for that email", 404);
    }
  }
  const doc = q.docs[0];
  return { uid: doc.id, ...doc.data() };
}

async function getUser(uid) {
  const snap = await db().collection("users").doc(uid).get();
  if (!snap.exists) throw moneyError("User not found", 404);
  return { uid, ...snap.data() };
}

async function setBalanceAbsolute(uid, balance, { adminId, note, email }) {
  const next = Math.round(Number(balance) * 100) / 100;
  if (!Number.isFinite(next) || next < 0) throw moneyError("Balance must be >= 0");
  const ref = db().collection("users").doc(uid);
  await ref.update({ balance: next, updatedAt: new Date().toISOString() });
  await writeLedger({
    uid,
    email,
    type: "set",
    amount: next,
    balanceAfter: next,
    adminId,
    note: note || "Balance set by admin",
  });
  return next;
}

async function adjustBalance(uid, delta, { type, adminId, note, email }) {
  const ref = db().collection("users").doc(uid);
  const next = await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw moneyError("User not found", 404);
    const data = snap.data();
    const current = Number(data.balance) || 0;
    let balanceAfter = Math.round((current + delta) * 100) / 100;
    if (balanceAfter < 0) balanceAfter = 0;
    tx.update(ref, { balance: balanceAfter, updatedAt: new Date().toISOString() });
    return { balanceAfter, email: data.email || email };
  });
  await writeLedger({
    uid,
    email: next.email,
    type,
    amount: delta,
    balanceAfter: next.balanceAfter,
    adminId,
    note,
  });
  return next.balanceAfter;
}

async function creditByEmail(email, amount, { adminId, note }) {
  const user = await findUserByEmail(email);
  const amt = parseAmount(amount);
  const balanceAfter = await adjustBalance(user.uid, amt, {
    type: "credit",
    adminId,
    note: note || "Manual deposit credit",
    email: user.email,
  });
  return { uid: user.uid, email: user.email, balance: balanceAfter };
}

async function debitByEmail(email, amount, { adminId, note }) {
  const user = await findUserByEmail(email);
  const amt = parseAmount(amount);
  const balanceAfter = await adjustBalance(user.uid, -amt, {
    type: "debit",
    adminId,
    note: note || "Manual debit",
    email: user.email,
  });
  return { uid: user.uid, email: user.email, balance: balanceAfter };
}

async function setBalanceByEmail(email, amount, { adminId, note }) {
  const user = await findUserByEmail(email);
  const next = Math.round(Number(amount) * 100) / 100;
  if (!Number.isFinite(next) || next < 0) throw moneyError("Balance must be >= 0");
  const balance = await setBalanceAbsolute(user.uid, next, {
    adminId,
    note: note || "Balance set by admin",
    email: user.email,
  });
  return { uid: user.uid, email: user.email, balance };
}

async function freezeByEmail(email, frozen, { adminId }) {
  const user = await findUserByEmail(email);
  await db().collection("users").doc(user.uid).update({
    frozen: !!frozen,
    updatedAt: new Date().toISOString(),
  });
  await writeLedger({
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

async function listLedgerByEmail(email, limit = 40) {
  const normalized = normalizeEmail(email);
  const q = await db().collection("ledger")
    .where("email", "==", normalized)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return q.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function openTrade({ uid, email, amount, pct, symbol, side, sessionId }) {
  const amt = parseAmount(amount);
  const payoutPct = Number(pct);
  if (!Number.isFinite(payoutPct) || payoutPct <= 0) throw moneyError("Invalid payout percent");

  const ref = db().collection("users").doc(uid);
  const balanceAfter = await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw moneyError("User profile missing — log in again", 404);
    const data = snap.data();
    if (data.frozen) throw moneyError("Account is frozen — contact support", 403);
    const balance = Number(data.balance) || 0;
    if (balance <= 0) throw moneyError("Insufficient balance — deposit via support first", 402);
    if (amt > balance) throw moneyError("Trade amount exceeds available balance", 402);
    const next = Math.round((balance - amt) * 100) / 100;
    tx.update(ref, { balance: next, updatedAt: new Date().toISOString() });
    return next;
  });

  const tradeId = `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const pending = {
    uid,
    email: normalizeEmail(email),
    amount: amt,
    pct: payoutPct,
    symbol,
    side,
    sessionId: sessionId || null,
    openedAt: Date.now(),
  };
  pendingTrades.set(tradeId, pending);
  await db().collection("pendingTrades").doc(tradeId).set(pending);

  await writeLedger({
    uid,
    email,
    type: "trade_open",
    amount: -amt,
    balanceAfter,
    note: `Open ${side} ${symbol} ${amt}`,
  });

  return { tradeId, balance: balanceAfter, amount: amt };
}

async function settleTrade({ tradeId, uid, marketWon, wonOverride, assignedAdmin }) {
  let pending = pendingTrades.get(tradeId);
  if (!pending) {
    const snap = await db().collection("pendingTrades").doc(tradeId).get();
    if (snap.exists) pending = snap.data();
  }
  if (!pending) throw moneyError("Trade not found or already settled", 404);
  if (pending.uid !== uid) throw moneyError("Trade does not belong to this user", 403);

  const won = typeof wonOverride === "boolean" ? wonOverride : !!marketWon;
  const profit = Math.round((pending.amount * (pending.pct / 100)) * 100) / 100;
  // Stake already deducted on open. Win → return stake + profit. Loss → nothing.
  const credit = won ? pending.amount + profit : 0;
  const pnl = won ? profit : -pending.amount;

  let balanceAfter = 0;
  if (credit > 0) {
    balanceAfter = await adjustBalance(uid, credit, {
      type: "trade_settle",
      adminId: assignedAdmin || null,
      note: `Settle WIN ${pending.symbol}`,
      email: pending.email,
    });
  } else {
    const user = await getUser(uid);
    balanceAfter = Number(user.balance) || 0;
    await writeLedger({
      uid,
      email: pending.email,
      type: "trade_settle",
      amount: 0,
      balanceAfter,
      adminId: assignedAdmin || null,
      note: `Settle LOSS ${pending.symbol}`,
    });
  }

  pendingTrades.delete(tradeId);
  await db().collection("pendingTrades").doc(tradeId).delete().catch(() => {});

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
    savedAt: new Date().toISOString(),
  };
  await db().collection("users").doc(uid).collection("trades").add(tradeDoc);

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
  moneyError,
};
