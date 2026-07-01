# MYRAA — Standalone Desktop App

Desktop app ekhon **fully self-contained** — TanStack Start ba web build lagbe na.
UI, AI (Lovable AI Gateway direct), OS control — shob `electron/` folder ei ache.

## First-time setup (apnar Windows PC te)

```powershell
# 1. Project folder e jan
cd path\to\project

# 2. Dependencies install
npm install
npm install --save-dev electron @electron/packager
# Optional (mouse/keyboard sim er jonno):
npm install @nut-tree-fork/nut-js

# 3. Run
npx electron .
```

App khulbe → prothom bar **Lovable API key** chaibe. Ekbar diye deben, `%APPDATA%/MYRAA/myraa.config.json` te save hobe.

## Build a `.exe`

```powershell
npx @electron/packager . MYRAA --platform=win32 --arch=x64 --out=release --overwrite --ignore="^/src" --ignore="^/public" --ignore="^/dist" --ignore="^/.lovable" --ignore="^/supabase"
```

Output: `release/MYRAA-win32-x64/MYRAA.exe` — double-click e chalu.

## Lovable API key kotha theke pabo?

Lovable dashboard → Settings → API Keys → **Create new** → copy koro (`lovable_pat_...`). App khullei paste korben.

## Commands ja kaj kore

- **Apps**: chrome, firefox, edge, spotify, code, explorer, notepad, calc, cmd, powershell, discord, telegram, whatsapp, paint, word, excel
- **Web**: gmail, youtube search, google search, kono URL
- **Media**: play/pause, next, prev, volume up/down, mute
- **System**: lock, sleep, shutdown, restart, logout, cancel, screenshot
- **Shell**: `exec` diye je kono cmd/powershell command
- **Keyboard**: `key_tap` (ctrl+t, alt+f4), `key_type` (literal text) — nut-js lagbe

## Troubleshooting

- **Blank window** → devtools open kore console dekhen (F12).
- **AI error 401/403** → API key wrong. Sidebar "Change API Key" te click.
- **Mouse/keyboard kaj kore na** → `npm install @nut-tree-fork/nut-js` chalan.
