const express = require('express');
const cors = require('cors');
require('dotenv').config();

const plansRoutes = require('./routes/plans');
const subscriptionsRoutes = require('./routes/subscriptions');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Set security headers
app.use(helmet());

// Secure CORS Configuration
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5173'];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile/desktop apps, curl, or backend-to-backend)
    if (!origin) return callback(null, true);
    
    if (
      allowedOrigins.includes(origin) ||
      allowedOrigins.includes('*') ||
      origin.startsWith('capacitor://') ||
      origin.startsWith('chrome-extension://') ||
      origin.startsWith('file://') ||
      origin.includes('localhost')
    ) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};
app.use(cors(corsOptions));

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});
app.use(limiter);

// Parse JSON with limit to prevent denial of service (max 100kb)
app.use(express.json({ limit: '100kb' }));

app.use('/api/plans', plansRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  
  // Background Cron Job for Auto Expiry
  const db = require('./db');
  setInterval(async () => {
    try {
      // Find expired active/trial subscriptions
      const [expiredSubs] = await db.query(`
        SELECT * FROM subscriptions 
        WHERE status IN ('active', 'trial') 
        AND end_date IS NOT NULL 
        AND end_date < NOW()
      `);

      for (const sub of expiredSubs) {
        // Change status to expired
        await db.query('UPDATE subscriptions SET status = "expired" WHERE id = ?', [sub.id]);

        // Auto assign Freemium (plan_id = 1) if plan_id wasn't already freemium
        if (sub.plan_id !== 1) {
          await db.query(
            'INSERT INTO subscriptions (business_id, plan_id, start_date, end_date, status) VALUES (?, 1, NOW(), DATE_ADD(NOW(), INTERVAL 36500 DAY), "active")',
            [sub.business_id]
          );
        }
      }
      if(expiredSubs.length > 0) {
        console.log(`Auto-expired and downgraded ${expiredSubs.length} subscriptions to Freemium.`);
      }
    } catch (err) {
      console.error('Error in cron job', err);
    }
  }, 1000 * 60 * 60); // Run every hour
});
