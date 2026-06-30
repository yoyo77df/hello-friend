import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Mic, MicOff, Send, Globe, Eye, Terminal, Wifi, WifiOff, Loader2,
  Download, X, Power, Lock, Camera, Volume2,
} from "lucide-react";
import { useAgent, type AgentCommand } from "@/lib/use-agent";
import { interpretCommand } from "@/lib/myraa-ai.functions";
import earthImg from "@/assets/earth.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MYRAA — Neural Desktop Companion" },
      { name: "description", content: "MYRAA is Rupom's personal AI desktop assistant. Full native Windows control via natural language." },
    ],
  }),
  component: Dashboard,
});

type Msg = { id: string; role: "user" | "myraa" | "system"; text: string; ts: number };

function Dashboard() {
  const { status, url, setUrl, connect, send, log } = useAgent();
  const interpret = useServerFn(interpretCommand);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [showConn, setShowConn] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [muted, setMuted] = useState(true);
  const [lang, setLang] = useState<"BANGLA" | "ENGLISH">("BANGLA");

  const convoRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    convoRef.current?.scrollTo({ top: convoRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const add = (m: Omit<Msg, "id" | "ts">) =>
    setMessages((x) => [...x, { ...m, id: crypto.randomUUID(), ts: Date.now() }]);

  async function submit(text: string) {
    const q = text.trim();
    if (!q || thinking) return;
    add({ role: "user", text: q });
    setInput("");
    setThinking(true);
    try {
      const res = await interpret({ data: { prompt: `[${lang}] ${q}` } });
      add({ role: "myraa", text: res.reply });
      for (const cmd of res.commands) {
        const c: AgentCommand = {
          type: cmd.type,
          command: cmd.command ?? undefined,
          target: cmd.target ?? undefined,
          key: cmd.key ?? undefined,
          modifiers: cmd.modifiers ?? undefined,
          text: cmd.text ?? undefined,
          action: cmd.action ?? undefined,
          url: cmd.url ?? undefined,
          query: cmd.query ?? undefined,
        };
        send(c);
      }
    } catch (e) {
      add({ role: "system", text: `error: ${(e as Error).message}` });
    } finally {
      setThinking(false);
    }
  }

  const dotColor =
    status === "connected" ? "bg-primary shadow-[0_0_12px_var(--color-primary)]"
    : status === "connecting" ? "bg-amber-400 animate-pulse"
    : status === "error" ? "bg-destructive"
    : "bg-muted-foreground";

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* TOP BAR */}
      <header className="relative z-20 flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 border border-primary/40 grid place-items-center glow-cyan">
            <span className="font-display text-xl text-primary glow-text">M</span>
          </div>
          <div>
            <h1 className="font-display text-2xl font-black text-primary glow-text leading-none">MYRAA</h1>
            <p className="font-display text-[10px] text-muted-foreground mt-1">NEURAL COMPANION · v0.2</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang((l) => (l === "BANGLA" ? "ENGLISH" : "BANGLA"))}
            className="glass rounded-full px-4 h-9 flex items-center gap-2 text-xs font-display tracking-wider hover:border-primary/50 transition"
          >
            <Globe className="w-3.5 h-3.5 text-primary" /> {lang}
          </button>
          <IconChip onClick={() => setShowSetup(true)} title="Setup">
            <Download className="w-4 h-4" />
          </IconChip>
          <IconChip onClick={() => setShowConn((s) => !s)} title="Connect">
            {status === "connected" ? <Wifi className="w-4 h-4 text-primary" /> :
             status === "connecting" ? <Loader2 className="w-4 h-4 animate-spin" /> :
             <WifiOff className="w-4 h-4" />}
          </IconChip>
          <IconChip onClick={() => setShowConsole((s) => !s)} title="Console">
            <Terminal className="w-4 h-4" />
          </IconChip>
          <div className="glass rounded-full px-3 h-9 flex items-center gap-2 text-[10px] font-display tracking-widest">
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
            {status === "connected" ? "ONLINE" : status === "connecting" ? "LINKING" : "IDLE"}
          </div>
        </div>
      </header>

      {/* CONNECTION PANEL */}
      {showConn && (
        <div className="relative z-20 mx-6 mb-3 glass rounded-2xl p-3 flex gap-2 float-up">
          <input
            value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="ws://192.168.x.x:8765"
            className="flex-1 h-10 px-3 rounded-lg bg-input/60 border border-border text-sm font-mono outline-none focus:ring-2 ring-primary"
          />
          <button onClick={() => { connect(); setShowConn(false); }}
            className="h-10 px-5 rounded-lg bg-primary text-primary-foreground font-display tracking-wider text-sm">
            LINK
          </button>
        </div>
      )}

      {/* MAIN GRID */}
      <main className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 px-6 pb-32">
        {/* EARTH STAGE */}
        <section className="relative flex items-center justify-center min-h-[480px] lg:min-h-[640px]">
          <div className="relative">
            {/* outer orbital ring */}
            <div className="absolute inset-0 -m-16 rounded-full border border-primary/15 orbit-spin" />
            <div className="absolute inset-0 -m-8 rounded-full border border-primary/10" />
            {/* glow */}
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-3xl glow-pulse" />
            {/* earth */}
            <img
              src={earthImg}
              alt="Earth"
              width={520} height={520}
              className="relative w-[280px] h-[280px] sm:w-[400px] sm:h-[400px] lg:w-[520px] lg:h-[520px] rounded-full earth-spin select-none drop-shadow-[0_0_60px_hsl(188_100%_55%/0.4)]"
              draggable={false}
            />
            {/* orbital network overlay */}
            <svg className="absolute inset-0 pointer-events-none orbit-spin" viewBox="0 0 520 520">
              <ellipse cx="260" cy="260" rx="245" ry="80" fill="none" stroke="hsl(188 100% 55% / 0.35)" strokeWidth="1" />
              <ellipse cx="260" cy="260" rx="245" ry="120" fill="none" stroke="hsl(188 100% 55% / 0.2)" strokeWidth="1" transform="rotate(35 260 260)" />
              <ellipse cx="260" cy="260" rx="245" ry="100" fill="none" stroke="hsl(280 100% 70% / 0.25)" strokeWidth="1" transform="rotate(-30 260 260)" />
              {[...Array(8)].map((_, i) => (
                <circle key={i} cx={260 + Math.cos(i) * 240} cy={260 + Math.sin(i * 2) * 100} r="2"
                  fill="hsl(188 100% 70%)" opacity="0.8" />
              ))}
            </svg>
          </div>
        </section>

        {/* CONVERSATION PANEL */}
        <aside className="glass rounded-2xl p-5 flex flex-col h-[640px]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-sm tracking-widest text-primary glow-text">CONVERSATION</h2>
            <span className="text-[10px] font-mono text-muted-foreground">{messages.length} msg</span>
          </div>
          <div ref={convoRef} className="flex-1 overflow-y-auto pr-1 space-y-3 text-sm">
            {messages.length === 0 && (
              <div className="text-muted-foreground italic text-sm">Say hi to Myraa — she's listening.</div>
            )}
            {messages.map((m) => <Bubble key={m.id} m={m} />)}
            {thinking && (
              <div className="flex gap-1 items-center text-primary text-xs font-display tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                MYRAA IS THINKING…
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* BOTTOM COMMAND BAR */}
      <div className="fixed bottom-0 inset-x-0 z-30 px-6 pb-6 pt-3 bg-gradient-to-t from-background via-background/90 to-transparent">
        <form
          onSubmit={(e) => { e.preventDefault(); submit(input); }}
          className="max-w-3xl mx-auto glass rounded-full p-2 flex items-center gap-2 glow-cyan"
        >
          <button type="button" onClick={() => setMuted((m) => !m)}
            className="w-11 h-11 rounded-full bg-secondary/60 grid place-items-center hover:bg-secondary transition">
            {muted ? <MicOff className="w-4 h-4 text-muted-foreground" /> : <Mic className="w-4 h-4 text-primary" />}
          </button>
          <input
            value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Talk to Myraa…"
            className="flex-1 bg-transparent outline-none text-base px-3 placeholder:text-muted-foreground/70"
          />
          <button type="submit" disabled={thinking || !input.trim()}
            className="w-11 h-11 rounded-full bg-primary text-primary-foreground grid place-items-center disabled:opacity-30 hover:scale-105 active:scale-95 transition">
            {thinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
        <p className="text-center text-[10px] font-display tracking-[0.3em] text-muted-foreground/60 mt-3">
          TAP MIC TO START A CONTINUOUS VOICE CALL
        </p>
      </div>

      {/* QUICK ACTIONS — floating */}
      <div className="fixed left-6 top-1/2 -translate-y-1/2 z-20 hidden lg:flex flex-col gap-2">
        <QuickAct icon={<Lock />} label="Lock" onClick={() => send({ type: "system", action: "lock" })} />
        <QuickAct icon={<Camera />} label="Shot" onClick={() => send({ type: "system", action: "screenshot" })} />
        <QuickAct icon={<Volume2 />} label="Vol+" onClick={() => send({ type: "media", action: "vol_up" })} />
        <QuickAct icon={<Eye />} label="Show" onClick={() => setShowConsole((s) => !s)} />
        <QuickAct icon={<Power />} label="Off" danger onClick={() => {
          if (confirm("Shutdown PC?")) send({ type: "system", action: "shutdown" });
        }} />
      </div>

      {/* CONSOLE DRAWER */}
      {showConsole && (
        <div className="fixed right-6 bottom-28 z-30 w-96 max-h-80 glass rounded-2xl p-4 float-up">
          <div className="flex items-center justify-between mb-2">
            <span className="font-display text-xs tracking-widest text-primary">AGENT CONSOLE</span>
            <button onClick={() => setShowConsole(false)}><X className="w-4 h-4" /></button>
          </div>
          <div className="overflow-y-auto max-h-64 font-mono text-[11px] space-y-1">
            {log.length === 0 && <div className="text-muted-foreground">Nothing yet.</div>}
            {log.map((l, i) => <div key={i} className="text-muted-foreground">{l}</div>)}
          </div>
        </div>
      )}

      {/* SETUP MODAL */}
      {showSetup && <SetupModal onClose={() => setShowSetup(false)} />}
    </div>
  );
}

function Bubble({ m }: { m: Msg }) {
  if (m.role === "system") {
    return <div className="text-[11px] font-mono text-destructive/80 float-up">{m.text}</div>;
  }
  const isUser = m.role === "user";
  return (
    <div className={`float-up flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
        isUser
          ? "bg-primary/15 border border-primary/30 text-foreground"
          : "bg-secondary/50 border border-border text-foreground"
      }`}>
        {!isUser && <div className="font-display text-[9px] tracking-widest text-primary mb-0.5">MYRAA</div>}
        <div className="whitespace-pre-wrap leading-snug">{m.text}</div>
      </div>
    </div>
  );
}

function IconChip({ children, onClick, title }: { children: React.ReactNode; onClick?: () => void; title?: string }) {
  return (
    <button onClick={onClick} title={title}
      className="w-9 h-9 glass rounded-full grid place-items-center hover:border-primary/50 transition">
      {children}
    </button>
  );
}

function QuickAct({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick}
      className={`w-12 h-12 glass rounded-xl grid place-items-center group relative hover:border-primary/50 transition ${danger ? "hover:border-destructive/60" : ""}`}>
      <span className={`w-4 h-4 ${danger ? "text-destructive" : "text-primary"}`}>{icon}</span>
      <span className="absolute left-14 px-2 py-1 rounded bg-popover text-[10px] font-display tracking-wider opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap">
        {label}
      </span>
    </button>
  );
}

