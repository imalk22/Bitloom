import { io } from "socket.io-client";
import { API_BASE } from "./config.js";

// API_BASE === "" → same origin. In dev that's the Vite host, which proxies
// /socket.io through to the backend. On a same-origin Vercel deploy there is no
// Socket.IO server (serverless), so don't attempt a connection there.
const isDev = typeof import.meta !== "undefined" && !import.meta.env?.PROD;

const socket = io(API_BASE || undefined, {
  autoConnect: Boolean(API_BASE) || isDev,
  reconnectionAttempts: 5,
  reconnectionDelay: 1500,
});

export default socket;
