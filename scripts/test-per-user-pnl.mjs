/**
 * Per-user P&L control — end-to-end test against a real backend process.
 *
 * Run: node scripts/test-per-user-pnl.mjs
 *
 * The server is booted with Firebase deliberately unconfigured so it uses the
 * local JSON money store; backend/data is backed up and restored around the run
 * so a developer's local balances survive.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(ROOT, "backend", "data");
const PORT = 3998;
const BASE = `http://127.0.0.1:${PORT}`;
const ADMIN = { username: "tdd-admin", password: "tdd-pass" };

const USER_A = { uid: "tdd-uid-a", email: "tdd-a@example.test" };
const USER_B = { uid: "tdd-uid-b", email: "tdd-b@example.test" };

let passed = 0;
const failures = [];

function check(label, actual, expected) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed += 1;
    console.log(`  PASS  ${label}`);
  } else {
    failures.push(label);
    console.log(`  FAIL  ${label}\n        expected ${JSON.stringify(expected)}\n        actual   ${JSON.stringify(actual)}`);
  }
}

// ── data dir backup / restore ────────────────────────────────────────────────
// Backups live outside the repo so an interrupted run never leaves one behind.
function backupData() {
  if (!fs.existsSync(DATA_DIR)) return null;
  const backup = path.join(os.tmpdir(), `bitloom-data-${Date.now()}`);
  fs.cpSync(DATA_DIR, backup, { recursive: true });
  return backup;
}

function restoreData(backup) {
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
  if (backup) {
    fs.cpSync(backup, DATA_DIR, { recursive: true });
    fs.rmSync(backup, { recursive: true, force: true });
  }
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────
async function get(pathname, params = {}) {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}${pathname}${q ? `?${q}` : ""}`);
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function post(pathname, body, headers = {}) {
  const res = await fetch(`${BASE}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

const asUser = (user) => ({ "x-user-uid": user.uid, "x-user-email": user.email });

async function me(user) {
  const res = await fetch(`${BASE}/api/me`, { headers: asUser(user) });
  return res.json();
}

/** Open a trade and resolve it, telling the server what the market actually did. */
async function tradeOnce(user, { marketWon, amount = 100, pct = 80 }) {
  const open = await post("/api/trade/open", { amount, pct, symbol: "BTCUSDT", side: "buy" }, asUser(user));
  if (open.status !== 200) throw new Error(`open failed for ${user.email}: ${JSON.stringify(open.body)}`);
  const resolved = await post(
    "/api/trade/resolve",
    { marketWon, tradeId: open.body.tradeId, amount, pct },
    asUser(user)
  );
  if (resolved.status !== 200) throw new Error(`resolve failed for ${user.email}: ${JSON.stringify(resolved.body)}`);
  return resolved.body;
}

const setPnl = (email, mode, customWinRate) =>
  post("/api/admin/users/pnl", { ...ADMIN, email, mode, customWinRate });

