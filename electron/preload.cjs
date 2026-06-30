const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("myraa", {
  isDesktop: true,
  execute: (cmd) => ipcRenderer.invoke("myraa:execute", cmd),
  info: () => ipcRenderer.invoke("myraa:info"),
});
