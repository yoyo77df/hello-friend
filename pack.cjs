const packager = require('@electron/packager').packager;
packager({
  dir: '.',
  name: 'MYRAA',
  platform: 'win32',
  arch: 'x64',
  out: 'electron-release',
  overwrite: true,
  appVersion: '1.0.0',
  ignore: [
    /^\/src/, /^\/public/, /^\/supabase/, /^\/\.lovable/,
    /^\/dist/, /^\/electron-release/, /^\/\.output/, /^\/\.git/,
    /^\/\.vite/, /^\/\.wrangler/, /^\/node_modules\/(?!electron|@electron)/
  ],
}).then(p => console.log('OK', p)).catch(e => { console.error(e); process.exit(1); });
