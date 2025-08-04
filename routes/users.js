const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken, authenticateAdmin } = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, username, display_name, is_verified, vip, trust, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    res.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        isVerified: user.is_verified,
        vip: user.vip || 0,
        trust: user.trust || 0,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// Update user profile
router.put('/profile', [
  authenticateToken,
  body('displayName').optional().trim().isLength({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { displayName } = req.body;

    if (displayName === undefined) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    await pool.execute(
      'UPDATE users SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [displayName, req.user.id]
    );

    // Get updated user data
    const [users] = await pool.execute(
      'SELECT id, username, display_name, is_verified, vip, trust FROM users WHERE id = ?',
      [req.user.id]
    );

    const user = users[0];
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        isVerified: user.is_verified,
        vip: user.vip || 0,
        trust: user.trust || 0
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.put('/change-password', [
  authenticateToken,
  body('currentPassword').exists(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    // Get current password hash
    const [users] = await pool.execute(
      'SELECT password FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, users[0].password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.execute(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedNewPassword, req.user.id]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Get user balance
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT balance FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      balance: users[0].balance || 0
    });
  } catch (error) {
    console.error('Error fetching user balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin endpoints
// Get all users (admin only)
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, username, display_name, balance, vip, trust, role, is_verified, created_at, updated_at FROM users ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get user by ID (admin only)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [users] = await pool.execute(
      'SELECT id, username, display_name, balance, vip, trust, is_verified, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: users[0]
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Create new user (admin only)
router.post('/', [
  authenticateToken,
  body('username').notEmpty().trim().isLength({ min: 3, max: 50 }),
  body('password').isLength({ min: 6 }),
  body('display_name').optional().trim().isLength({ max: 100 }),
  body('balance').optional().isNumeric(),
  body('vip').optional().isInt({ min: 0, max: 10 }),
  body('trust').optional().isInt({ min: 0, max: 100 }),
  body('is_verified').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, display_name, balance, vip, trust, is_verified } = req.body;

    // Check if username already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    const [result] = await pool.execute(
      'INSERT INTO users (username, password, display_name, balance, vip, trust, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, display_name || null, balance || 0, vip || 0, trust || 100, is_verified || false]
    );

    // Get the created user
    const [newUser] = await pool.execute(
      'SELECT id, username, display_name, balance, vip, trust, is_verified, created_at FROM users WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: newUser[0]
    });
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Username already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
});

// Update user (admin only)
router.put('/:id', [
  authenticateToken,
  body('username').optional().trim().isLength({ min: 3, max: 50 }),
  body('display_name').optional().trim().isLength({ max: 100 }),
  body('balance').optional().isNumeric(),
  body('vip').optional().isInt({ min: 0, max: 10 }),
  body('trust').optional().isInt({ min: 0, max: 100 }),
  body('is_verified').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { username, display_name, balance, vip, trust, is_verified } = req.body;

    // Check if user exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );

    if (existingUsers.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if username is taken by another user
    if (username) {
      const [usernameCheck] = await pool.execute(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [username, id]
      );

      if (usernameCheck.length > 0) {
        return res.status(400).json({ error: 'Username already exists' });
      }
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    if (username !== undefined) {
      updateFields.push('username = ?');
      updateValues.push(username);
    }
    if (display_name !== undefined) {
      updateFields.push('display_name = ?');
      updateValues.push(display_name);
    }
    if (balance !== undefined) {
      updateFields.push('balance = ?');
      updateValues.push(balance);
    }
    if (vip !== undefined) {
      updateFields.push('vip = ?');
      updateValues.push(vip);
    }
    if (trust !== undefined) {
      updateFields.push('trust = ?');
      updateValues.push(trust);
    }
    if (is_verified !== undefined) {
      updateFields.push('is_verified = ?');
      updateValues.push(is_verified);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    await pool.execute(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Get the updated user
    const [updatedUser] = await pool.execute(
      'SELECT id, username, display_name, balance, vip, trust, is_verified, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser[0]
    });
  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Username already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );

    if (existingUsers.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await pool.execute(
      'DELETE FROM users WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
