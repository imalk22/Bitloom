# Deploy Bitloom

## Important

| Part | Where | Why |
|------|--------|-----|
| **Frontend** | **Vercel** | Static Vite app — perfect for Vercel |
| **Backend** | **Render** (or Railway) | Needs always-on Node + Socket.IO. Vercel serverless **cannot** run our chat/admin sockets reliably |

## 1) Backend on Render (do this first)

1. Go to https://render.com → New → Web Service → connect `imalk22/Bitloom`
2. Settings:
   - **Root Directory:** `backend`
   - **Build:** `npm install`
   - **Start:** `npm start`
3. Environment variables:
   - `FRONTEND_ORIGIN` = your Vercel URL later (e.g. `https://bitloom.vercel.app`) — for now you can add `http://localhost:5173` and update after Vercel deploy
   - `FIREBASE_PROJECT_ID` = `tradingnavo-c1de2`
   - `FIREBASE_CLIENT_EMAIL` = from `serviceAccountKey.json` → `client_email`
   - `FIREBASE_PRIVATE_KEY` = from `serviceAccountKey.json` → `private_key` (keep `\n` newlines; paste the full key including BEGIN/END)
4. Deploy → copy URL like `https://bitloom-backend.onrender.com`
5. Open `/api/health` — should show `"firebase": true`

## 2) Frontend on Vercel

1. Go to https://vercel.com → Add New Project → import `imalk22/Bitloom`
2. Framework: Vite (auto)
3. Environment variable:
   - `VITE_API_URL` = `https://bitloom-backend.onrender.com` (your Render URL, no trailing slash)
4. Deploy
5. Copy the Vercel URL

## 3) Connect them

1. Render → update `FRONTEND_ORIGIN` to your Vercel URL (and `http://localhost:5173` if you still develop locally, comma-separated)
2. Redeploy backend
3. Firebase Console → Authentication → Settings → Authorized domains → add your Vercel domain

## Local still works

```bash
# terminal 1
cd backend && npm run dev

# terminal 2
npm run dev
```

Without `VITE_API_URL`, frontend uses `http://localhost:3001`.
