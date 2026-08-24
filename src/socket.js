import { io } from "socket.io-client";
import { API_BASE } from "./config.js";

const socket = io(API_BASE, {
  autoConnect: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1500,
});

export default socket;
