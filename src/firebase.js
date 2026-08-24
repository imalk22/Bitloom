import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  getFirestore,
  doc, getDoc, setDoc, updateDoc,
  collection, addDoc, getDocs,
  orderBy, query, limit,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey:            "AIzaSyAxTMDYGEP4j91RYvujkJHn9sdA9t5weBU",
  authDomain:        "tradingnavo-c1de2.firebaseapp.com",
  projectId:         "tradingnavo-c1de2",
  storageBucket:     "tradingnavo-c1de2.firebasestorage.app",
  messagingSenderId: "742376183460",
  appId:             "1:742376183460:web:1111e9532b1c1ea5b33831",
};

const app = initializeApp(firebaseConfig);

export const auth           = getAuth(app);
export const db             = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// ─── USER PROFILE ─────────────────────────────────────────────────────────────

export async function loadUserProfile(uid, extra = {}) {
  const ref  = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    // Keep email on the profile for admin lookup (client may set once; backend overwrites when Admin SDK is on)
    if (extra.email && !data.email) {
      await updateDoc(ref, { email: String(extra.email).toLowerCase(), displayName: extra.displayName || data.displayName || "", updatedAt: new Date().toISOString() });
      return { ...data, email: String(extra.email).toLowerCase() };
    }
    return data;
  }
  const profile = {
    balance: 0,
    email: extra.email ? String(extra.email).toLowerCase() : "",
    displayName: extra.displayName || "",
    frozen: false,
    createdAt: new Date().toISOString(),
  };
  await setDoc(ref, profile);
  return profile;
}

/** @deprecated Balance is owned by the backend — do not call from trade flows */
export async function updateUserBalance(uid, balance) {
  console.warn("updateUserBalance is deprecated; balance is server-owned");
  await updateDoc(doc(db, "users", uid), { balance, updatedAt: new Date().toISOString() });
}

// ─── TRADES ───────────────────────────────────────────────────────────────────

export async function saveTrade(uid, trade) {
  await addDoc(collection(db, "users", uid, "trades"), {
    ...trade,
    savedAt: new Date().toISOString(),
  });
}

export async function loadTrades(uid) {
  const q    = query(collection(db, "users", uid, "trades"), orderBy("completedAt", "desc"), limit(100));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ firestoreId: d.id, ...d.data() }));
}
