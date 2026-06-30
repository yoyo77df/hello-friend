// MYRAA — Electron main process
// Bridges the React UI to native OS control via IPC.

const { app, BrowserWindow, ipcMain, shell, globalShortcut } = require("electron");
const path = require("path");
const { exec, spawn } = require("child_process");
const os = require("os");

// Optional native input library — install with `npm i @nut-tree-fork/nut-js`
// MYRAA will still work without it (URLs, app launch, system commands).
let nut = null;
try {
  nut = require("@nut-tree-fork/nut-js");
  nut.keyboard.config.autoDelayMs = 0;
} catch {
  console.log("[myraa] nut-js not installed — mouse/keyboard sim disabled");
}

const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#020611",
    title: "MYRAA — Neural Desktop Companion",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev && process.env.MYRAA_DEV_URL) {
    win.loadURL(process.env.MYRAA_DEV_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  globalShortcut.unregisterAll();
  if (process.platform !== "darwin") app.quit();
});

// ─── Command executor ────────────────────────────────────────────────────────
const plat = process.platform; // 'win32' | 'darwin' | 'linux'

function sh(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { windowsHide: true }, (err, stdout, stderr) => {
      if (err) return resolve({ ok: false, out: stderr || err.message });
      resolve({ ok: true, out: stdout.trim() });
    });
  });
}

// PowerShell helper (Windows native input fallback)
function ps(script) {
  if (plat !== "win32") return Promise.resolve({ ok: false, out: "win32-only" });
  const encoded = Buffer.from(script, "utf16le").toString("base64");
  return sh(`powershell -NoProfile -EncodedCommand ${encoded}`);
}

async function systemAction(action) {
  if (plat === "win32") {
    switch (action) {
      case "lock":     return sh("rundll32.exe user32.dll,LockWorkStation");
      case "sleep":    return sh("rundll32.exe powrprof.dll,SetSuspendState 0,1,0");
      case "shutdown": return sh("shutdown /s /t 10");
      case "restart":  return sh("shutdown /r /t 10");
      case "logout":   return sh("shutdown /l");
      case "cancel":   return sh("shutdown /a");
    }
  } else if (plat === "darwin") {
    switch (action) {
      case "lock":     return sh('pmset displaysleepnow');
      case "sleep":    return sh("pmset sleepnow");
      case "shutdown": return sh('osascript -e \'tell app "System Events" to shut down\'');
      case "restart":  return sh('osascript -e \'tell app "System Events" to restart\'');
      case "logout":   return sh('osascript -e \'tell app "System Events" to log out\'');
    }
  } else {
    switch (action) {
      case "lock":     return sh("loginctl lock-session");
      case "sleep":    return sh("systemctl suspend");
      case "shutdown": return sh("shutdown -h +1");
      case "restart":  return sh("shutdown -r +1");
      case "logout":   return sh("loginctl terminate-user $USER");
    }
  }
  return { ok: false, out: `unknown action ${action}` };
}

async function mediaAction(action) {
  // Use OS-native media keys via nut-js when available, otherwise volume only
  if (nut) {
    const { keyboard, Key } = nut;
    const map = {
      play: Key.AudioPlay, pause: Key.AudioPlay,
      next: Key.AudioNext, prev: Key.AudioPrev,
      vol_up: Key.AudioVolUp, vol_down: Key.AudioVolDown, mute: Key.AudioMute,
    };
    if (map[action]) { await keyboard.pressKey(map[action]); await keyboard.releaseKey(map[action]); return { ok: true, out: action }; }
  }
  if (plat === "win32") {
    if (action === "vol_up")   return ps("(New-Object -ComObject WScript.Shell).SendKeys([char]175)");
    if (action === "vol_down") return ps("(New-Object -ComObject WScript.Shell).SendKeys([char]174)");
    if (action === "mute")     return ps("(New-Object -ComObject WScript.Shell).SendKeys([char]173)");
    if (action === "play" || action === "pause") return ps("(New-Object -ComObject WScript.Shell).SendKeys([char]179)");
    if (action === "next")     return ps("(New-Object -ComObject WScript.Shell).SendKeys([char]176)");
    if (action === "prev")     return ps("(New-Object -ComObject WScript.Shell).SendKeys([char]177)");
  }
  return { ok: false, out: `media ${action} unsupported` };
}

async function launchApp(target) {
  if (!target) return { ok: false, out: "no target" };
  if (plat === "win32") return sh(`start "" "${target}"`);
  if (plat === "darwin") return sh(`open -a "${target}"`);
  return sh(`${target} &`);
}

async function typeText(text) {
  if (nut) { await nut.keyboard.type(text); return { ok: true, out: "typed" }; }
  if (plat === "win32") {
    const safe = text.replace(/'/g, "''").replace(/[+^%~(){}]/g, "{$&}");
    return ps(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${safe}')`);
  }
  return { ok: false, out: "type unsupported (install @nut-tree-fork/nut-js)" };
}

async function keyTap(key, modifiers = []) {
  if (nut) {
    const { keyboard, Key } = nut;
    const k = Key[key.charAt(0).toUpperCase() + key.slice(1).toLowerCase()] || Key[key];
    if (!k) return { ok: false, out: `unknown key ${key}` };
    const mods = (modifiers || []).map((m) => Key[m.charAt(0).toUpperCase() + m.slice(1).toLowerCase()]).filter(Boolean);
    await keyboard.pressKey(...mods, k);
    await keyboard.releaseKey(...mods, k);
    return { ok: true, out: `${modifiers?.join("+")}+${key}` };
  }
  return { ok: false, out: "key tap needs @nut-tree-fork/nut-js" };
}

async function mouseAction(cmd) {
  if (!nut) return { ok: false, out: "mouse needs @nut-tree-fork/nut-js" };
  const { mouse, Point, Button } = nut;
  if (cmd.type === "mouse_move") {
    const pos = await mouse.getPosition();
    await mouse.setPosition(new Point(pos.x + (cmd.dx || 0), pos.y + (cmd.dy || 0)));
    return { ok: true, out: "moved" };
  }
  if (cmd.type === "click") {
    const btn = cmd.button === "right" ? Button.RIGHT : cmd.button === "middle" ? Button.MIDDLE : Button.LEFT;
    if (cmd.double) await mouse.doubleClick(btn); else await mouse.click(btn);
    return { ok: true, out: "click" };
  }
  return { ok: false, out: "unknown mouse cmd" };
}

ipcMain.handle("myraa:execute", async (_e, cmd) => {
  try {
    switch (cmd.type) {
      case "open_url":   if (cmd.url) await shell.openExternal(cmd.url); return { ok: true, out: cmd.url };
      case "search_web": if (cmd.query) await shell.openExternal(`https://www.google.com/search?q=${encodeURIComponent(cmd.query)}`); return { ok: true };
      case "launch":     return launchApp(cmd.target || cmd.command);
      case "system":     return systemAction(cmd.action);
      case "media":      return mediaAction(cmd.action);
      case "type":       return typeText(cmd.text || "");
      case "key_tap":    return keyTap(cmd.key, cmd.modifiers || []);
      case "mouse_move":
      case "click":      return mouseAction(cmd);
      case "exec":       return sh(cmd.command);
      default:           return { ok: false, out: `unknown cmd ${cmd.type}` };
    }
  } catch (err) {
    return { ok: false, out: err && err.message ? err.message : String(err) };
  }
});

ipcMain.handle("myraa:info", () => ({
  platform: plat,
  release: os.release(),
  hostname: os.hostname(),
  user: os.userInfo().username,
  nut: !!nut,
  version: app.getVersion(),
}));
