const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsappService');
const { verifyAdminApiKey } = require('../middleware/auth');

// GET /api/whatsapp/status
router.get('/status', verifyAdminApiKey, (req, res) => {
  try {
    const status = whatsappService.getStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/whatsapp/qr
router.get('/qr', verifyAdminApiKey, (req, res) => {
  try {
    const qr = whatsappService.getQR();
    res.json({ qr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/disconnect
router.post('/disconnect', verifyAdminApiKey, async (req, res) => {
  try {
    await whatsappService.disconnect();
    res.json({ success: true, message: 'WhatsApp session disconnected.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/send-message
router.post('/send-message', verifyAdminApiKey, async (req, res) => {
  const { to, text } = req.body;
  if (!to || !text) {
    return res.status(400).json({ error: 'Both "to" and "text" fields are required.' });
  }

  try {
    const response = await whatsappService.sendMessage(to, text);
    res.json({ success: true, message: 'Message sent successfully.', messageId: response?.key?.id || 'N/A' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
