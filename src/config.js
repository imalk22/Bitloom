/** Backend API / Socket.IO base URL */
const envUrl =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL
    ? String(import.meta.env.VITE_API_URL).replace(/\/$/, "")
    : "";

// Production on Vercel (same origin): empty string → `/api/...`
// Local: default to localhost backend
export const API_BASE =
  envUrl ||
  (typeof import.meta !== "undefined" && import.meta.env?.PROD ? "" : "http://localhost:3001");
