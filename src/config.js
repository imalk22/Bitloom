/** Backend API / Socket.IO base URL */
export const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL?.replace(/\/$/, ""))
  || "http://localhost:3001";
