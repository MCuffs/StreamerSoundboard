const { app, BrowserWindow, globalShortcut, ipcMain, protocol, net } = require('electron')
const path = require('path')
const url = require('url')

let mainWindow

// Register protocol for local media access
protocol.registerSchemesAsPrivileged([
    { scheme: 'media', privileges: { secure: true, supportFetchAPI: true, bypassCSP: true } }
])

let store;
(async () => {
    const { default: Store } = await import('electron-store');
    store = new Store();
})();

// Store IPC
ipcMain.handle('get-store', (event, key) => {
    return store ? store.get(key) : null;
});

ipcMain.handle('set-store', (event, key, value) => {
    if (store) store.set(key, value);
});

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 700,
        titleBarStyle: 'hiddenInset', // Mac style, looks premium
        backgroundColor: '#1a1a1a',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false // Still checking if needed with custom protocol, keeping for safety
        }
    })

    // In production, load the file. In dev, load localhost.
    const isDev = !app.isPackaged;
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173')
        mainWindow.webContents.openDevTools({ mode: 'detach' })
    } else {
        mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
    }
}

app.whenReady().then(() => {
    // Handle media protocol
    // processing 'media://' using registerFileProtocol is more robust for audio/video streaming (Range headers)
    protocol.registerFileProtocol('media', (request, callback) => {
        const url = request.url.replace('media://', '')
        try {
            return callback(decodeURIComponent(url))
        } catch (error) {
            console.error(error)
            return callback(404)
        }
    })
    createWindow()

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

// --- IPC & Hotkeys ---

// Store registered accelerators to clear them later if needed
let currentHotkeys = new Set();

ipcMain.handle('register-hotkey', (event, accelerator) => {
    if (currentHotkeys.has(accelerator)) return true; // Already registered

    try {
        const ret = globalShortcut.register(accelerator, () => {
            // Send message to renderer that hotkey was pressed
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('hotkey-triggered', accelerator)
            }
        })

        if (!ret) {
            console.log('Registration failed for:', accelerator)
            return false
        }

        currentHotkeys.add(accelerator)
        console.log('Registered:', accelerator)
        return true
    } catch (err) {
        console.error(err)
        return false
    }
})

ipcMain.handle('unregister-hotkey', (event, accelerator) => {
    globalShortcut.unregister(accelerator)
    currentHotkeys.delete(accelerator)
})

ipcMain.handle('unregister-all-hotkeys', () => {
    globalShortcut.unregisterAll()
    currentHotkeys.clear()
})
