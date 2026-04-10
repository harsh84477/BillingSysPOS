/**
 * electron.cjs — Invoice Adda Electron Main Process
 *
 * This is the Electron entry point for the Windows desktop app.
 * It runs in Node.js (not in the browser).
 *
 * What it does:
 *  - Creates the main BrowserWindow (1280x800 default size)
 *  - Loads dist/index.html — the compiled Vite/React app
 *  - Configures webPreferences to allow the React app to work correctly
 *    (nodeIntegration, contextIsolation off, webSecurity off for local file access)
 *  - Handles window-all-closed event to quit the app
 *  - Opens DevTools in development mode
 *
 * Built by electron-builder into:
 *   release/Invoice Adda Setup 0.0.0.exe  (NSIS installer)
 *   release/win-unpacked/Invoice Adda.exe (portable)
 */
const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    },
  });

  // Always load dist/index.html — works both in dev (npx electron .) and packaged
  mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});