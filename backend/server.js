const express          = require("express");
const { createServer } = require("http");
const { Server }       = require("socket.io");
const cors             = require("cors");
const path             = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const {
  initFirebaseAdmin,
  isFirebaseReady,
  getFirebaseInitError,
  verifyIdToken,
} = require("./firebaseAdmin");
const money = require("./moneyService");

initFirebaseAdmin();

const app = express();
const IS_VERCEL = !!process.env.VERCEL;

const FRONTEND_ORIGINS = (process.env.FRONTEND_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const PORT = process.env.PORT || 3001;

// On Vercel, reflect request origin (same-site frontend + API). Locally, lock to FRONTEND_ORIGIN.
app.use(cors({
  origin: IS_VERCEL ? true : FRONTEND_ORIGINS,
  credentials: true,
}));
app.use(express.json());

const httpServer = IS_VERCEL ? null : createServer(app);
const io = IS_VERCEL
  ? null
  : new Server(httpServer, {
      cors: { origin: FRONTEND_ORIGINS, methods: ["GET", "POST"] },
    });

// ─── ADMIN ACCOUNTS ───────────────────────────────────────────────────────────
// Admin accounts come from the environment — credentials must never be committed.
// ADMIN_MAIN_* is the owner account: the only one that can review the others.
// See backend/.env.example.
function buildAdmins() {
  const defs = [
    { user: process.env.ADMIN_MAIN_USER, pass: process.env.ADMIN_MAIN_PASS, main: true },
    { user: process.env.ADMIN_2_USER,    pass: process.env.ADMIN_2_PASS,    main: false },
    { user: process.env.ADMIN_3_USER,    pass: process.env.ADMIN_3_PASS,    main: false },
  ];
  const admins = {};
  for (const d of defs) {
    if (!d.user || !d.pass) continue;
    admins[d.user] = { password: d.pass, main: d.main, pnlConfig: { mode: "auto", customWinRate: 50 } };
  }
  return admins;
}

const ADMINS = buildAdmins();

function authAdmin(username, password) {
  return !!(ADMINS[username] && ADMINS[username].password === password);
}

function isMainAdmin(username) {
  return !!(ADMINS[username] && ADMINS[username].main);
}

// ─── STATE ────────────────────────────────────────────────────────────────────
// sessions: Map<sessionId, { id, name, socketId, messages[], status, createdAt, readByAgent, assignedAdmin }>
const sessions = new Map();

// adminSockets: Map<socketId, adminUsername>
const adminSockets = new Map();

// ─── P&L HELPERS ─────────────────────────────────────────────────────────────
function resolveOutcome(marketWon, config) {
  switch (config.mode) {
    case "win":    return true;
    case "loss":   return false;
    case "custom": return Math.random() * 100 < config.customWinRate;
    default:       return marketWon;
  }
}

function getAdminConfig(username) {
  return (username && ADMINS[username])
    ? ADMINS[username].pnlConfig
    : { mode: "auto", customWinRate: 50 };
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function makeMsg(from, text, extra = {}) {
  return { id: Date.now() + Math.random(), from, text, time: new Date().toISOString(), ...extra };
}

function notifyAllAdmins(event, data) {
  if (!io) return;
  adminSockets.forEach((_, sid) => {
    const s = io.sockets.sockets.get(sid);
    if (s) s.emit(event, data);
  });
}

function notifyAdminsByUsername(username, event, data) {
  if (!io) return;
  adminSockets.forEach((uname, sid) => {
    if (uname === username) {
      const s = io.sockets.sockets.get(sid);
      if (s) s.emit(event, data);
    }
  });
}

function addAdminsToRoom(sessionId) {
  if (!io) return;
  adminSockets.forEach((_, sid) => {
    const s = io.sockets.sockets.get(sid);
    if (s) s.join(sessionId);
  });
}

// Push this admin's current P&L config to all their assigned customers
function pushPnlToAssignedCustomers(adminUsername) {
  if (!io) return;
  const config = getAdminConfig(adminUsername);
  sessions.forEach((session) => {
    if (session.assignedAdmin === adminUsername && session.status !== "closed") {
      const customerSocket = io.sockets.sockets.get(session.socketId);
      if (customerSocket) customerSocket.emit("pnl:mode", config);
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  REST API
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/api/health", (_req, res) => res.json({
  status: "ok",
  moneyStore: money.backendMode(),
  firebase: isFirebaseReady(),
  firebaseError: getFirebaseInitError(),
}));

function asyncHandler(fn) {
  return (req, res) => Promise.resolve(fn(req, res)).catch((err) => {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || "Server error" });
  });
}

/** Customer auth: Firebase ID token, or (dev) uid+email in body/headers when Admin SDK missing */
async function requireCustomer(req, _res, next) {
  try {
    if (isFirebaseReady() && req.headers.authorization?.startsWith("Bearer ")) {
      const decoded = await verifyIdToken(req.headers.authorization);
      req.user = {
        uid: decoded.uid,
        email: decoded.email || "",
        displayName: decoded.name || "",
      };
      return next();
    }
    const uid = req.headers["x-user-uid"] || req.body?.uid || req.query?.uid;
    const email = req.headers["x-user-email"] || req.body?.email || req.query?.email;
    if (uid && email) {
      req.user = { uid: String(uid), email: String(email), displayName: "" };
      return next();
    }
    return _res.status(401).json({
      error: isFirebaseReady()
        ? "Sign in required"
        : "Sign in required (send Bearer token, or x-user-uid + x-user-email while Firebase Admin is not configured)",
    });
  } catch (err) {
    return _res.status(err.status || 401).json({ error: err.message || "Unauthorized" });
  }
}

function requireAdmin(req, res) {
  const username = req.body?.username || req.query?.username;
  const password = req.body?.password || req.query?.password;
  if (!authAdmin(username, password)) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return username;
}

// Customer profile + balance
app.get("/api/me", requireCustomer, asyncHandler(async (req, res) => {
  const profile = await money.ensureUserDoc(req.user.uid, {
    email: req.user.email,
    displayName: req.user.displayName,
  });
  res.json({
    uid: req.user.uid,
    email: profile.email || req.user.email,
    displayName: profile.displayName || req.user.displayName,
    balance: Number(profile.balance) || 0,
    frozen: !!profile.frozen,
    store: money.backendMode(),
  });
}));

// Open trade — deduct stake if balance allows
app.post("/api/trade/open", requireCustomer, asyncHandler(async (req, res) => {
  await money.ensureUserDoc(req.user.uid, { email: req.user.email, displayName: req.user.displayName });
  const result = await money.openTrade({
    uid: req.user.uid,
    email: req.user.email,
    amount: req.body.amount,
    pct: req.body.pct,
    symbol: req.body.symbol || "BTCUSDT",
    side: req.body.side || "buy",
    sessionId: req.body.sessionId || null,
  });
  res.json(result);
}));

// Admin login — validates credentials, returns username on success
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (!authAdmin(username, password))
    return res.status(401).json({ error: "Invalid credentials" });
  res.json({ success: true, username, isMain: isMainAdmin(username) });
});

