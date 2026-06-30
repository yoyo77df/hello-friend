import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  Wifi, WifiOff, Loader2, MousePointer2, Keyboard, Music2, Power,
  Rocket, Terminal, Play, SkipBack, SkipForward, Volume2, VolumeX,
  Volume1, Lock, Moon, Camera, Send, Download, ChevronRight,
} from "lucide-react";
import { useRemote, type RemoteCommand } from "@/lib/use-remote";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PocketDeck — Personal PC Remote" },
      { name: "description", content: "Phone theke PC control korar personal remote dashboard." },
    ],
  }),
  component: Index,
});

type Tab = "pad" | "keys" | "media" | "system" | "apps";

function Index() {
  const { status, url, setUrl, connect, send, log } = useRemote();
  const [tab, setTab] = useState<Tab>("pad");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header status={status} url={url} setUrl={setUrl} onConnect={() => connect()} />

      <main className="flex-1 px-4 pb-28 pt-4 max-w-md mx-auto w-full">
        {tab === "pad" && <TouchpadPanel send={send} />}
        {tab === "keys" && <KeyboardPanel send={send} />}
        {tab === "media" && <MediaPanel send={send} />}
        {tab === "system" && <SystemPanel send={send} log={log} />}
        {tab === "apps" && <AppsPanel send={send} />}
      </main>

      <TabBar tab={tab} setTab={setTab} />
    </div>
  );
}

function Header({
  status, url, setUrl, onConnect,
}: { status: string; url: string; setUrl: (s: string) => void; onConnect: () => void }) {
  const [open, setOpen] = useState(false);
  const dot =
    status === "connected" ? "bg-primary shadow-[0_0_12px_var(--primary)]"
    : status === "connecting" ? "bg-amber-400 animate-pulse"
    : status === "error" ? "bg-destructive"
    : "bg-muted-foreground";

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground font-black">
          ◉
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold leading-tight">PocketDeck</div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span className={cn("w-1.5 h-1.5 rounded-full", dot)} />
            {status === "connected" ? "PC connected" : status}
          </div>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="px-3 h-9 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium flex items-center gap-1.5"
        >
          {status === "connected" ? <Wifi className="w-3.5 h-3.5" /> :
           status === "connecting" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
           <WifiOff className="w-3.5 h-3.5" />}
          Connect
        </button>
      </div>
      {open && (
        <div className="max-w-md mx-auto px-4 pb-3 flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="ws://192.168.1.10:8765"
            className="flex-1 h-9 px-3 rounded-lg bg-input text-sm outline-none focus:ring-2 ring-primary"
          />
          <button
            onClick={() => { onConnect(); setOpen(false); }}
            className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
          >
            Go
          </button>
        </div>
      )}
    </header>
  );
}

/* ---------------- Touchpad ---------------- */
function TouchpadPanel({ send }: { send: (c: RemoteCommand) => boolean }) {
  const padRef = useRef<HTMLDivElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);

  const onStart = (x: number, y: number) => {
    last.current = { x, y };
    moved.current = false;
  };
  const onMove = (x: number, y: number) => {
    if (!last.current) return;
    const dx = x - last.current.x;
    const dy = y - last.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 1) {
      moved.current = true;
      send({ type: "mouse_move", dx: dx * 1.6, dy: dy * 1.6 });
    }
    last.current = { x, y };
  };
  const onEnd = () => {
    if (!moved.current) send({ type: "mouse_click", button: "left" });
    last.current = null;
  };

  return (
    <div className="space-y-4">
      <SectionTitle icon={<MousePointer2 className="w-4 h-4" />} title="Touchpad" hint="drag = move • tap = click" />
      <div
        ref={padRef}
        onTouchStart={(e) => onStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => onMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={onEnd}
        onMouseDown={(e) => onStart(e.clientX, e.clientY)}
        onMouseMove={(e) => e.buttons === 1 && onMove(e.clientX, e.clientY)}
        onMouseUp={onEnd}
        className="h-80 rounded-2xl bg-gradient-to-br from-card to-secondary border border-border touch-none select-none relative overflow-hidden"
      >
        <div className="absolute inset-0 grid place-items-center text-muted-foreground/40 text-xs pointer-events-none">
          drag here
        </div>
        <div className="absolute inset-2 rounded-xl border border-dashed border-border/50 pointer-events-none" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <PadBtn onClick={() => send({ type: "mouse_click", button: "left" })}>Left click</PadBtn>
        <PadBtn onClick={() => send({ type: "mouse_click", button: "left", double: true })}>Double</PadBtn>
        <PadBtn onClick={() => send({ type: "mouse_click", button: "right" })}>Right click</PadBtn>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <PadBtn onClick={() => send({ type: "mouse_scroll", dy: -120 })}>Scroll ↑</PadBtn>
        <PadBtn onClick={() => send({ type: "mouse_scroll", dy: 120 })}>Scroll ↓</PadBtn>
      </div>
    </div>
  );
}

