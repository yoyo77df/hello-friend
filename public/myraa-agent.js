#!/usr/bin/env node
/**
 * MYRAA Agent — Windows-first native PC controller
 * -------------------------------------------------
 *   1. Install Node.js: https://nodejs.org
 *   2. cd to this folder, run:   npm init -y && npm i ws @nut-tree-fork/nut-js
 *   3. node myraa-agent.js
 *   4. Console will print ws://<ip>:8765 — paste in the MYRAA dashboard.
 */
const os = require("os");
const { exec } = require("child_process");
const WebSocket = require("ws");

let nut = null;
try {
  nut = require("@nut-tree-fork/nut-js");
  nut.mouse.config.mouseSpeed = 1500;
  nut.keyboard.config.autoDelayMs = 5;
} catch {
  console.warn("⚠️  @nut-tree-fork/nut-js missing — install with: npm i @nut-tree-fork/nut-js");
}

const PORT = 8765;
const PLATFORM = process.platform;

const KEY_MAP = nut
  ? {
      enter: nut.Key.Enter, escape: nut.Key.Escape, esc: nut.Key.Escape,
      tab: nut.Key.Tab, backspace: nut.Key.Backspace, space: nut.Key.Space,
      delete: nut.Key.Delete, up: nut.Key.Up, down: nut.Key.Down,
      left: nut.Key.Left, right: nut.Key.Right, home: nut.Key.Home, end: nut.Key.End,
      f1: nut.Key.F1, f2: nut.Key.F2, f3: nut.Key.F3, f4: nut.Key.F4, f5: nut.Key.F5,
      f6: nut.Key.F6, f7: nut.Key.F7, f8: nut.Key.F8, f9: nut.Key.F9, f10: nut.Key.F10,
      f11: nut.Key.F11, f12: nut.Key.F12,
    }
  : {};
const MOD_MAP = nut
  ? {
      ctrl: nut.Key.LeftControl, control: nut.Key.LeftControl,
      shift: nut.Key.LeftShift, alt: nut.Key.LeftAlt,
      meta: nut.Key.LeftSuper, cmd: nut.Key.LeftSuper, win: nut.Key.LeftSuper,
    }
  : {};

function resolveKey(k) {
  if (!nut) return null;
  const low = String(k).toLowerCase();
  if (KEY_MAP[low]) return KEY_MAP[low];
  if (low.length === 1) {
    const upper = low.toUpperCase();
    if (nut.Key[upper]) return nut.Key[upper];
    if (/[0-9]/.test(low)) return nut.Key[`Num${low}`] ?? nut.Key[`Digit${low}`];
  }
  return nut.Key[k] ?? null;
}

const LAUNCH_ALIASES = {
  chrome: { win32: "start chrome", darwin: "open -a 'Google Chrome'", linux: "google-chrome" },
  firefox: { win32: "start firefox", darwin: "open -a Firefox", linux: "firefox" },
  edge: { win32: "start msedge", darwin: "open -a 'Microsoft Edge'", linux: "microsoft-edge" },
  spotify: { win32: "start spotify:", darwin: "open -a Spotify", linux: "spotify" },
  code: { win32: "code", darwin: "open -a 'Visual Studio Code'", linux: "code" },
  explorer: { win32: "explorer", darwin: "open ~", linux: "xdg-open ~" },
  notepad: { win32: "notepad", darwin: "open -a TextEdit", linux: "gedit" },
  calc: { win32: "calc", darwin: "open -a Calculator", linux: "gnome-calculator" },
  cmd: { win32: "start cmd", darwin: "open -a Terminal", linux: "x-terminal-emulator" },
  powershell: { win32: "start powershell", darwin: "open -a Terminal", linux: "x-terminal-emulator" },
  discord: { win32: "start discord:", darwin: "open -a Discord", linux: "discord" },
  telegram: { win32: "start telegram:", darwin: "open -a Telegram", linux: "telegram-desktop" },
  whatsapp: { win32: "start whatsapp:", darwin: "open -a WhatsApp", linux: "whatsapp" },
};

