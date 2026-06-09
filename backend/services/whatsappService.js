const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, DisconnectReason, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');

let sock = null;
let ioInstance = null;
let connectionStatus = 'Disconnected'; // 'Disconnected' | 'QR Waiting' | 'Connecting' | 'Connected'
let qrCodeString = '';
let connectedUser = {
  name: '',
  number: ''
};

// Local file auth session directory
const sessionDir = path.join(__dirname, '../session_whatsapp');

// Ensure directory exists
if (!fs.existsSync(sessionDir)) {
  fs.mkdirSync(sessionDir, { recursive: true });
}

// Broadcast status to Socket.IO clients
function broadcastState() {
  if (ioInstance) {
    ioInstance.emit('whatsapp-status', {
      status: connectionStatus,
      user: connectedUser
    });
    if (connectionStatus === 'QR Waiting' && qrCodeString) {
      ioInstance.emit('whatsapp-qr', qrCodeString);
    }
  }
}

// Start WhatsApp connection
async function startWhatsAppConnection() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const logger = pino({ level: 'error' });

    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false, // Turn off terminal pollution
      logger,
      browser: ['Invoice Adda POS', 'Chrome', '1.0.0']
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        connectionStatus = 'QR Waiting';
        qrCodeString = qr;
        broadcastState();
      }

      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log('WhatsApp connection closed. Reconnecting:', shouldReconnect, lastDisconnect?.error);
        
        connectionStatus = 'Disconnected';
        qrCodeString = '';
        connectedUser = { name: '', number: '' };
        broadcastState();

        if (shouldReconnect) {
          await delay(5000);
          startWhatsAppConnection();
        }
      } else if (connection === 'connecting') {
        connectionStatus = 'Connecting';
        broadcastState();
      } else if (connection === 'open') {
        connectionStatus = 'Connected';
        qrCodeString = '';
        
        const user = sock.user;
        connectedUser = {
          name: user.name || 'WhatsApp Terminal',
          number: user.id.split(':')[0]
        };
        console.log('WhatsApp Web connected successfully. User:', connectedUser);
        broadcastState();
      }
    });

    sock.ev.on('creds.update', saveCreds);

  } catch (err) {
    console.error('Error starting WhatsApp connection:', err);
    connectionStatus = 'Disconnected';
    broadcastState();
  }
}

// Clear folder session files
function deleteFolderRecursive(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const curPath = path.join(dirPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
  }
}

module.exports = {
  init: (io) => {
    ioInstance = io;

    io.on('connection', (socket) => {
      // Send active status immediately to new connection
      socket.emit('whatsapp-status', {
        status: connectionStatus,
        user: connectedUser
      });
      if (connectionStatus === 'QR Waiting' && qrCodeString) {
        socket.emit('whatsapp-qr', qrCodeString);
      }
    });

    startWhatsAppConnection();
  },

  getStatus: () => {
    return {
      status: connectionStatus,
      user: connectedUser
    };
  },

  getQR: () => qrCodeString,

  disconnect: async () => {
    console.log('Disconnecting WhatsApp session...');
    connectionStatus = 'Disconnected';
    qrCodeString = '';
    connectedUser = { name: '', number: '' };
    
    if (sock) {
      try {
        await sock.logout();
      } catch (e) {
        console.warn('Baileys socket logout warning:', e.message);
      }
      try {
        sock.end();
      } catch (e) {
        console.warn('Baileys socket close warning:', e.message);
      }
      sock = null;
    }

    // Clear saved multi-file authentication state folder
    try {
      deleteFolderRecursive(sessionDir);
      console.log('WhatsApp session authentication storage cleared.');
    } catch (err) {
      console.error('Error clearing session folder:', err);
    }

    broadcastState();

    // Trigger fresh socket setup
    setTimeout(() => {
      startWhatsAppConnection();
    }, 2000);
  },

  sendMessage: async (to, text) => {
    if (connectionStatus !== 'Connected' || !sock) {
      throw new Error('WhatsApp connection is not active.');
    }

    let cleanPhone = to.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone; // Prefix India code
    }
    const jid = `${cleanPhone}@s.whatsapp.net`;

    console.log(`Sending WhatsApp message to ${jid}:`, text);
    const sent = await sock.sendMessage(jid, { text });
    return sent;
  }
};
