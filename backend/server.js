const express = require('express');
const cors = require('cors');
require('dotenv').config();

const plansRoutes = require('./routes/plans');
const subscriptionsRoutes = require('./routes/subscriptions');

const app = express();

app.use(cors());
app.use(express.json());

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