/* ---------------- Keyboard ---------------- */
function KeyboardPanel({ send }: { send: (c: RemoteCommand) => boolean }) {
  const [text, setText] = useState("");
  const tap = (key: string, mods?: string[]) => send({ type: "key_tap", key, modifiers: mods });

  return (
    <div className="space-y-4">
      <SectionTitle icon={<Keyboard className="w-4 h-4" />} title="Keyboard" />
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type and send to PC…"
          className="flex-1 h-11 px-3 rounded-xl bg-card border border-border outline-none focus:ring-2 ring-primary text-sm"
        />
        <button
          onClick={() => { if (text) { send({ type: "key_type", text }); setText(""); } }}
          className="h-11 px-4 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center gap-1.5"
        >
          <Send className="w-4 h-4" /> Send
        </button>
      </div>
      <Grid>
        {[
          ["Enter", "enter"], ["Esc", "escape"], ["Tab", "tab"],
          ["Backspace", "backspace"], ["Space", "space"], ["Delete", "delete"],
          ["↑", "up"], ["↓", "down"], ["←", "left"],
          ["→", "right"], ["Home", "home"], ["End", "end"],
        ].map(([label, key]) => (
          <PadBtn key={key} onClick={() => tap(key)}>{label}</PadBtn>
        ))}
      </Grid>
      <SectionTitle title="Shortcuts" />
      <Grid>
        <PadBtn onClick={() => tap("c", ["ctrl"])}>Copy</PadBtn>
        <PadBtn onClick={() => tap("v", ["ctrl"])}>Paste</PadBtn>
        <PadBtn onClick={() => tap("x", ["ctrl"])}>Cut</PadBtn>
        <PadBtn onClick={() => tap("z", ["ctrl"])}>Undo</PadBtn>
        <PadBtn onClick={() => tap("a", ["ctrl"])}>Select all</PadBtn>
        <PadBtn onClick={() => tap("tab", ["alt"])}>Alt+Tab</PadBtn>
      </Grid>
    </div>
  );
}

/* ---------------- Media ---------------- */
function MediaPanel({ send }: { send: (c: RemoteCommand) => boolean }) {
  const M = (action: "play_pause" | "next" | "prev" | "vol_up" | "vol_down" | "mute") =>
    () => send({ type: "media", action });
  return (
    <div className="space-y-4">
      <SectionTitle icon={<Music2 className="w-4 h-4" />} title="Media" />
      <div className="rounded-2xl bg-gradient-to-br from-card to-secondary p-6 border border-border">
        <div className="flex items-center justify-around">
          <IconBtn onClick={M("prev")}><SkipBack className="w-6 h-6" /></IconBtn>
          <button
            onClick={M("play_pause")}
            className="w-20 h-20 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-[0_0_30px_var(--primary)]/40 active:scale-95 transition"
          >
            <Play className="w-9 h-9 fill-current" />
          </button>
          <IconBtn onClick={M("next")}><SkipForward className="w-6 h-6" /></IconBtn>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <PadBtn onClick={M("vol_down")}><Volume1 className="w-4 h-4 inline mr-1" />Vol −</PadBtn>
        <PadBtn onClick={M("mute")}><VolumeX className="w-4 h-4 inline mr-1" />Mute</PadBtn>
        <PadBtn onClick={M("vol_up")}><Volume2 className="w-4 h-4 inline mr-1" />Vol +</PadBtn>
      </div>
    </div>
  );
}

