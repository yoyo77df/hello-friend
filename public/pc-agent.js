#!/usr/bin/env node
/**
 * PocketDeck PC Agent
 * -------------------
 * Apnar PC te eta chalan — eta WebSocket server khole, phone theke pathano
 * command (mouse / keyboard / media / launch / exec) execute kore.
 *
 * Setup:
 *   1. Node.js install korun: https://nodejs.org
 *   2. Ei folder e: npm init -y && npm i ws @nut-tree-fork/nut-js
 *   3. Run: node pc-agent.js
 *   4. Console e dekhabe ws://<your-ip>:8765 — eta phone er Connect e paste korun.
 *
 * Same WiFi te phone + PC thakte hobe. Firewall e 8765 port allow korte hote pare.
 */

const os = require("os");
const { exec, spawn } = require("child_process");
const WebSocket = require("ws");

// nut-js diye OS-level mouse/keyboard control
let nut = null;
try {
  nut = require("@nut-tree-fork/nut-js");
  nut.mouse.config.mouseSpeed = 1500;
  nut.keyboard.config.autoDelayMs = 5;
} catch (e) {
  console.warn("⚠️  @nut-tree-fork/nut-js install hoy nai — mouse/keyboard kaj korbe na.");
  console.warn("   Run: npm i @nut-tree-fork/nut-js");
}

const PORT = 8765;
const PLATFORM = process.platform; // 'win32' | 'darwin' | 'linux'

function localIPs() {
  const ips = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list || []) {
      if (i.family === "IPv4" && !i.internal) ips.push(i.address);
    }
  }
  return ips;
}

/* -------- key mapping -------- */
const KEY_MAP = nut ? {
  enter: nut.Key.Enter, escape: nut.Key.Escape, esc: nut.Key.Escape,
  tab: nut.Key.Tab, backspace: nut.Key.Backspace, space: nut.Key.Space,
  delete: nut.Key.Delete, up: nut.Key.Up, down: nut.Key.Down,
  left: nut.Key.Left, right: nut.Key.Right, home: nut.Key.Home, end: nut.Key.End,
  a: nut.Key.A, c: nut.Key.C, v: nut.Key.V, x: nut.Key.X, z: nut.Key.Z,
} : {};
const MOD_MAP = nut ? {
  ctrl: nut.Key.LeftControl, control: nut.Key.LeftControl,
  shift: nut.Key.LeftShift, alt: nut.Key.LeftAlt, meta: nut.Key.LeftSuper, cmd: nut.Key.LeftSuper,
} : {};

