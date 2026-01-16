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
    setStore: (key, val) => ipcRenderer.invoke('set-store', key, val),
    selectImage: () => ipcRenderer.invoke('select-image'),
    toggleOverlay: () => ipcRenderer.invoke('toggle-overlay'),
    onReactionsUpdated: (callback) => {
        const subscription = (_event, value) => callback(value)
        ipcRenderer.on('reactions-updated', subscription)
        return () => ipcRenderer.removeListener('reactions-updated', subscription)
    },
    onSettingsUpdated: (callback) => {
        const subscription = (_event, value) => callback(value)
        ipcRenderer.on('settings-updated', subscription)
        return () => ipcRenderer.removeListener('settings-updated', subscription)
    },
    previewSettings: (settings) => ipcRenderer.send('preview-settings', settings)
})
