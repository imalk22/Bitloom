import { io } from "socket.io-client";

const socket = io("http://localhost:3001", {
  autoConnect: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1500,
});

export default socket;
