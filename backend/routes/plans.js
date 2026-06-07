const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const db = require('../db');
const { verifyAdminApiKey } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');

// Validation rules for Plan creation and editing
const planValidationRules = [
  body('name')
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Name is required and must be at most 50 characters long'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('duration_days')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Duration days must be a positive integer if provided'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean value'),
  body('features')
    .optional()
    .isObject()
    .withMessage('features must be an object')
];


// Get all plans with their features
router.get('/', async (req, res) => {
  try {
    const [plans] = await db.query('SELECT * FROM plans');
    const [features] = await db.query('SELECT * FROM plan_features');
    
    const formattedPlans = plans.map(plan => {
      const planFeaturesArr = features.filter(f => f.plan_id === plan.id);
      const planFeaturesMap = planFeaturesArr.reduce((acc, curr) => {
        acc[curr.feature_key] = curr.value;
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
router.post('/', verifyAdminApiKey, planValidationRules, validateRequest, async (req, res) => {
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
        'INSERT INTO plan_features (plan_id, feature_key, value) VALUES ?',
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
router.put('/:id', verifyAdminApiKey, [
  param('id').isInt({ min: 1 }).withMessage('Invalid plan ID'),
  ...planValidationRules
], validateRequest, async (req, res) => {
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
          'INSERT INTO plan_features (plan_id, feature_key, value) VALUES ?',
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
router.patch('/:id/deactivate', verifyAdminApiKey, [
  param('id').isInt({ min: 1 }).withMessage('Invalid plan ID')
], validateRequest, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('UPDATE plans SET is_active = FALSE WHERE id = ?', [id]);
    res.json({ message: 'Plan deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
