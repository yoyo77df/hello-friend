# MYRAA Desktop App

Standalone Electron build — chat e command dile shoja PC te execute hobe.

## Build on your own PC (recommended for Windows .exe)

```bash
# 1. Install deps
npm install
npm install --save-dev electron @electron/packager
# Optional — enables mouse/keyboard automation:
npm install @nut-tree-fork/nut-js

# 2. Build the web UI
npm run build

# 3. Run in dev (uses the live preview)
npx electron electron/main.cjs

# 4. Package as installable app
# Windows:
npx @electron/packager . MYRAA --platform=win32 --arch=x64 --out=electron-release --overwrite
# macOS:
npx @electron/packager . MYRAA --platform=darwin --arch=x64 --out=electron-release --overwrite
# Linux:
npx @electron/packager . MYRAA --platform=linux --arch=x64 --out=electron-release --overwrite
```

Output: `electron-release/MYRAA-<platform>-x64/MYRAA.exe` (or equivalent).

## Notes

- `vite.config.ts` must set `base: './'` for Electron file:// loads.
- Without `@nut-tree-fork/nut-js`, mouse/keyboard simulation is disabled;
  URL open, app launch, media keys, lock/sleep/shutdown still work.
- Windows SmartScreen will warn on first run (unsigned). Click "More info → Run anyway".
