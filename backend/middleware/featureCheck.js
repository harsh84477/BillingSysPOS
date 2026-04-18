const db = require('../db');

/**
 * Middleware to enforce feature constraints based on business subscription.
 * Requires req.headers['x-business-id'] or req.business.id depending on auth mechanism.
 * 
 * @param {string} featureKey - The feature key from plan_features (e.g., 'exports_enabled')
 * @param {function} customCheck - Optional custom logic (e.g., check limits vs current usage)
 */
const requireFeature = (featureKey, customCheck = null) => {
  return async (req, res, next) => {
    // Assuming simple header pass for multi-tenant identity for illustration
    const businessId = req.headers['x-business-id'] || req.body.business_id || req.query.business_id;

    if (!businessId) {
      return res.status(400).json({ error: 'Business ID is required' });
    }

    try {
      // First, conditionally expire
      await db.query('UPDATE subscriptions SET status = "expired" WHERE business_id = ? AND status IN ("active", "trial") AND end_date IS NOT NULL AND end_date < NOW()', [businessId]);

      // Handle fallback to freemium logic (id=1 typically)
      // For this sample, we just check existence and features.

      const [subs] = await db.query(`
        SELECT s.plan_id 
        FROM subscriptions s 
        WHERE s.business_id = ? AND s.status IN ('active', 'trial') 
        ORDER BY s.id DESC LIMIT 1
      `, [businessId]);

      if (subs.length === 0) {
        return res.status(403).json({ error: 'No active subscription. Please upgrade your plan.' });
      }

      const planId = subs[0].plan_id;

      const [features] = await db.query(
        'SELECT feature_value FROM plan_features WHERE plan_id = ? AND feature_key = ? LIMIT 1',
        [planId, featureKey]
      );

      if (features.length === 0) {
        return res.status(403).json({ error: `Feature [${featureKey}] not defined for your plan.` });
      }

      const value = features[0].feature_value;

      // Handle boolean flags like 'exports_enabled' = 'true'/'false'
      if (value === 'false') {
        return res.status(403).json({ error: 'Feature not allowed on current plan' });
      }

      // If it's a numeric limit string (e.g. max_bills_per_day = '120'), custom Check logic:
      if (customCheck) {
        const checkResult = await customCheck(req, db, value);
        if (!checkResult.allowed) {
          return res.status(403).json({ error: checkResult.reason });
        }
      }

      next();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal feature validation error' });
    }
  };
};

module.exports = requireFeature;

// Usage in some other router (pseudocode):
// const requireFeature = require('../middleware/featureCheck');
// router.post('/export', requireFeature('exports_enabled'), (req, res) => { ... });
// router.post('/add-item', requireFeature('max_items', async (req, db, limitValue) => {
//    if (limitValue === '-1') return { allowed: true };
//    const [items] = await db.query('SELECT COUNT(*) as c FROM items WHERE business_id = ?', [req.headers['x-business-id']]);
//    if (items[0].c >= parseInt(limitValue)) return { allowed: false, reason: 'Item limit reached' };
//    return { allowed: true };
// }), ...);
