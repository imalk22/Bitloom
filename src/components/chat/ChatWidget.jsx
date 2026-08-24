import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X, Headphones } from "lucide-react";
import socket from "../../socket";

const CHAT_STORAGE_KEY = "Bitloom_chat_session";

function TypingDots() {
  return (
    <div className="flex items-center gap-0.5 px-1">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)]"
          style={{ animationDelay: `${delay}ms`, animationDuration: "0.9s" }}
        />
      ))}
    </div>
  );
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [prevOpen, setPrevOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [name, setName] = useState("");
  const [started, setStarted] = useState(false);
  const [closed, setClosed] = useState(false);
  const [agentOnline, setAgentOnline] = useState(false);
  const [agentTyping, setAgentTyping] = useState(false);
  const [msgRead, setMsgRead] = useState(false);
  const [unread, setUnread] = useState(0);
  const [sockConnected, setSockConnected] = useState(socket.connected);
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const sessionIdRef = useRef(null);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setUnread(0);
  }

  useEffect(() => {
    const onConnect = () => {
      setSockConnected(true);
      const saved = sessionIdRef.current || localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) socket.emit("chat:rejoin", { sessionId: saved });
    };
    const onDisconnect = () => setSockConnected(false);
    const onSession = ({ sessionId: sid, messages: msgs }) => {
      setSessionId(sid);
      sessionIdRef.current = sid;
      localStorage.setItem(CHAT_STORAGE_KEY, sid);
      setMessages(msgs);
      setStarted(true);
      setClosed(false);
    };
    const onExpired = () => {
      localStorage.removeItem(CHAT_STORAGE_KEY);
      sessionIdRef.current = null;
      setStarted(false);
      setMessages([]);
      setSessionId(null);
    };
    const onMsg = ({ sessionId: _sid, ...msg }) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      if (msg.from !== "user") setUnread((u) => u + 1);
      if (msg.from === "agent") setMsgRead(false);
    };
    const onTyping = ({ from, isTyping }) => {
      if (from === "agent") setAgentTyping(isTyping);
    };
    const onRead = () => setMsgRead(true);
    const onClosed = () => {
      setClosed(true);
      setAgentTyping(false);
      localStorage.removeItem(CHAT_STORAGE_KEY);
    };
    const onAgent = ({ online }) => setAgentOnline(online);

    const savedId = localStorage.getItem(CHAT_STORAGE_KEY);
    if (savedId && socket.connected) {
      sessionIdRef.current = savedId;
      socket.emit("chat:rejoin", { sessionId: savedId });
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("chat:session", onSession);
    socket.on("chat:session-expired", onExpired);
    socket.on("chat:message", onMsg);
    socket.on("chat:typing", onTyping);
    socket.on("chat:read", onRead);
    socket.on("chat:closed", onClosed);
    socket.on("agent:status", onAgent);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("chat:session", onSession);
      socket.off("chat:session-expired", onExpired);
      socket.off("chat:message", onMsg);
      socket.off("chat:typing", onTyping);
      socket.off("chat:read", onRead);
      socket.off("chat:closed", onClosed);
      socket.off("agent:status", onAgent);
    };
  }, []);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [open, messages.length, agentTyping]);

  const startChat = () => {
    if (!sockConnected) return;
    socket.emit("chat:start", { name: name.trim() || "Anonymous" });
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    const sid = sessionIdRef.current;
    if (!sid) return;
    socket.emit("chat:typing", { sessionId: sid, isTyping: e.target.value.length > 0 });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("chat:typing", { sessionId: sid, isTyping: false });
    }, 2500);
  };

  const sendMsg = () => {
    const sid = sessionIdRef.current;
    if (!input.trim() || !sid || closed || !sockConnected) return;
    clearTimeout(typingTimeoutRef.current);
    socket.emit("chat:typing", { sessionId: sid, isTyping: false });
    socket.emit("chat:message", { sessionId: sid, text: input.trim() });
    setInput("");
    setMsgRead(false);
  };

  const fmt = (iso) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="flex w-[340px] flex-col overflow-hidden rounded-[8px] border border-[var(--border)] bg-[var(--bg)] shadow-2xl">
          <div className="flex items-center gap-3 bg-[var(--accent)] px-4 py-3">
            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                <Headphones className="h-5 w-5 text-white" />
              </div>
              <div
                className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--accent)] ${
                  agentOnline ? "bg-[var(--up)]" : "bg-[var(--muted)]"
                }`}
              />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">Bitloom Support</div>
              <div className="text-[10px] text-white/80">
                {!sockConnected ? "Connecting…" : agentOnline ? "Agent online" : "Leave a message"}
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="cursor-pointer text-white/70 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[320px] flex-1 space-y-2 overflow-y-auto p-3">
            {!started ? (
              <div className="flex h-44 flex-col items-center justify-center gap-3 px-2 text-center">
                <MessageCircle className="h-7 w-7 text-[var(--accent)]" />
                <p className="text-xs text-[var(--muted)]">
                  {agentOnline ? "An agent is online and ready to help." : "Send a message and we’ll reply soon."}
                </p>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && startChat()}
                  className="w-full rounded-[4px] border border-[var(--border)] bg-[var(--elevated)] px-3 py-2 text-center text-xs text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                  placeholder="Your name (optional)"
                />
                <button
                  type="button"
                  onClick={startChat}
                  disabled={!sockConnected}
                  className="w-full cursor-pointer rounded-[4px] bg-[var(--accent)] py-2.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {sockConnected ? "Start conversation" : "Connecting…"}
                </button>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.from === "user" ? "items-end" : "items-start"}`}>
                    {msg.from === "system" ? (
                      <div className="w-full py-1 text-center text-[10px] italic text-[var(--muted)]">{msg.text}</div>
                    ) : (
                      <>
                        {msg.from === "agent" && (
                          <div className="mb-0.5 ml-1 text-[9px] font-semibold text-[var(--muted)]">Support</div>
                        )}
                        <div
                          className={`max-w-[82%] rounded-[8px] px-3 py-2 text-xs leading-relaxed ${
                            msg.from === "user"
                              ? "rounded-br-sm bg-[var(--accent)] text-white"
                              : "rounded-bl-sm bg-[var(--elevated)] text-[var(--text)]"
                          }`}
                        >
                          {msg.text}
                        </div>
                        <div className="mx-1 mt-0.5 text-[9px] text-[var(--muted)]">{fmt(msg.time)}</div>
                      </>
                    )}
                  </div>
                ))}
                {agentTyping && (
                  <div className="flex items-center gap-2 rounded-[8px] bg-[var(--elevated)] px-3 py-2">
                    <span className="text-[10px] italic text-[var(--muted)]">Agent is typing</span>
                    <TypingDots />
                  </div>
                )}
                {msgRead && !closed && <div className="pr-1 text-right text-[9px] text-[var(--up)]">Read</div>}
                {closed && <div className="border-t border-[var(--border)] pt-2 text-center text-[10px] italic text-[var(--muted)]">Session closed</div>}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {started && !closed && (
            <div className="flex gap-2 border-t border-[var(--border)] p-2.5">
              <input
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMsg()}
                className="flex-1 rounded-[4px] border border-[var(--border)] bg-[var(--elevated)] px-3 py-2 text-xs text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                placeholder="Type a message…"
              />
              <button
                type="button"
                onClick={sendMsg}
                disabled={!input.trim()}
                className="cursor-pointer rounded-[4px] bg-[var(--accent)] p-2 text-white disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-full shadow-lg ${
          open ? "border border-[var(--border)] bg-[var(--elevated)] text-[var(--text)]" : "bg-[var(--accent)] text-white"
        }`}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        {!open && unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--down)] text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {/* keep sessionId referenced for lint cleanliness */}
      <span className="sr-only">{sessionId}</span>
    </div>
  );
}
