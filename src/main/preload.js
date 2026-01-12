const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    registerHotkey: (accelerator) => ipcRenderer.invoke('register-hotkey', accelerator),
    unregisterHotkey: (accelerator) => ipcRenderer.invoke('unregister-hotkey', accelerator),
    unregisterAllHotkeys: () => ipcRenderer.invoke('unregister-all-hotkeys'),
    onHotkeyTriggered: (callback) => {
        const subscription = (_event, value) => callback(value)
        ipcRenderer.on('hotkey-triggered', subscription)
        return () => ipcRenderer.removeListener('hotkey-triggered', subscription)
    },
    platform: process.platform,
    getStore: (key) => ipcRenderer.invoke('get-store', key),
    setStore: (key, val) => ipcRenderer.invoke('set-store', key, val)
})
