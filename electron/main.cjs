// MYRAA — Electron main process (self-contained desktop app)
// UI: electron/ui.html (loaded via file://). AI: Lovable AI Gateway (direct fetch).
// OS control: nut-js (optional) + shell/PowerShell fallbacks.

const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const os = require("os");

let nut = null;
try {
  nut = require("@nut-tree-fork/nut-js");
  nut.keyboard.config.autoDelayMs = 0;
} catch {
  console.log("[myraa] nut-js not installed — mouse/keyboard sim disabled");
}

const isDev = !app.isPackaged;
const CONFIG_PATH = path.join(app.getPath("userData"), "myraa.config.json");

function readConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")); } catch { return {}; }
}
function writeConfig(cfg) {
  try { fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true }); } catch {}
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#020611",
    title: "MYRAA — Neural Desktop Companion",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  const cfg = readConfig();
  const url = cfg.dashboardUrl || "https://id-preview--73c9e898-62d2-4849-aa87-028e442efbda.lovable.app/";
  win.loadURL(url);
  if (isDev) win.webContents.openDevTools({ mode: "detach" });
}


app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });

// ─── OS command executor ─────────────────────────────────────────────────────
const plat = process.platform;

function sh(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { windowsHide: true }, (err, stdout, stderr) => {
      if (err) return resolve({ ok: false, out: stderr || err.message });
      resolve({ ok: true, out: (stdout || "").trim() });
    });
  });
}
function ps(script) {
  if (plat !== "win32") return Promise.resolve({ ok: false, out: "win32-only" });
  const encoded = Buffer.from(script, "utf16le").toString("base64");
  return sh(`powershell -NoProfile -EncodedCommand ${encoded}`);
}

async function systemAction(action) {
  if (plat === "win32") {
    switch (action) {
      case "lock":       return sh("rundll32.exe user32.dll,LockWorkStation");
      case "sleep":      return sh("rundll32.exe powrprof.dll,SetSuspendState 0,1,0");
      case "shutdown":   return sh("shutdown /s /t 10");
      case "restart":    return sh("shutdown /r /t 10");
      case "logout":     return sh("shutdown /l");
      case "cancel":     return sh("shutdown /a");
      case "screenshot": {
        const out = path.join(app.getPath("pictures"), `myraa-${Date.now()}.png`);
        return ps(`Add-Type -AssemblyName System.Windows.Forms,System.Drawing; $b=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $bmp=New-Object System.Drawing.Bitmap $b.Width,$b.Height; $g=[System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen($b.Location,[System.Drawing.Point]::Empty,$b.Size); $bmp.Save('${out.replace(/\\/g,"\\\\")}'); Write-Output '${out.replace(/\\/g,"\\\\")}'`);
      }
    }
  } else if (plat === "darwin") {
    switch (action) {
      case "lock":     return sh("pmset displaysleepnow");
      case "sleep":    return sh("pmset sleepnow");
      case "shutdown": return sh('osascript -e \'tell app "System Events" to shut down\'');
      case "restart":  return sh('osascript -e \'tell app "System Events" to restart\'');
    }
  } else {
    switch (action) {
      case "lock":     return sh("loginctl lock-session");
      case "sleep":    return sh("systemctl suspend");
      case "shutdown": return sh("shutdown -h +1");
    }
  }
  return { ok: false, out: `unknown action ${action}` };
}

async function mediaAction(action) {
  const a = String(action || "").replace(/-/g, "_");
  if (nut) {
    const { keyboard, Key } = nut;
    const map = { play_pause: Key.AudioPlay, play: Key.AudioPlay, pause: Key.AudioPlay,
      next: Key.AudioNext, prev: Key.AudioPrev,
      vol_up: Key.AudioVolUp, vol_down: Key.AudioVolDown, mute: Key.AudioMute };
    if (map[a]) { await keyboard.pressKey(map[a]); await keyboard.releaseKey(map[a]); return { ok: true, out: a }; }
  }
  if (plat === "win32") {
    const map = { vol_up: 175, vol_down: 174, mute: 173, play_pause: 179, play: 179, pause: 179, next: 176, prev: 177 };
    if (map[a]) return ps(`(New-Object -ComObject WScript.Shell).SendKeys([char]${map[a]})`);
  }
  return { ok: false, out: `media ${a} unsupported` };
}

