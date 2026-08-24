# Bitloom backend setup

## Quick start (works today — local JSON money DB)

```bash
cd backend
npm install
npm run dev
```

Money is stored in `backend/data/` until Firebase Admin is configured.

## Switch to Firestore (production)

1. Firebase Console → Project settings → Service accounts → Generate new private key
2. Save as `backend/serviceAccountKey.json`
3. Restart backend — health check should show `"moneyStore":"firestore"`

## Admin money APIs

```http
POST /api/admin/users/credit
{ "username":"admin1", "password":"…", "email":"user@example.com", "amount":1000, "note":"Deposit" }
```

User must log in once first so their email is registered.