async function handle(cmd, ws) {
  const log = (m) => ws.send(JSON.stringify({ type: "log", text: m }));
  try {
    switch (cmd.type) {
      case "mouse_move":
        if (!nut) return;
        {
          const p = await nut.mouse.getPosition();
          await nut.mouse.setPosition(new nut.Point(p.x + cmd.dx, p.y + cmd.dy));
        }
        return;
      case "mouse_click":
        if (!nut) return;
        {
          const btn = cmd.button === "right" ? nut.Button.RIGHT
                    : cmd.button === "middle" ? nut.Button.MIDDLE : nut.Button.LEFT;
          if (cmd.double) await nut.mouse.doubleClick(btn);
          else await nut.mouse.click(btn);
        }
        return;
      case "mouse_scroll":
        if (!nut) return;
        if (cmd.dy > 0) await nut.mouse.scrollDown(Math.abs(cmd.dy / 40));
        else await nut.mouse.scrollUp(Math.abs(cmd.dy / 40));
        return;
      case "key_tap":
        if (!nut) return;
        {
          const key = resolveKey(cmd.key);
          if (!key) return log(`unknown key: ${cmd.key}`);
          const mods = (cmd.modifiers || []).map((m) => MOD_MAP[String(m).toLowerCase()]).filter(Boolean);
          await nut.keyboard.pressKey(...mods, key);
          await nut.keyboard.releaseKey(...mods, key);
        }
        return;
      case "key_type":
        if (!nut) return;
        await nut.keyboard.type(cmd.text);
        return;
      case "media":
        if (!nut) return;
        {
          const map = {
            play_pause: nut.Key.AudioPlay, next: nut.Key.AudioNext, prev: nut.Key.AudioPrev,
            vol_up: nut.Key.AudioVolUp, vol_down: nut.Key.AudioVolDown, mute: nut.Key.AudioMute,
          };
          const k = map[cmd.action];
          if (k != null) { await nut.keyboard.pressKey(k); await nut.keyboard.releaseKey(k); }
        }
        return;
      case "system":
        {
          const cmds = {
            lock:     { win32: "rundll32.exe user32.dll,LockWorkStation", darwin: "pmset displaysleepnow", linux: "loginctl lock-session" },
            sleep:    { win32: "rundll32.exe powrprof.dll,SetSuspendState 0,1,0", darwin: "pmset sleepnow", linux: "systemctl suspend" },
            shutdown: { win32: "shutdown /s /t 0", darwin: "sudo shutdown -h now", linux: "shutdown -h now" },
            restart:  { win32: "shutdown /r /t 0", darwin: "sudo shutdown -r now", linux: "shutdown -r now" },
            cancel:   { win32: "shutdown /a", darwin: "killall shutdown", linux: "shutdown -c" },
            hibernate:{ win32: "shutdown /h", darwin: "pmset sleepnow", linux: "systemctl hibernate" },
            logoff:   { win32: "shutdown /l", darwin: "osascript -e 'tell app \"System Events\" to log out'", linux: "loginctl terminate-user $USER" },
          };
          if (cmd.action === "screenshot") {
            const path = `${os.homedir()}/Desktop/myraa-${Date.now()}.png`;
            if (nut) {
              const img = await nut.screen.grab();
              await nut.imageWriter({ data: img, path });
              log(`screenshot saved: ${path}`);
            }
            return;
          }
          const c = cmds[cmd.action]?.[PLATFORM];
          if (c) exec(c);
        }
        return;
      case "launch":
        {
          const t = LAUNCH_ALIASES[cmd.target]?.[PLATFORM] || cmd.target;
          exec(t, (err) => err && log(`launch error: ${err.message}`));
        }
        return;
      case "open_url":
        {
          const url = cmd.url;
          const c = PLATFORM === "win32" ? `start "" "${url}"`
                  : PLATFORM === "darwin" ? `open "${url}"` : `xdg-open "${url}"`;
          exec(c);
        }
        return;
      case "search_web":
        {
          const q = encodeURIComponent(cmd.query || "");
          const url = `https://www.google.com/search?q=${q}`;
          const c = PLATFORM === "win32" ? `start "" "${url}"`
                  : PLATFORM === "darwin" ? `open "${url}"` : `xdg-open "${url}"`;
          exec(c);
        }
        return;
      case "exec":
        exec(cmd.command, { windowsHide: false, shell: true }, (err, stdout, stderr) => {
          if (err) log(`exec error: ${err.message}`);
          else if (stdout) log(`out: ${stdout.slice(0, 1500)}`);
          else if (stderr) log(`err: ${stderr.slice(0, 1500)}`);
          else log(`ok: ${cmd.command}`);
        });
        return;
      default:
        log(`unknown command: ${cmd.type}`);
    }
  } catch (err) {
    console.error("handle error:", err);
    log(`error: ${err.message}`);
  }
}

const wss = new WebSocket.Server({ port: PORT, host: "0.0.0.0" });
wss.on("connection", (ws, req) => {
  console.log(`🔌  client: ${req.socket.remoteAddress}`);
  ws.send(JSON.stringify({ type: "hello", platform: PLATFORM }));
  ws.on("message", (msg) => {
    try { handle(JSON.parse(msg.toString()), ws); }
    catch (e) { ws.send(JSON.stringify({ type: "log", text: `bad json: ${e.message}` })); }
  });
  ws.on("close", () => console.log("🔌  disconnected"));
});

function localIPs() {
  const ips = [];
  for (const list of Object.values(os.networkInterfaces()))
    for (const i of list || []) if (i.family === "IPv4" && !i.internal) ips.push(i.address);
  return ips;
}

console.log("\n╭──────────────────────────────────────────╮");
console.log("│    MYRAA Agent  •  online                │");
console.log("╰──────────────────────────────────────────╯\n");
for (const ip of localIPs()) console.log(`   ws://${ip}:${PORT}`);
console.log(`\n(same WiFi • Ctrl+C to stop)\n`);