// Get pnl mode — returns this admin's config if authenticated, else returns auto
app.get("/api/pnl-mode", (req, res) => {
  const { username, password } = req.query;
  if (username && authAdmin(username, password))
    return res.json(ADMINS[username].pnlConfig);
  res.json({ mode: "auto", customWinRate: 50 });
});

// Trade resolution — P&L mode + balance settle
app.post("/api/trade/resolve", requireCustomer, asyncHandler(async (req, res) => {
  const { marketWon, amount, pct, sessionId, tradeId } = req.body;
  if (typeof marketWon !== "boolean")
    return res.status(400).json({ error: "marketWon (bool) required" });

  const session   = sessions.get(sessionId);
  const adminName = session?.assignedAdmin || null;
  const config    = getAdminConfig(adminName);
  const won       = resolveOutcome(marketWon, config);

  if (tradeId) {
    const settled = await money.settleTrade({
      tradeId,
      uid: req.user.uid,
      marketWon,
      wonOverride: won,
      assignedAdmin: adminName,
    });
    return res.json({
      won: settled.won,
      pnl: settled.pnl,
      balance: settled.balance,
      mode: config.mode,
      assignedAdmin: adminName,
      trade: settled.trade,
    });
  }

  // Legacy path (no open tradeId): compute PnL only — do not mutate balance here
  if (!amount || !pct)
    return res.status(400).json({ error: "tradeId required (or legacy amount+pct for display-only)" });
  const pnl = won ? amount * (pct / 100) : -amount;
  res.json({ won, pnl, mode: config.mode, assignedAdmin: adminName, legacy: true });
}));

// ── Admin money controls ─────────────────────────────────────────────────────
app.post("/api/admin/users/credit", asyncHandler(async (req, res) => {
  const username = requireAdmin(req, res);
  if (!username) return;
  const result = await money.creditByEmail(req.body.email, req.body.amount, {
    adminId: username,
    note: req.body.note || "Manual deposit credit",
  });
  res.json({ success: true, ...result });
}));

