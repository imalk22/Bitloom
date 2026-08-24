import { useEffect, useState } from "react";
import socket from "../socket";

export function useSocketStatus() {
  const [status, setStatus] = useState(socket.connected ? "live" : "offline");

  useEffect(() => {
    const onConnect = () => setStatus("live");
    const onDisconnect = () => setStatus("offline");
    const onReconnectAttempt = () => setStatus("reconnecting");

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.io.on("reconnect_attempt", onReconnectAttempt);

    setStatus(socket.connected ? "live" : "offline");

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.io.off("reconnect_attempt", onReconnectAttempt);
    };
  }, []);

  return status;
}
