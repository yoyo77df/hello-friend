## Goal
MYRAA ekta installable desktop app hobe. Install korar por chat e command dile **shoja PC te execute hobe** — alada WebSocket agent, browser tab, ba URL kichui lagbe na.

## Architecture change
Ageer setup: Browser UI → WebSocket → alada `myraa-agent.js` (user ke manually run korte hoto).
Notun setup: **Electron app** — ek window er moddhei React UI + Node.js main process. UI direct IPC (`ipcRenderer.invoke`) diye main process ke command pathabe, main process OS level e execute korbe.

```text
┌─────────────────────────────────────┐
│  MYRAA.exe (Electron)               │
│  ┌─────────────┐   IPC   ┌────────┐ │
│  │ React UI    │ ──────▶ │ Main   │ │
│  │ (chat,earth)│         │ process│ │
│  └─────────────┘         │ +nut-js│ │
│         │                └────────┘ │
│         ▼ HTTPS                     │
│   Lovable AI Gateway (cloud)        │
└─────────────────────────────────────┘
```

AI command interpretation cloud e thakbe (Lovable AI), karon model local e cholbe na — but execution 100% local.

## What I'll build

1. **Electron shell**
   - `electron/main.cjs` — BrowserWindow create, IPC handlers register
   - `electron/preload.cjs` — `window.myraa.execute(cmd)` expose kora (contextIsolation safe)
   - `vite.config.ts` e `base: './'` set kora (file:// load er jonno)

2. **Native command executor** (main process e)
   - `@nut-tree-fork/nut-js` — mouse, keyboard, screen
   - `child_process` — app launch, shell command, shutdown/lock/sleep
   - `open` — URL/file open
   - Supported: mouse_move, click, type, key_tap, hotkey, launch, open_url, search_web, system (lock/sleep/shutdown/restart/logout), volume, media (play/pause/next/prev), exec (raw shell)

3. **React UI update**
   - `use-agent.ts` rewrite — WebSocket bad, `window.myraa.execute()` use korbe (Electron e), browser e fallback dekhabe "Desktop app e cholun"
   - Connection status UI remove (always connected in desktop)
   - Setup modal remove

4. **AI server function** (already ache)
   - `interpretCommand` cloud e structured commands return kore — unchanged
   - Result UI theke directly local executor e pathano hobe

5. **Packaging**
   - `@electron/packager` diye `.exe` (Windows), `.app` (macOS), Linux binary build
   - `npm run dist` script
   - Output `electron-release/` folder — user double-click korei chalate parbe

## Files to add/change
- `electron/main.cjs` (new)
- `electron/preload.cjs` (new)
- `src/lib/use-agent.ts` (rewrite — IPC based)
- `src/routes/index.tsx` (remove WS/setup UI, simplify)
- `vite.config.ts` (`base: './'`)
- `package.json` (electron scripts, deps)
- `public/myraa-agent.js` (delete — ar lagbe na)

## Limitations Sir ke jana uchit
- **`.exe` ami sandbox e Linux theke build korbo** — chalbe but Windows code-signing nai, prothom run e SmartScreen warning ashte pare ("Run anyway" click korte hobe).
- AI command interpretation er jonno internet lagbe (Lovable AI cloud)। Local execution offline kaj korbe.
- `nut-js` Windows e install er somoy native build korbe — Sir ke ekbar `npm install` chalate hobe app folder e, othoba ami pre-built binary include korar try korbo.

## Deliverable
Sir, build seshe ami `/mnt/documents/MYRAA-win32-x64.zip` (Windows) ar Linux/Mac builds dibo — Sir extract kore `MYRAA.exe` double click korlei full app khulbe, chat e Banglish e bolei PC control hobe.

Confirm korle shuru kori?