app.post("/api/admin/users/debit", asyncHandler(async (req, res) => {
  const username = requireAdmin(req, res);
  if (!username) return;
  const result = await money.debitByEmail(req.body.email, req.body.amount, {
    adminId: username,
    note: req.body.note || "Manual debit",
  });
  res.json({ success: true, ...result });
}));

app.post("/api/admin/users/set-balance", asyncHandler(async (req, res) => {
  const username = requireAdmin(req, res);
  if (!username) return;
  const result = await money.setBalanceByEmail(req.body.email, req.body.amount, {
    adminId: username,
    note: req.body.note || "Balance set by admin",
  });
  res.json({ success: true, ...result });
}));

app.post("/api/admin/users/freeze", asyncHandler(async (req, res) => {
  const username = requireAdmin(req, res);
  if (!username) return;
  const result = await money.freezeByEmail(req.body.email, !!req.body.frozen, { adminId: username });
  res.json({ success: true, ...result });
}));

// ── Owner oversight: what every admin has been doing ─────────────────────────
function requireMainAdmin(req, res) {
  const username = req.body?.username || req.query?.username;
  const password = req.body?.password || req.query?.password;
  if (!authAdmin(username, password)) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  if (!isMainAdmin(username)) {
    res.status(403).json({ error: "Main admin only" });
    return null;
  }
  return username;
}

app.get("/api/admin/oversight", asyncHandler(async (req, res) => {
  const username = requireMainAdmin(req, res);
  if (!username) return;

  const entries = await money.listRecentLedger(Number(req.query.limit) || 300);
  const allSessions = Array.from(sessions.values());

  const summary = Object.keys(ADMINS).map((name) => ({
    username: name,
    isMain: isMainAdmin(name),
    isYou: name === username,
    pnlMode: ADMINS[name].pnlConfig.mode,
    customWinRate: ADMINS[name].pnlConfig.customWinRate,
    credited: 0,
    debited: 0,
    actions: 0,
    customers: [],
    lastActionAt: null,
    sessions: allSessions.filter((s) => s.assignedAdmin === name).length,
    recent: [],
  }));
  const byName = Object.fromEntries(summary.map((a) => [a.username, a]));

  for (const e of entries) {
    const admin = e.adminId && byName[e.adminId];
    if (!admin) continue;               // customer-driven rows (trades) have no adminId
    const amount = Number(e.amount) || 0;
    admin.actions += 1;
    if (e.type === "credit") admin.credited += amount;
    if (e.type === "debit") admin.debited += Math.abs(amount);
    if (e.email && !admin.customers.includes(e.email)) admin.customers.push(e.email);
    if (!admin.lastActionAt || e.createdAt > admin.lastActionAt) admin.lastActionAt = e.createdAt;
    if (admin.recent.length < 25) {
      admin.recent.push({
        email: e.email || "",
        type: e.type,
        amount,
        balanceAfter: e.balanceAfter,
        note: e.note || "",
        createdAt: e.createdAt,
      });
    }
  }

  summary.forEach((a) => {
    a.credited = Math.round(a.credited * 100) / 100;
    a.debited = Math.round(a.debited * 100) / 100;
  });

  res.json({ mainAdmin: username, scanned: entries.length, admins: summary });
}));

app.get("/api/admin/users/search", asyncHandler(async (req, res) => {
  const username = requireAdmin(req, res);
  if (!username) return;
  const user = await money.findUserByEmail(req.query.email);
  res.json({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || "",
    balance: Number(user.balance) || 0,
    frozen: !!user.frozen,
  });
}));

app.get("/api/admin/ledger", asyncHandler(async (req, res) => {
  const username = requireAdmin(req, res);
  if (!username) return;
  const rows = await money.listLedgerByEmail(req.query.email, Number(req.query.limit) || 40);
  res.json(rows);
}));

// Set this admin's P&L mode via REST
app.post("/api/admin/pnl-mode", (req, res) => {
  const { username, password, mode, customWinRate } = req.body;
  if (!authAdmin(username, password))
    return res.status(401).json({ error: "Unauthorized" });
  if (!["auto", "win", "loss", "custom"].includes(mode))
    return res.status(400).json({ error: "Invalid mode" });
  ADMINS[username].pnlConfig = {
    mode,
    customWinRate: Number(customWinRate) || ADMINS[username].pnlConfig.customWinRate,
  };
  notifyAdminsByUsername(username, "pnl:mode", ADMINS[username].pnlConfig);
  pushPnlToAssignedCustomers(username);
  console.log(`[PnL] ${username} → ${mode}`);
  res.json({ success: true, pnlConfig: ADMINS[username].pnlConfig });
});