/* -------- command handlers -------- */
async function handle(cmd, ws) {
  try {
    switch (cmd.type) {
      case "mouse_move": {
        if (!nut) return;
        const p = await nut.mouse.getPosition();
        await nut.mouse.setPosition(new nut.Point(p.x + cmd.dx, p.y + cmd.dy));
        return;
      }
      case "mouse_click": {
        if (!nut) return;
        const btn = cmd.button === "right" ? nut.Button.RIGHT
                  : cmd.button === "middle" ? nut.Button.MIDDLE : nut.Button.LEFT;
        if (cmd.double) await nut.mouse.doubleClick(btn);
        else await nut.mouse.click(btn);
        return;
      }
      case "mouse_scroll": {
        if (!nut) return;
        if (cmd.dy > 0) await nut.mouse.scrollDown(Math.abs(cmd.dy / 40));
        else await nut.mouse.scrollUp(Math.abs(cmd.dy / 40));
        return;
      }
      case "key_tap": {
        if (!nut) return;
        const key = KEY_MAP[cmd.key.toLowerCase()] ?? cmd.key.toUpperCase();
        const mods = (cmd.modifiers || []).map((m) => MOD_MAP[m.toLowerCase()]).filter(Boolean);
        await nut.keyboard.pressKey(...mods, key);
        await nut.keyboard.releaseKey(...mods, key);
        return;
      }
      case "key_type": {
        if (!nut) return;
        await nut.keyboard.type(cmd.text);
        return;
      }
      case "media": {
        const map = {
          play_pause: { win: "audio_play", mac: "playpause" },
          next: { win: "audio_next", mac: "next" },
          prev: { win: "audio_prev", mac: "previous" },
          vol_up: { win: "volume_up", mac: "volup" },
          vol_down: { win: "volume_down", mac: "voldown" },
          mute: { win: "volume_mute", mac: "mute" },
        };
        if (!nut) return;
        const winKeys = {
          play_pause: nut.Key.AudioPlay, next: nut.Key.AudioNext, prev: nut.Key.AudioPrev,
          vol_up: nut.Key.AudioVolUp, vol_down: nut.Key.AudioVolDown, mute: nut.Key.AudioMute,
        };
        const k = winKeys[cmd.action];
        if (k != null) {
          await nut.keyboard.pressKey(k);
          await nut.keyboard.releaseKey(k);
        }
        return;
      }
      case "system": {
        const cmds = {
          lock: { win32: "rundll32.exe user32.dll,LockWorkStation", darwin: "pmset displaysleepnow", linux: "loginctl lock-session" },
          sleep: { win32: "rundll32.exe powrprof.dll,SetSuspendState 0,1,0", darwin: "pmset sleepnow", linux: "systemctl suspend" },
          shutdown: { win32: "shutdown /s /t 0", darwin: "sudo shutdown -h now", linux: "shutdown -h now" },
        };
        if (cmd.action === "screenshot") {
          const path = `${os.homedir()}/Desktop/pocketdeck-${Date.now()}.png`;
          if (nut) {
            const img = await nut.screen.grab();
            await nut.imageWriter({ data: img, path });
            ws.send(`screenshot saved: ${path}`);
          }
          return;
        }
        const c = cmds[cmd.action]?.[PLATFORM];
        if (c) exec(c);
        return;
      }
      case "launch": {
        // common name → platform command
        const aliases = {
          chrome: { win32: "start chrome", darwin: "open -a 'Google Chrome'", linux: "google-chrome" },
          spotify: { win32: "start spotify:", darwin: "open -a Spotify", linux: "spotify" },
          code: { win32: "code", darwin: "open -a 'Visual Studio Code'", linux: "code" },
          explorer: { win32: "explorer", darwin: "open ~", linux: "xdg-open ~" },
          notepad: { win32: "notepad", darwin: "open -a TextEdit", linux: "gedit" },
          calc: { win32: "calc", darwin: "open -a Calculator", linux: "gnome-calculator" },
        };
        const t = aliases[cmd.target]?.[PLATFORM] || cmd.target;
        exec(t);
        return;
      }
      case "exec": {
        exec(cmd.command, (err, stdout, stderr) => {
          if (err) ws.send(`exec error: ${err.message}`);
          else if (stdout) ws.send(`out: ${stdout.slice(0, 500)}`);
          else if (stderr) ws.send(`err: ${stderr.slice(0, 500)}`);
        });
        return;
      }
      default:
        ws.send(`unknown command: ${cmd.type}`);
    }
  } catch (err) {
    console.error("handle error:", err);
    ws.send(`error: ${err.message}`);
  }
}

/* -------- server -------- */
const wss = new WebSocket.Server({ port: PORT, host: "0.0.0.0" });

wss.on("connection", (ws, req) => {
  console.log(`📱  client connected: ${req.socket.remoteAddress}`);
  ws.send("hello from PocketDeck agent");
  ws.on("message", (msg) => {
    try {
      const cmd = JSON.parse(msg.toString());
      handle(cmd, ws);
    } catch (e) {
      ws.send(`bad json: ${e.message}`);
    }
  });
  ws.on("close", () => console.log("📱  client disconnected"));
});

console.log("\n╭──────────────────────────────────────────╮");
console.log("│   PocketDeck PC Agent  •  running ✓      │");
console.log("╰──────────────────────────────────────────╯");
console.log(`\nOpen the web app on your phone and connect to ONE of these:\n`);
for (const ip of localIPs()) console.log(`   ws://${ip}:${PORT}`);
console.log(`\n(same WiFi network required • Ctrl+C to stop)\n`);