/* ---------------- System ---------------- */
function SystemPanel({ send, log }: { send: (c: RemoteCommand) => boolean; log: string[] }) {
  return (
    <div className="space-y-4">
      <SectionTitle icon={<Power className="w-4 h-4" />} title="System" />
      <Grid>
        <BigAction icon={<Lock className="w-5 h-5" />} label="Lock" onClick={() => send({ type: "system", action: "lock" })} />
        <BigAction icon={<Moon className="w-5 h-5" />} label="Sleep" onClick={() => send({ type: "system", action: "sleep" })} />
        <BigAction icon={<Camera className="w-5 h-5" />} label="Screenshot" onClick={() => send({ type: "system", action: "screenshot" })} />
        <BigAction icon={<Power className="w-5 h-5" />} label="Shutdown" danger onClick={() => {
          if (confirm("Shutdown PC?")) send({ type: "system", action: "shutdown" });
        }} />
      </Grid>
      <SectionTitle icon={<Terminal className="w-4 h-4" />} title="Activity" />
      <div className="rounded-xl bg-card border border-border p-3 max-h-48 overflow-y-auto text-[11px] font-mono space-y-1">
        {log.length === 0 && <div className="text-muted-foreground">No activity yet.</div>}
        {log.map((l, i) => <div key={i} className="text-muted-foreground">{l}</div>)}
      </div>
    </div>
  );
}

/* ---------------- Apps ---------------- */
type App = { id: string; name: string; emoji: string; target: string };
const DEFAULT_APPS: App[] = [
  { id: "1", name: "Chrome", emoji: "🌐", target: "chrome" },
  { id: "2", name: "Spotify", emoji: "🎧", target: "spotify" },
  { id: "3", name: "VS Code", emoji: "💻", target: "code" },
  { id: "4", name: "Explorer", emoji: "📁", target: "explorer" },
  { id: "5", name: "Notepad", emoji: "📝", target: "notepad" },
  { id: "6", name: "Calculator", emoji: "🧮", target: "calc" },
];

function AppsPanel({ send }: { send: (c: RemoteCommand) => boolean }) {
  const [apps, setApps] = useState<App[]>(() => {
    if (typeof window === "undefined") return DEFAULT_APPS;
    const s = localStorage.getItem("apps");
    return s ? JSON.parse(s) : DEFAULT_APPS;
  });
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");

  const save = (next: App[]) => {
    setApps(next);
    localStorage.setItem("apps", JSON.stringify(next));
  };

  return (
    <div className="space-y-4">
      <SectionTitle icon={<Rocket className="w-4 h-4" />} title="App launcher" />
      <div className="grid grid-cols-3 gap-2">
        {apps.map((a) => (
          <button
            key={a.id}
            onClick={() => send({ type: "launch", target: a.target })}
            onDoubleClick={() => { if (confirm(`Remove ${a.name}?`)) save(apps.filter((x) => x.id !== a.id)); }}
            className="aspect-square rounded-2xl bg-card border border-border grid place-items-center hover:border-primary/50 active:scale-95 transition"
          >
            <div className="text-3xl">{a.emoji}</div>
            <div className="text-[11px] mt-1 text-muted-foreground">{a.name}</div>
          </button>
        ))}
      </div>
      <div className="rounded-2xl bg-card border border-border p-3 space-y-2">
        <div className="text-xs font-semibold text-muted-foreground">Add app</div>
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (e.g. Figma)"
            className="flex-1 h-9 px-3 rounded-lg bg-input text-sm outline-none" />
          <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="cmd/path"
            className="flex-1 h-9 px-3 rounded-lg bg-input text-sm outline-none" />
        </div>
        <button
          onClick={() => {
            if (!name || !target) return;
            save([...apps, { id: Date.now().toString(), name, emoji: "⚡", target }]);
            setName(""); setTarget("");
          }}
          className="w-full h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
        >Add</button>
        <div className="text-[10px] text-muted-foreground">Double-tap an app to remove. Target = command agent will run (e.g. <code>chrome</code>, <code>C:\Path\app.exe</code>).</div>
      </div>

      <SectionTitle title="Custom command" />
      <CustomExec send={send} />

      <SetupCard />
    </div>
  );
}

