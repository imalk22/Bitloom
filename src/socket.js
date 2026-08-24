import { io } from "socket.io-client";
import { API_BASE } from "./config.js";

// On Vercel same-origin deploy, Socket.IO is unavailable — connect only when a real API host is set or in local dev.
const socketTarget = API_BASE || undefined;

const socket = io(socketTarget || "http://localhost:3001", {
  autoConnect: Boolean(API_BASE) || (typeof import.meta !== "undefined" && !import.meta.env?.PROD),
  reconnectionAttempts: 5,
  reconnectionDelay: 1500,
});

export default socket;