// List all chat sessions (all admins can see all, assignedAdmin field shows ownership)
app.get("/api/admin/chats", (req, res) => {
  const { username, password } = req.query;
  if (!authAdmin(username, password))
    return res.status(401).json({ error: "Unauthorized" });
  res.json(Array.from(sessions.values()));
});

// Admin stats — includes per-admin session count
app.get("/api/admin/stats", (req, res) => {
  const { username, password } = req.query;
  if (!authAdmin(username, password))
    return res.status(401).json({ error: "Unauthorized" });
  const all  = Array.from(sessions.values());
  const mine = all.filter((s) => s.assignedAdmin === username);
  res.json({
    pnlConfig:        ADMINS[username].pnlConfig,
    totalSessions:    all.length,
    pendingSessions:  all.filter((s) => s.status === "pending").length,
    activeSessions:   all.filter((s) => s.status === "active").length,
    mySessions:       mine.length,
    adminConnections: adminSockets.size,
    connectedClients: io ? io.engine.clientsCount : 0,
    moneyStore:       money.backendMode(),
    vercel:           IS_VERCEL,
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SOCKET.IO (local / always-on hosts only — not available on Vercel serverless)
// ═══════════════════════════════════════════════════════════════════════════════

if (io) io.on("connection", (socket) => {
  console.log("[Socket] Connected:", socket.id);

  // ── Admin auth ─────────────────────────────────────────────────────────────
  socket.on("admin:join", ({ username, password } = {}) => {
    if (!authAdmin(username, password)) return;
    adminSockets.set(socket.id, username);

    // Join every existing session room
    sessions.forEach((_, sid) => socket.join(sid));

    socket.emit("admin:sessions", Array.from(sessions.values()));
    socket.emit("pnl:mode", ADMINS[username].pnlConfig);
    socket.emit("admin:online", { online: true });
    io.emit("agent:status", { online: true });
    console.log(`[Admin] ${username} joined (socket: ${socket.id}) | admins online: ${adminSockets.size}`);
  });

  // ── Customer: rejoin existing session after reconnect ─────────────────────
  socket.on("chat:rejoin", ({ sessionId } = {}) => {
    const session = sessions.get(sessionId);
    if (!session) { socket.emit("chat:session-expired"); return; }
    session.socketId = socket.id;
    socket.join(sessionId);
    addAdminsToRoom(sessionId);
    socket.emit("chat:session", { sessionId, messages: session.messages });
    socket.emit("agent:status", { online: adminSockets.size > 0 });
    // Push assigned admin's P&L so the visual indicator is accurate
    if (session.assignedAdmin) {
      socket.emit("pnl:mode", getAdminConfig(session.assignedAdmin));
    }
  });

  // ── Customer: start session ────────────────────────────────────────────────
  socket.on("chat:start", ({ name } = {}) => {
    const sessionId   = `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const agentOnline = adminSockets.size > 0;
    const session     = {
      id:            sessionId,
      socketId:      socket.id,
      name:          name?.trim() || "Anonymous",
      messages: [
        makeMsg("system", agentOnline
          ? "👋 Welcome to Bitloom Support! An agent is online and will respond shortly."
          : "👋 Welcome to Bitloom Support! No agents are online — leave your message and we'll reply soon."),
      ],
      status:        "pending",
      createdAt:     new Date().toISOString(),
      readByAgent:   false,
      assignedAdmin: null,
    };

    sessions.set(sessionId, session);
    socket.join(sessionId);
    addAdminsToRoom(sessionId);
    socket.emit("chat:session", { sessionId, messages: session.messages });
    socket.emit("agent:status", { online: agentOnline });
    notifyAllAdmins("admin:new-session", session);
    console.log("[Chat] New session:", sessionId, "from:", session.name);
  });

  // ── Customer: send message ─────────────────────────────────────────────────
  socket.on("chat:message", ({ sessionId, text }) => {
    const session = sessions.get(sessionId);
    if (!session || !text?.trim()) return;
    io.to(sessionId).except(socket.id).emit("chat:typing", { from: "user", isTyping: false, sessionId });
    const msg = makeMsg("user", text.trim());
    session.messages.push(msg);
    session.readByAgent = false;
    io.to(sessionId).emit("chat:message", { ...msg, sessionId });
    notifyAllAdmins("admin:session-updated", { sessionId, session });
  });

  // ── Customer: typing indicator ─────────────────────────────────────────────
  socket.on("chat:typing", ({ sessionId, isTyping }) => {
    const session = sessions.get(sessionId);
    if (!session) return;
    io.to(sessionId).except(socket.id).emit("chat:typing", { from: "user", isTyping, sessionId });
  });

  // ── Admin: send message — assigns admin to session on FIRST reply ──────────
  socket.on("admin:message", ({ sessionId, text, username, password }) => {
    if (!authAdmin(username, password) || adminSockets.get(socket.id) !== username) return;
    const session = sessions.get(sessionId);
    if (!session || !text?.trim()) return;

    io.to(sessionId).except(socket.id).emit("chat:typing", { from: "agent", isTyping: false });

    // Permanently assign this admin to the session on their first reply
    if (!session.assignedAdmin) {
      session.assignedAdmin = username;
      const customerSocket = io.sockets.sockets.get(session.socketId);
      if (customerSocket) customerSocket.emit("pnl:mode", getAdminConfig(username));
      console.log(`[Chat] Session ${sessionId} assigned to ${username}`);
    }

    const msg = makeMsg("agent", text.trim());
    session.messages.push(msg);
    session.status = "active";
    io.to(sessionId).emit("chat:message", { ...msg, sessionId });
    notifyAllAdmins("admin:session-updated", { sessionId, session });
  });

  // ── Admin: typing indicator ────────────────────────────────────────────────
  socket.on("admin:typing", ({ sessionId, isTyping, username, password }) => {
    if (!authAdmin(username, password)) return;
    socket.to(sessionId).emit("chat:typing", { from: "agent", isTyping });
  });

  // ── Admin: mark session as read ───────────────────────────────────────────
  socket.on("admin:read", ({ sessionId, username, password }) => {
    if (!authAdmin(username, password)) return;
    const session = sessions.get(sessionId);
    if (!session) return;
    session.readByAgent = true;
    io.to(sessionId).emit("chat:read");
  });

  // ── Admin: change their own P&L mode ──────────────────────────────────────
  socket.on("admin:set-pnl", ({ mode, customWinRate, username, password }) => {
    if (!authAdmin(username, password) || adminSockets.get(socket.id) !== username) return;
    if (!["auto", "win", "loss", "custom"].includes(mode)) return;
    ADMINS[username].pnlConfig = {
      mode,
      customWinRate: Number(customWinRate) || ADMINS[username].pnlConfig.customWinRate,
    };
    // Notify all sockets belonging to this admin
    notifyAdminsByUsername(username, "pnl:mode", ADMINS[username].pnlConfig);
    // Push updated config to all customers assigned to this admin
    pushPnlToAssignedCustomers(username);
    console.log(`[PnL] ${username} → ${mode}`);
  });

  // ── Admin: close session ───────────────────────────────────────────────────
  socket.on("admin:close-session", ({ sessionId, username, password }) => {
    if (!authAdmin(username, password)) return;
    const session = sessions.get(sessionId);
    if (!session) return;
    session.status = "closed";
    const msg = makeMsg("system", "This support session has been closed. Thank you for contacting Bitloom Support!");
    session.messages.push(msg);
    io.to(sessionId).emit("chat:message", { ...msg, sessionId });
    io.to(sessionId).emit("chat:closed");
    notifyAllAdmins("admin:session-updated", { sessionId, session });
  });

  // ── Disconnect ─────────────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    const wasAdmin = adminSockets.has(socket.id);
    adminSockets.delete(socket.id);
    if (wasAdmin && adminSockets.size === 0) {
      io.emit("agent:status", { online: false });
      console.log("[Admin] Last admin disconnected — customers notified");
    }
    console.log("[Socket] Disconnected:", socket.id);
  });
}); // end io.on connection

// ═══════════════════════════════════════════════════════════════════════════════
if (!IS_VERCEL && httpServer) {
  httpServer.listen(PORT, () => {
    console.log(`\n🚀 Bitloom Backend  →  http://localhost:${PORT}`);
    console.log(`📡 CORS origins   →  ${FRONTEND_ORIGINS.join(", ")}`);
    console.log(`💰 Money store    →  ${money.backendMode()}`);
    if (!isFirebaseReady()) {
      console.log("⚠️  Firebase Admin not configured — using local JSON store (backend/data/)");
      console.log("   Add backend/serviceAccountKey.json to switch to Firestore.");
    }
    const adminNames = Object.keys(ADMINS);
    if (adminNames.length === 0) {
      console.warn("\n⚠️  No admin accounts configured — set ADMIN_MAIN_USER / ADMIN_MAIN_PASS");
      console.warn("   in backend/.env (see backend/.env.example). Admin login is disabled.\n");
    } else {
      console.log("\nAdmin accounts:");
      adminNames.forEach((u) => console.log(`  ${u}${ADMINS[u].main ? "  (main)" : ""}`));
      console.log("");
    }
  });
}

module.exports = app;
