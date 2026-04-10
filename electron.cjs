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
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

// Register custom deep-link protocol so Supabase can redirect back to the app
// after Google OAuth in the system browser.
// Redirect URL used: invoiceadda://oauth-callback
app.setAsDefaultProtocolClient('invoiceadda');

// Enforce single instance so the protocol URL reaches the running window on Windows
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow;

function createWindow() {
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
}

// Windows: when a protocol URL opens the app as a second instance,
// forward the URL to the already-running window's renderer.
app.on('second-instance', (_event, commandLine) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
  const protocolUrl = commandLine.find(arg => arg.startsWith('invoiceadda://'));
  if (protocolUrl && mainWindow) {
    mainWindow.webContents.send('oauth-callback', protocolUrl);
  }
});

// macOS: deep-link arrives via open-url event
app.on('open-url', (event, url) => {
  event.preventDefault();
  if (mainWindow) {
    mainWindow.webContents.send('oauth-callback', url);
  }
});

app.on('ready', () => {
  createWindow();

  // Handle protocol URL if app was launched directly by the OS (Windows cold-start)
  const coldStartUrl = process.argv.find(arg => arg.startsWith('invoiceadda://'));
  if (coldStartUrl && mainWindow) {
    // Wait for renderer to be ready before sending
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.send('oauth-callback', coldStartUrl);
    });
  }
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