function CustomExec({ send }: { send: (c: RemoteCommand) => boolean }) {
  const [cmd, setCmd] = useState("");
  return (
    <div className="flex gap-2">
      <input value={cmd} onChange={(e) => setCmd(e.target.value)} placeholder="shell command"
        className="flex-1 h-10 px-3 rounded-lg bg-card border border-border text-sm outline-none font-mono" />
      <button
        onClick={() => { if (cmd) { send({ type: "exec", command: cmd }); setCmd(""); } }}
        className="h-10 px-4 rounded-lg bg-accent text-accent-foreground text-sm font-semibold"
      >Run</button>
    </div>
  );
}

function SetupCard() {
  const download = () => {
    fetch("/pc-agent.js")
      .then((r) => r.blob())
      .then((b) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = "pc-agent.js";
        a.click();
        URL.revokeObjectURL(a.href);
      });
  };
  return (
    <div className="mt-6 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10 p-4 space-y-3">
      <div className="font-semibold text-sm flex items-center gap-2">
        <Download className="w-4 h-4" /> First-time setup
      </div>
      <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal pl-4">
        <li>Apnar PC te <code className="px-1 rounded bg-secondary">Node.js</code> install thakte hobe.</li>
        <li>Niche theke <b>pc-agent.js</b> download korun.</li>
        <li>Terminal khulun, ei folder e jaan, run: <code className="px-1 rounded bg-secondary">npm i ws @nut-tree-fork/nut-js</code></li>
        <li>Tarpor: <code className="px-1 rounded bg-secondary">node pc-agent.js</code></li>
        <li>Console e dekhabe IP address (eg. <code>ws://192.168.1.10:8765</code>) — eta upore Connect e paste korun.</li>
      </ol>
      <button onClick={download} className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2">
        <Download className="w-4 h-4" /> Download pc-agent.js
      </button>
    </div>
  );
}

/* ---------------- Bits ---------------- */
function SectionTitle({ icon, title, hint }: { icon?: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex items-end justify-between">
      <div className="flex items-center gap-2 text-sm font-semibold">
        {icon}{title}
      </div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-3 gap-2">{children}</div>;
}
function PadBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className="h-12 rounded-xl bg-card border border-border text-sm font-medium active:scale-95 active:bg-secondary transition">
      {children}
    </button>
  );
}
function IconBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className="w-14 h-14 rounded-full bg-secondary grid place-items-center active:scale-95 transition">
      {children}
    </button>
  );
}
function BigAction({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick}
      className={cn(
        "aspect-square rounded-2xl border grid place-items-center gap-1 active:scale-95 transition",
        danger ? "bg-destructive/15 border-destructive/40 text-destructive" : "bg-card border-border"
      )}>
      {icon}
      <div className="text-[11px] font-medium">{label}</div>
    </button>
  );
}

/* ---------------- Bottom tabs ---------------- */
function TabBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const items: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: "pad", icon: <MousePointer2 className="w-5 h-5" />, label: "Pad" },
    { id: "keys", icon: <Keyboard className="w-5 h-5" />, label: "Keys" },
    { id: "media", icon: <Music2 className="w-5 h-5" />, label: "Media" },
    { id: "system", icon: <Power className="w-5 h-5" />, label: "System" },
    { id: "apps", icon: <Rocket className="w-5 h-5" />, label: "Apps" },
  ];
  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 border-t border-border bg-background/90 backdrop-blur-md">
      <div className="max-w-md mx-auto grid grid-cols-5">
        {items.map((it) => (
          <button key={it.id} onClick={() => setTab(it.id)}
            className={cn(
              "py-2.5 flex flex-col items-center gap-1 text-[10px] font-medium transition",
              tab === it.id ? "text-primary" : "text-muted-foreground"
            )}>
            <div className={cn(
              "w-10 h-7 grid place-items-center rounded-full transition",
              tab === it.id && "bg-primary/15"
            )}>{it.icon}</div>
            {it.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
