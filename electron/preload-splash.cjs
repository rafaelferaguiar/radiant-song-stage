// electron/preload-splash.cjs
// Preload minimo para a splash screen: expoe canal de progresso.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("__electronBridge__", {
  onSplashProgress: (callback) => {
    ipcRenderer.on("splash:progress", (_event, data) => callback(data));
  },
});
