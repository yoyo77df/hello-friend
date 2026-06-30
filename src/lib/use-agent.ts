import { useCallback, useEffect, useRef, useState } from "react";

export type Status = "disconnected" | "connecting" | "connected" | "error";

export type AgentCommand = {
  type: string;
  // discriminated loosely; agent ignores nulls
  command?: string | null;
  target?: string | null;
  key?: string | null;
  modifiers?: string[] | null;
  text?: string | null;
  action?: string | null;
  url?: string | null;
  query?: string | null;
  dx?: number; dy?: number;
  button?: "left" | "right" | "middle";
  double?: boolean;
};

const LS_KEY = "myraa_ws_url";

export function useAgent() {
  const [status, setStatus] = useState<Status>("disconnected");
  const [url, setUrl] = useState<string>(() => {
    if (typeof window === "undefined") return "ws://192.168.1.10:8765";
    return localStorage.getItem(LS_KEY) || "ws://192.168.1.10:8765";
  });
  const [log, setLog] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const pushLog = useCallback((msg: string) => {
    setLog((l) => [`${new Date().toLocaleTimeString()} · ${msg}`, ...l].slice(0, 60));
  }, []);

  const connect = useCallback(
    (target?: string) => {
      const u = target || url;
      if (typeof window === "undefined") return;
      try { wsRef.current?.close(); } catch {}
      setStatus("connecting");
      pushLog(`connecting → ${u}`);
      localStorage.setItem(LS_KEY, u);
      setUrl(u);
      try {
        const ws = new WebSocket(u);
        wsRef.current = ws;
        ws.onopen = () => { setStatus("connected"); pushLog("agent online ✓"); };
        ws.onclose = () => { setStatus("disconnected"); pushLog("agent offline"); };
        ws.onerror = () => { setStatus("error"); pushLog("connection error — agent running?"); };
        ws.onmessage = (e) => {
          try {
            const m = JSON.parse(e.data);
            if (m.type === "log") pushLog(`pc → ${m.text}`);
            else if (m.type === "hello") pushLog(`pc ready · ${m.platform}`);
            else pushLog(`pc → ${e.data}`);
          } catch { pushLog(`pc → ${e.data}`); }
        };
      } catch (err) {
        setStatus("error");
        pushLog(String(err));
      }
    },
    [url, pushLog],
  );

  const send = useCallback(
    (cmd: AgentCommand) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        pushLog(`⚠ offline — skipped ${cmd.type}`);
        return false;
      }
      ws.send(JSON.stringify(cmd));
      const detail =
        cmd.command || cmd.target || cmd.url || cmd.query || cmd.text || cmd.action || cmd.key || "";
      pushLog(`me → ${cmd.type}${detail ? `: ${String(detail).slice(0, 80)}` : ""}`);
      return true;
    },
    [pushLog],
  );

  useEffect(() => () => wsRef.current?.close(), []);

  return { status, url, setUrl, connect, send, log };
}
