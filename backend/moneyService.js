/**
 * Money facade: Firestore when Firebase Admin is configured, else local JSON store.
 */
const { isFirebaseReady } = require("./firebaseAdmin");
const firestoreMoney = require("./money");
const localMoney = require("./localStore");

function store() {
  return isFirebaseReady() ? firestoreMoney : localMoney;
}

function backendMode() {
  return isFirebaseReady() ? "firestore" : "local-json";
}

module.exports = {
  backendMode,
  ensureUserDoc: (...a) => store().ensureUserDoc(...a),
  findUserByEmail: (...a) => store().findUserByEmail(...a),
  getUser: (...a) => store().getUser(...a),
  creditByEmail: (...a) => store().creditByEmail(...a),
  debitByEmail: (...a) => store().debitByEmail(...a),
  setBalanceByEmail: (...a) => store().setBalanceByEmail(...a),
  freezeByEmail: (...a) => store().freezeByEmail(...a),
  listLedgerByEmail: (...a) => store().listLedgerByEmail(...a),
  listRecentLedger: (...a) => store().listRecentLedger(...a),
  openTrade: (...a) => store().openTrade(...a),
  settleTrade: (...a) => store().settleTrade(...a),
};