function SetupModal({ onClose }: { onClose: () => void }) {
  const download = () => {
    fetch("/myraa-agent.js").then((r) => r.blob()).then((b) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = "myraa-agent.js";
      a.click();
      URL.revokeObjectURL(a.href);
    });
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm p-6" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="glass rounded-2xl p-6 max-w-md w-full float-up">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-display text-lg tracking-widest text-primary glow-text">FIRST-TIME SETUP</h3>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-5">
          <li>Install <a href="https://nodejs.org" target="_blank" className="text-primary underline">Node.js</a> on your PC.</li>
          <li>Download <code className="px-1 rounded bg-secondary text-primary">myraa-agent.js</code> below.</li>
          <li>Open CMD in that folder, run:
            <pre className="mt-1 p-2 rounded bg-secondary/60 font-mono text-[11px] text-foreground">npm init -y && npm i ws @nut-tree-fork/nut-js</pre>
          </li>
          <li>Then: <pre className="mt-1 p-2 rounded bg-secondary/60 font-mono text-[11px] text-foreground">node myraa-agent.js</pre></li>
          <li>Copy the <code className="text-primary">ws://...</code> URL it prints, click the Link button above, paste &amp; connect.</li>
        </ol>
        <div className="mt-4 p-3 rounded-lg bg-accent/10 border border-accent/30 text-[11px] text-muted-foreground">
          <b className="text-accent">Tip:</b> Want a real <code>.exe</code> app? Wrap this dashboard in Electron (we can do that next).
        </div>
        <button onClick={download}
          className="mt-4 w-full h-11 rounded-xl bg-primary text-primary-foreground font-display tracking-widest flex items-center justify-center gap-2 glow-cyan">
          <Download className="w-4 h-4" /> DOWNLOAD AGENT
        </button>
      </div>
    </div>
  );
}
