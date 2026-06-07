const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { verifyAdminApiKey } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');

// Specific rate limiter for sensitive assignment endpoint (max 15 requests per 15 minutes)
const assignLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many subscription assignment requests. Please try again later.' }
});

// Validation rules for subscription assignment
const assignValidationRules = [
  body('business_id')
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('business_id must be a string up to 50 characters'),
  body('plan_id')
    .isInt({ min: 1 })
    .withMessage('plan_id must be a positive integer'),
  body('is_trial')
    .optional()
    .isBoolean()
    .withMessage('is_trial must be a boolean value')
];


// Admin: Assign a plan to a business
router.post('/assign', verifyAdminApiKey, assignLimiter, assignValidationRules, validateRequest, async (req, res) => {
  const { business_id, plan_id, is_trial } = req.body;

  try {
    const [plans] = await db.query('SELECT * FROM plans WHERE id = ?', [plan_id]);
    if (plans.length === 0) return res.status(404).json({ error: 'Plan not found' });
    const plan = plans[0];

    // Calculate end date based on plan duration
    let endDate = null;
    let status = is_trial ? 'trial' : 'active';
    let durationDays = is_trial ? 7 : plan.duration_days;

    if (durationDays !== null) {
      endDate = new Date();
      endDate.setDate(endDate.getDate() + durationDays);
    }

    // Inactivate old subscriptions for this business
    await db.query('UPDATE subscriptions SET status = "expired" WHERE business_id = ? AND status IN ("active", "trial")', [business_id]);

    // Insert new subscription
    const [result] = await db.query(
      'INSERT INTO subscriptions (business_id, plan_id, start_date, end_date, status) VALUES (?, ?, NOW(), ?, ?)',
      [business_id, plan_id, endDate, status]
    );

    res.status(201).json({ 
      message: 'Subscription assigned successfully', 
      subscription_id: result.insertId 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Owner: Get active subscription details and features
router.get('/my-subscription/:businessId', [
  param('businessId').isString().trim().isLength({ min: 1, max: 50 }).withMessage('Invalid business ID')
], validateRequest, async (req, res) => {
  const { businessId } = req.params;
  
  try {
    // Basic logic to expire overdue subscriptions
    await db.query('UPDATE subscriptions SET status = "expired" WHERE business_id = ? AND status IN ("active", "trial") AND end_date IS NOT NULL AND end_date < NOW()', [businessId]);

    const [subs] = await db.query(`
      SELECT s.*, p.name as plan_name, p.price
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.business_id = ? AND s.status IN ('active', 'trial')
      ORDER BY s.id DESC LIMIT 1
    `, [businessId]);

    if (subs.length === 0) {
      // Auto-assign freemium? Prompt user to get a plan?
      // For this demo, let's return a "No active subscription message"
      return res.status(200).json({ hasSubscription: false });
    }

    const subscription = subs[0];

    // Fetch features
    const [features] = await db.query('SELECT feature_key, value FROM plan_features WHERE plan_id = ?', [subscription.plan_id]);
    
    const formattedFeatures = features.reduce((acc, curr) => {
      acc[curr.feature_key] = curr.value;
      return acc;
    }, {});

    res.json({
      hasSubscription: true,
      subscription: {
        id: subscription.id,
        plan_name: subscription.plan_name,
        price: subscription.price,
        start_date: subscription.start_date,
        end_date: subscription.end_date,
        status: subscription.status
      },
      features: formattedFeatures
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Admin Dashboard: Subscription Stats
router.get('/stats', verifyAdminApiKey, async (req, res) => {
  try {
    const [subCounts] = await db.query('SELECT status, COUNT(*) as count FROM subscriptions GROUP BY status');
    const [revenue] = await db.query(`
      SELECT SUM(p.price) as total_revenue
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.status = 'active'
    `);
    
    res.json({
      counts: subCounts,
      total_revenue: revenue[0].total_revenue || 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
