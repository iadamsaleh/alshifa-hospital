const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  exportPdf: (suggestedName) => ipcRenderer.invoke("export-pdf", suggestedName),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
});