// ── server lifecycle ─────────────────────────────────────────────────────────
function startServer() {
  const child = spawn(process.execPath, [path.join(ROOT, "backend", "server.js")], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(PORT),
      ADMIN_MAIN_USER: ADMIN.username,
      ADMIN_MAIN_PASS: ADMIN.password,
      ADMIN_2_USER: "", ADMIN_2_PASS: "", ADMIN_3_USER: "", ADMIN_3_PASS: "",
      // Force the local JSON store — never touch the real Firestore project.
      FIREBASE_SERVICE_ACCOUNT_PATH: path.join(ROOT, "backend", "__no_such_key__.json"),
      FIREBASE_PROJECT_ID: "",
      FIREBASE_CLIENT_EMAIL: "",
      FIREBASE_PRIVATE_KEY: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", () => {});
  child.stderr.on("data", (d) => process.stderr.write(`[server] ${d}`));
  return child;
}

async function waitForHealth(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return res.json();
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("Backend did not start in time");
}

// ── the test ─────────────────────────────────────────────────────────────────
const backup = backupData();
const server = startServer();

try {
  const health = await waitForHealth();
  check("server uses the local JSON store", health.moneyStore, "local-json");

  // Both users exist and hold the same starting balance.
  await me(USER_A);
  await me(USER_B);
  await post("/api/admin/users/credit", { ...ADMIN, email: USER_A.email, amount: 1000 });
  await post("/api/admin/users/credit", { ...ADMIN, email: USER_B.email, amount: 1000 });

  console.log("\nper-user override applies to the targeted user only");
  const setA = await setPnl(USER_A.email, "loss");
  check("admin can set one user to forced loss", [setA.status, setA.body.mode, setA.body.email], [200, "loss", USER_A.email]);

  const aWinningTrade = await tradeOnce(USER_A, { marketWon: true });
  check("targeted user loses a winning market trade", aWinningTrade.won, false);
  check("targeted user's stake is gone", aWinningTrade.pnl, -100);

  const bWinningTrade = await tradeOnce(USER_B, { marketWon: true });
  check("other user is untouched and still wins", bWinningTrade.won, true);
  check("other user is paid the market profit", bWinningTrade.pnl, 80);

  console.log("\nforced win is also per-user");
  await setPnl(USER_B.email, "win");
  const bLosingTrade = await tradeOnce(USER_B, { marketWon: false });
  check("second user now wins a losing market trade", bLosingTrade.won, true);

  const aStillLoses = await tradeOnce(USER_A, { marketWon: true });
  check("first user's own override survives the second change", aStillLoses.won, false);

  console.log("\nadmin can read back who is overridden");
  const search = await get("/api/admin/users/search", { ...ADMIN, email: USER_A.email });
  check("user search reports the user's mode", search.body.pnlMode, "loss");

  const overrides = await get("/api/admin/pnl-overrides", ADMIN);
  const rows = Object.fromEntries((overrides.body.users || []).map((u) => [u.email, u.mode]));
  check("override list covers both users", [rows[USER_A.email], rows[USER_B.email]], ["loss", "win"]);

  console.log("\nclearing an override returns the user to the real market");
  await setPnl(USER_A.email, "auto");
  const aAuto = await tradeOnce(USER_A, { marketWon: true });
  check("cleared user wins when the market wins", aAuto.won, true);
  const aAutoLoss = await tradeOnce(USER_A, { marketWon: false });
  check("cleared user loses when the market loses", aAutoLoss.won, false);

  const clearedList = await get("/api/admin/pnl-overrides", ADMIN);
  const clearedEmails = (clearedList.body.users || []).map((u) => u.email);
  check("cleared user drops off the override list", clearedEmails.includes(USER_A.email), false);

  console.log("\ncustomers can read their own mode, and only their own");
  await setPnl(USER_A.email, "loss");
  const aMine = await (await fetch(`${BASE}/api/my-pnl`, { headers: asUser(USER_A) })).json();
  const bMine = await (await fetch(`${BASE}/api/my-pnl`, { headers: asUser(USER_B) })).json();
  check("user A sees their own forced loss", aMine.mode, "loss");
  check("user B sees their own forced win", bMine.mode, "win");

  console.log("\nbad input is rejected");
  const badMode = await setPnl(USER_A.email, "banana");
  check("invalid mode is rejected", badMode.status, 400);
  const noAuth = await post("/api/admin/users/pnl", { username: "nope", password: "nope", email: USER_A.email, mode: "win" });
  check("non-admin cannot set a user's mode", noAuth.status, 401);
  const unknownUser = await setPnl("nobody@example.test", "win");
  check("unknown email is rejected", unknownUser.status, 404);
} catch (err) {
  failures.push(err.message);
  console.error(`\n  ERROR ${err.message}`);
} finally {
  // Wait for the server to release its file handles, or Windows refuses the
  // delete and the developer's data never comes back.
  const stopped = new Promise((resolve) => server.once("exit", resolve));
  server.kill();
  await Promise.race([stopped, new Promise((r) => setTimeout(r, 5000))]);
  restoreData(backup);
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log(failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}
