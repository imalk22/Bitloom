const fs = require("fs");
const path = require("path");
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

let ready = false;
let initError = null;
let app = null;

function initFirebaseAdmin() {
  if (ready) return app;
  if (getApps().length) {
    app = getApps()[0];
    ready = true;
    return app;
  }

  try {
    const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
      || path.join(__dirname, "serviceAccountKey.json");

    let credential;
    let projectId;

    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      projectId = process.env.FIREBASE_PROJECT_ID;
      credential = cert({
        projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      });
    } else if (fs.existsSync(keyPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));
      projectId = serviceAccount.project_id;
      credential = cert(serviceAccount);
    } else {
      initError = "Missing backend/serviceAccountKey.json (or FIREBASE_* env vars)";
      console.warn(`[Firebase] ${initError}`);
      console.warn("[Firebase] Using local JSON money store until configured.");
      return null;
    }

    app = initializeApp({ credential });
    ready = true;
    console.log("[Firebase] Admin SDK ready →", projectId);
    return app;
  } catch (err) {
    initError = err.message;
    console.error("[Firebase] Init failed:", err.message);
    return null;
  }
}

function isFirebaseReady() {
  return ready;
}

function getFirebaseInitError() {
  return initError;
}

function db() {
  if (!ready) throw new Error(initError || "Firebase Admin not initialized");
  return getFirestore();
}

function auth() {
  if (!ready) throw new Error(initError || "Firebase Admin not initialized");
  return getAuth();
}

async function verifyIdToken(authHeader) {
  if (!ready) throw Object.assign(new Error("Firebase Admin not configured"), { status: 503 });
  if (!authHeader?.startsWith("Bearer ")) {
    throw Object.assign(new Error("Missing Authorization Bearer token"), { status: 401 });
  }
  const token = authHeader.slice(7);
  return auth().verifyIdToken(token);
}

module.exports = {
  initFirebaseAdmin,
  isFirebaseReady,
  getFirebaseInitError,
  db,
  auth,
  verifyIdToken,
  admin: () => ({ auth: () => auth(), firestore: () => db() }),
};