const APP_ALIASES_WIN = {
  chrome: "chrome", firefox: "firefox", edge: "msedge",
  spotify: "spotify:", code: "code", vscode: "code",
  explorer: "explorer.exe", files: "explorer.exe", "file explorer": "explorer.exe",
  notepad: "notepad.exe", calc: "calc.exe", calculator: "calc.exe",
  cmd: "cmd.exe", powershell: "powershell.exe", terminal: "wt.exe",
  discord: "discord:", telegram: "tg://", whatsapp: "whatsapp:",
  paint: "mspaint.exe", word: "winword", excel: "excel", ppt: "powerpnt",
};

async function launchApp(target) {
  if (!target) return { ok: false, out: "no target" };
  const key = String(target).toLowerCase().trim();
  if (plat === "win32") {
    const resolved = APP_ALIASES_WIN[key] || target;
    return sh(`start "" "${resolved}"`);
  }
  if (plat === "darwin") return sh(`open -a "${target}"`);
  return sh(`${target} &`);
}

async function typeText(text) {
  if (!text) return { ok: false, out: "no text" };
  if (nut) { await nut.keyboard.type(text); return { ok: true, out: "typed" }; }
  if (plat === "win32") {
    const safe = text.replace(/'/g, "''").replace(/[+^%~(){}[\]]/g, "{$&}");
    return ps(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${safe}')`);
  }
  return { ok: false, out: "type needs @nut-tree-fork/nut-js" };
}

async function keyTap(key, modifiers = []) {
  if (!nut) return { ok: false, out: "key tap needs @nut-tree-fork/nut-js" };
  const { keyboard, Key } = nut;
  const norm = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  const k = Key[norm(key)] || Key[key.toUpperCase()] || Key[key];
  if (!k) return { ok: false, out: `unknown key ${key}` };
  const mods = (modifiers || []).map((m) => Key[norm(m)]).filter(Boolean);
  if (mods.length) { await keyboard.pressKey(...mods, k); await keyboard.releaseKey(...mods, k); }
  else { await keyboard.pressKey(k); await keyboard.releaseKey(k); }
  return { ok: true, out: `${(modifiers||[]).join("+")}+${key}` };
}

// ─── IPC: OS execute ────────────────────────────────────────────────────────
ipcMain.handle("myraa:execute", async (_e, cmd) => {
  try {
    switch (cmd.type) {
      case "open_url":   if (cmd.url) await shell.openExternal(cmd.url); return { ok: true, out: cmd.url };
      case "search_web": if (cmd.query) await shell.openExternal(`https://www.google.com/search?q=${encodeURIComponent(cmd.query)}`); return { ok: true, out: cmd.query };
      case "launch":     return launchApp(cmd.target || cmd.command);
      case "system":     return systemAction(cmd.action);
      case "media":      return mediaAction(cmd.action);
      case "type":
      case "key_type":   return typeText(cmd.text || "");
      case "key_tap":    return keyTap(cmd.key, cmd.modifiers || []);
      case "exec":       return sh(cmd.command);
      default:           return { ok: false, out: `unknown cmd ${cmd.type}` };
    }
  } catch (err) {
    return { ok: false, out: err && err.message ? err.message : String(err) };
  }
});

ipcMain.handle("myraa:info", () => ({
  platform: plat, release: os.release(), hostname: os.hostname(),
  user: os.userInfo().username, nut: !!nut, version: app.getVersion(),
}));

// ─── IPC: config (backend URL — optional override) ──────────────────────────
const DEFAULT_BACKEND = "https://tdijnzdeofeylvqscjdv.supabase.co/functions/v1/myraa-ai";
ipcMain.handle("myraa:hasKey", () => true); // no key needed anymore
ipcMain.handle("myraa:setKey", (_e, url) => {
  const cfg = readConfig(); cfg.backendUrl = String(url || "").trim() || DEFAULT_BACKEND; writeConfig(cfg);
  return { ok: true };
});

// ─── IPC: AI (call Lovable-hosted public endpoint — no key on client) ───────
ipcMain.handle("myraa:ai", async (_e, prompt) => {
  const cfg = readConfig();
  let url = cfg.backendUrl && /^https?:\/\//.test(cfg.backendUrl) ? cfg.backendUrl : DEFAULT_BACKEND;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: String(prompt || ""), platform: plat }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { error: `Backend ${res.status}: ${txt.slice(0, 200)}` };
    }
    const out = await res.json();
    if (out.error) return { error: out.error };
    return {
      reply: out.reply || "OK Sir.",
      commands: Array.isArray(out.commands) ? out.commands : [],
    };
  } catch (e) {
    return { error: (e && e.message) || String(e) };
  }
});
