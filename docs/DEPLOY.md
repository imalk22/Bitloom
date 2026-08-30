# Bitloom deploy

## Quick check (everything on Vercel — free)

Good for testing login, balance, admin credit, and trades. **Live chat / Socket.IO will not work** on Vercel (serverless). Use Render later for full chat.

1. Push repo to GitHub.
2. [vercel.com](https://vercel.com) → **Add New Project** → import Bitloom.
3. Framework: Vite. Leave build as `npm run build`, output `dist`.
4. **Environment variables** (Project → Settings → Environment Variables) — from `backend/serviceAccountKey.json`:

| Key | Value |
|-----|--------|
| `FIREBASE_PROJECT_ID` | `project_id` from the JSON |
| `FIREBASE_CLIENT_EMAIL` | `client_email` from the JSON |
| `FIREBASE_PRIVATE_KEY` | `private_key` from the JSON (keep the `\n` characters) |
| `ADMIN_MAIN_USER` / `ADMIN_MAIN_PASS` | Owner admin — the only one with the Oversight tab |
| `ADMIN_2_USER` / `ADMIN_2_PASS` | Second admin (optional) |
| `ADMIN_3_USER` / `ADMIN_3_PASS` | Third admin (optional) |

> Admin credentials are read from the environment only. If none are set the
> backend starts with admin login disabled and warns on boot. Never hard-code
> them — this repo is public.

Do **not** set `VITE_API_URL` for same-project deploy (frontend calls `/api/...` on the same domain).

5. Deploy → open `https://YOUR-APP.vercel.app/api/health`  
   Expect `"ok": true`, `"firebase": true`, `"vercel": true`.

6. Firebase Console → **Authentication** → **Settings** → **Authorized domains** → add `YOUR-APP.vercel.app`.

7. Enable **Email/Password** sign-in if not already.

### What works on Vercel check deploy

- Signup / login  
- Balance + admin credit / debit / set / freeze  
- Open / resolve trades  
- Markets UI  

### What does **not** work on Vercel

- Live support chat (needs Socket.IO on an always-on host)

---

## Full product later (chat + API always on)

| Piece | Host |
|--------|------|
| Frontend | Vercel |
| Backend + Socket.IO | Render (or Railway / Fly) |

1. Deploy `backend` on Render (root directory `backend`, `npm start`).
2. Set `FRONTEND_ORIGINS` to your Vercel URL.
3. Set the same Firebase env vars on Render.
4. On Vercel, set `VITE_API_URL` to the Render URL (no trailing slash) and redeploy frontend.

---

## Local

```bash
cd backend && npm start
npm run dev
```

API defaults to `http://localhost:3001`.
