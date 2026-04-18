const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all plans with their features
router.get('/', async (req, res) => {
  try {
    const [plans] = await db.query('SELECT * FROM plans');
    const [features] = await db.query('SELECT * FROM plan_features');
    
    const formattedPlans = plans.map(plan => {
      const planFeaturesArr = features.filter(f => f.plan_id === plan.id);
      const planFeaturesMap = planFeaturesArr.reduce((acc, curr) => {
        acc[curr.feature_key] = curr.feature_value;
        return acc;
      }, {});
      
      return { ...plan, features: planFeaturesMap };
    });
    
    res.json(formattedPlans);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Admin: Create Plan
router.post('/', async (req, res) => {
  const { name, price, duration_days, is_active, features } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO plans (name, price, duration_days, is_active) VALUES (?, ?, ?, ?)',
      [name, price, duration_days, is_active]
    );
    const planId = result.insertId;
    
    if (features && Object.keys(features).length > 0) {
      const featureRows = Object.entries(features).map(([key, value]) => [planId, key, String(value)]);
      await db.query(
        'INSERT INTO plan_features (plan_id, feature_key, feature_value) VALUES ?',
        [featureRows]
      );
    }
    
    res.status(201).json({ id: planId, message: 'Plan created successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Admin: Edit Plan
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, price, duration_days, is_active, features } = req.body;
  
  try {
    await db.query(
      'UPDATE plans SET name = ?, price = ?, duration_days = ?, is_active = ? WHERE id = ?',
      [name, price, duration_days, is_active, id]
    );
    
    if (features) {
      // Simplest way is to drop existing features and insert new ones
      await db.query('DELETE FROM plan_features WHERE plan_id = ?', [id]);
      
      if (Object.keys(features).length > 0) {
        const featureRows = Object.entries(features).map(([key, value]) => [id, key, String(value)]);
        await db.query(
          'INSERT INTO plan_features (plan_id, feature_key, feature_value) VALUES ?',
          [featureRows]
        );
      }
    }
    
    res.json({ message: 'Plan updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Admin: Deactivate plan
router.patch('/:id/deactivate', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('UPDATE plans SET is_active = FALSE WHERE id = ?', [id]);
    res.json({ message: 'Plan deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
