/** Backend API / Socket.IO base URL */
const envUrl =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL
    ? String(import.meta.env.VITE_API_URL).replace(/\/$/, "")
    : "";

// Empty string → same origin, so every call is a relative `/api/...`:
//   dev  → Vite proxies /api + /socket.io to the backend (see vite.config.js)
//   prod → Vercel serves the API on the same domain
// Set VITE_API_URL only to point at a separate backend host (e.g. Render).
export const API_BASE = envUrl;
