const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("myraa", {
  isDesktop: true,
  execute: (cmd) => ipcRenderer.invoke("myraa:execute", cmd),
  info:    () => ipcRenderer.invoke("myraa:info"),
  ai:      (prompt) => ipcRenderer.invoke("myraa:ai", prompt),
  hasKey:  () => ipcRenderer.invoke("myraa:hasKey"),
  setKey:  (key) => ipcRenderer.invoke("myraa:setKey", key),
});
