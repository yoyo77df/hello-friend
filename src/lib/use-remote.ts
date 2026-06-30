import { useCallback, useEffect, useRef, useState } from "react";

export type Status = "disconnected" | "connecting" | "connected" | "error";

export type RemoteCommand =
  | { type: "mouse_move"; dx: number; dy: number }
  | { type: "mouse_click"; button: "left" | "right" | "middle"; double?: boolean }
  | { type: "mouse_scroll"; dy: number }
  | { type: "key_tap"; key: string; modifiers?: string[] }
  | { type: "key_type"; text: string }
  | { type: "media"; action: "play_pause" | "next" | "prev" | "vol_up" | "vol_down" | "mute" }
  | { type: "system"; action: "lock" | "sleep" | "shutdown" | "screenshot" }
  | { type: "launch"; target: string }
  | { type: "exec"; command: string };

const LS_KEY = "remote_ws_url";

export function useRemote() {
  const [status, setStatus] = useState<Status>("disconnected");
  const [url, setUrl] = useState<string>(() => {
    if (typeof window === "undefined") return "ws://192.168.1.10:8765";
    return localStorage.getItem(LS_KEY) || "ws://192.168.1.10:8765";
  });
  const [log, setLog] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const pushLog = (msg: string) =>
    setLog((l) => [`${new Date().toLocaleTimeString()}  ${msg}`, ...l].slice(0, 40));

  const connect = useCallback((target?: string) => {
    const u = target || url;
    if (typeof window === "undefined") return;
    try {
      wsRef.current?.close();
    } catch {}
    setStatus("connecting");
    pushLog(`connecting to ${u}`);
    localStorage.setItem(LS_KEY, u);
    setUrl(u);
    try {
      const ws = new WebSocket(u);
      wsRef.current = ws;
      ws.onopen = () => {
        setStatus("connected");
        pushLog("connected ✓");
      };
      ws.onclose = () => {
        setStatus("disconnected");
        pushLog("disconnected");
      };
      ws.onerror = () => {
        setStatus("error");
        pushLog("error — is the PC agent running?");
      };
      ws.onmessage = (e) => pushLog(`pc → ${e.data}`);
    } catch (err) {
      setStatus("error");
      pushLog(String(err));
    }
  }, [url]);

  const send = useCallback((cmd: RemoteCommand) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      pushLog(`⚠️  not connected — would send: ${cmd.type}`);
      return false;
    }
    ws.send(JSON.stringify(cmd));
    return true;
  }, []);

  useEffect(() => () => wsRef.current?.close(), []);

  return { status, url, setUrl, connect, send, log };
}
