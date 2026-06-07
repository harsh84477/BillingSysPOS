/**
 * preload.cjs — Electron Preload Script
 *
 * This script runs in a sandboxed context before the renderer page loads.
 * It uses contextBridge to safely expose specific Electron APIs to the
 * renderer process without giving it full Node.js access.
 *
 * Security: With contextIsolation=true and nodeIntegration=false,
 * the renderer cannot access Node.js or Electron internals directly.
 * Only the APIs exposed here via contextBridge are available.
 */
const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Open a URL in the system's default browser.
   * Used for OAuth flows (Google sign-in) on desktop.
   */
  openExternal: (url) => {
    // Validate URL to prevent arbitrary protocol handler abuse
    if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
      shell.openExternal(url);
    }
  },

  /**
   * Listen for OAuth callback deep-link URLs forwarded from the main process.
   * The main process captures invoiceadda:// protocol URLs and sends them here.
   */
  onOAuthCallback: (callback) => {
    const listener = (_event, url) => {
      if (typeof callback === 'function') {
        callback(url);
      }
    };
    ipcRenderer.on('oauth-callback', listener);
    return () => {
      ipcRenderer.removeListener('oauth-callback', listener);
    };
  },

  /**
   * Check if running in Electron environment.
   */
  isElectron: true,
});
