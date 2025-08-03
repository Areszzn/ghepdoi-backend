const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get public settings (no authentication required)
router.get('/public', async (req, res) => {
  try {
    const [settings] = await pool.execute(
      'SELECT name, value FROM setting WHERE name IN (?, ?, ?, ?) ORDER BY name ASC',
      ['name_app', 'logo_app', 'bg_login', 'bg_reg']
    );

    // Convert to key-value object for easier frontend usage
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.name] = setting.value;
    });

    res.json({
      success: true,
      data: settingsObj
    });
  } catch (error) {
    console.error('Get public settings error:', error);
    res.status(500).json({ error: 'Failed to get public settings' });
  }
});

// Get all settings
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [settings] = await pool.execute(
      'SELECT * FROM setting ORDER BY name ASC'
    );

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// Get setting by name
router.get('/:name', authenticateToken, async (req, res) => {
  try {
    const { name } = req.params;
    
    const [settings] = await pool.execute(
      'SELECT * FROM setting WHERE name = ?',
      [name]
    );

    if (settings.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({
      success: true,
      data: settings[0]
    });
  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({ error: 'Failed to get setting' });
  }
});

// Create new setting
router.post('/', [
  authenticateToken,
  body('name').notEmpty().trim().isLength({ min: 1, max: 100 }),
  body('value').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, value } = req.body;

    // Check if setting already exists
    const [existingSettings] = await pool.execute(
      'SELECT id FROM setting WHERE name = ?',
      [name]
    );

    if (existingSettings.length > 0) {
      return res.status(400).json({ error: 'Setting with this name already exists' });
    }

    const [result] = await pool.execute(
      'INSERT INTO setting (name, value) VALUES (?, ?)',
      [name, value || null]
    );

    // Get the created setting
    const [newSetting] = await pool.execute(
      'SELECT * FROM setting WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Setting created successfully',
      data: newSetting[0]
    });
  } catch (error) {
    console.error('Create setting error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Setting with this name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create setting' });
    }
  }
});

// Update setting by name
router.put('/:name', [
  authenticateToken,
  body('value').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name } = req.params;
    const { value } = req.body;

    // Check if setting exists
    const [existingSettings] = await pool.execute(
      'SELECT id FROM setting WHERE name = ?',
      [name]
    );

    if (existingSettings.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    await pool.execute(
      'UPDATE setting SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE name = ?',
      [value || null, name]
    );

    // Get the updated setting
    const [updatedSetting] = await pool.execute(
      'SELECT * FROM setting WHERE name = ?',
      [name]
    );

    res.json({
      success: true,
      message: 'Setting updated successfully',
      data: updatedSetting[0]
    });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// Delete setting by name
router.delete('/:name', authenticateToken, async (req, res) => {
  try {
    const { name } = req.params;

    // Check if setting exists
    const [existingSettings] = await pool.execute(
      'SELECT id FROM setting WHERE name = ?',
      [name]
    );

    if (existingSettings.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    await pool.execute(
      'DELETE FROM setting WHERE name = ?',
      [name]
    );

    res.json({
      success: true,
      message: 'Setting deleted successfully'
    });
  } catch (error) {
    console.error('Delete setting error:', error);
    res.status(500).json({ error: 'Failed to delete setting' });
  }
});

module.exports = router;
