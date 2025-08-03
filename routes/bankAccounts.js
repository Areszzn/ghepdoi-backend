const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all bank accounts (admin) or user's bank accounts
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query, params;

    // Check if this is an admin request (you can add admin check here)
    if (req.query.admin === 'true') {
      // Get all bank accounts with user information
      query = `
        SELECT b.id, b.user_id, b.tentaikhoan, b.sotaikhoan, b.tennganhang,
               b.created_at, b.updated_at, u.username
        FROM bank b
        LEFT JOIN users u ON b.user_id = u.id
        ORDER BY b.created_at DESC
      `;
      params = [];
    } else {
      // Get user's bank accounts only
      query = 'SELECT id, tentaikhoan, sotaikhoan, tennganhang, created_at, updated_at FROM bank WHERE user_id = ? ORDER BY created_at DESC';
      params = [req.user.id];
    }

    const [accounts] = await pool.execute(query, params);

    res.json({
      success: true,
      data: accounts
    });
  } catch (error) {
    console.error('Get bank accounts error:', error);
    res.status(500).json({ error: 'Failed to get bank accounts' });
  }
});

// Add new bank account
router.post('/', [
  authenticateToken,
  body('tentaikhoan').trim().isLength({ min: 1 }),
  body('sotaikhoan').isInt({ min: 1 }),
  body('tennganhang').trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { tentaikhoan, sotaikhoan, tennganhang } = req.body;

    // Check if account already exists for this user
    const [existingAccounts] = await pool.execute(
      'SELECT id FROM bank WHERE user_id = ? AND sotaikhoan = ? AND tennganhang = ?',
      [req.user.id, sotaikhoan, tennganhang]
    );

    if (existingAccounts.length > 0) {
      return res.status(400).json({ error: 'Bank account already exists' });
    }

    // Add bank account
    const [result] = await pool.execute(
      'INSERT INTO bank (user_id, tentaikhoan, sotaikhoan, tennganhang) VALUES (?, ?, ?, ?)',
      [req.user.id, tentaikhoan, sotaikhoan, tennganhang]
    );

    const accountId = result.insertId;

    // Get the created account
    const [newAccount] = await pool.execute(
      'SELECT id, tentaikhoan, sotaikhoan, tennganhang, created_at, updated_at FROM bank WHERE id = ?',
      [accountId]
    );

    res.status(201).json({
      message: 'Bank account added successfully',
      account: newAccount[0]
    });
  } catch (error) {
    console.error('Add bank account error:', error);
    res.status(500).json({ error: 'Failed to add bank account' });
  }
});

// Update bank account
router.put('/:id', [
  authenticateToken,
  body('tentaikhoan').optional().trim().isLength({ min: 1 }),
  body('sotaikhoan').optional().isInt({ min: 1 }),
  body('tennganhang').optional().trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const accountId = req.params.id;
    const { tentaikhoan, sotaikhoan, tennganhang } = req.body;

    // Verify account belongs to user
    const [accounts] = await pool.execute(
      'SELECT id FROM bank WHERE id = ? AND user_id = ?',
      [accountId, req.user.id]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    if (tentaikhoan !== undefined) {
      updateFields.push('tentaikhoan = ?');
      updateValues.push(tentaikhoan);
    }
    if (sotaikhoan !== undefined) {
      updateFields.push('sotaikhoan = ?');
      updateValues.push(sotaikhoan);
    }
    if (tennganhang !== undefined) {
      updateFields.push('tennganhang = ?');
      updateValues.push(tennganhang);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateValues.push(accountId, req.user.id);

    // Update the account
    await pool.execute(
      `UPDATE bank SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`,
      updateValues
    );

    // Get the updated account
    const [updatedAccount] = await pool.execute(
      'SELECT id, tentaikhoan, sotaikhoan, tennganhang, created_at, updated_at FROM bank WHERE id = ?',
      [accountId]
    );

    res.json({
      message: 'Bank account updated successfully',
      account: updatedAccount[0]
    });
  } catch (error) {
    console.error('Update bank account error:', error);
    res.status(500).json({ error: 'Failed to update bank account' });
  }
});

// Delete bank account
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const accountId = req.params.id;

    // Verify account belongs to user
    const [accounts] = await pool.execute(
      'SELECT id FROM bank WHERE id = ? AND user_id = ?',
      [accountId, req.user.id]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    // Check if there are pending transactions for this account
    const [pendingTransactions] = await pool.execute(
      'SELECT COUNT(*) as count FROM transactions WHERE bank_account_id = ? AND status IN ("pending", "processing")',
      [accountId]
    );

    if (pendingTransactions[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete account with pending transactions' });
    }

    // Delete the account
    await pool.execute(
      'DELETE FROM bank WHERE id = ? AND user_id = ?',
      [accountId, req.user.id]
    );

    res.json({ message: 'Bank account deleted successfully' });
  } catch (error) {
    console.error('Delete bank account error:', error);
    res.status(500).json({ error: 'Failed to delete bank account' });
  }
});

// Admin endpoints
// Get bank account by ID (admin only)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [accounts] = await pool.execute(
      `SELECT b.id, b.user_id, b.tentaikhoan, b.sotaikhoan, b.tennganhang,
              b.created_at, b.updated_at, u.username
       FROM bank b
       LEFT JOIN users u ON b.user_id = u.id
       WHERE b.id = ?`,
      [id]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    res.json({
      success: true,
      data: accounts[0]
    });
  } catch (error) {
    console.error('Get bank account by ID error:', error);
    res.status(500).json({ error: 'Failed to get bank account' });
  }
});

// Create bank account (admin only)
router.post('/admin', [
  authenticateToken,
  body('user_id').isInt({ min: 1 }),
  body('tentaikhoan').trim().isLength({ min: 1 }),
  body('sotaikhoan').isInt({ min: 1 }),
  body('tennganhang').trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { user_id, tentaikhoan, sotaikhoan, tennganhang } = req.body;

    // Check if user exists
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE id = ?',
      [user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if account already exists
    const [existingAccounts] = await pool.execute(
      'SELECT id FROM bank WHERE user_id = ? AND sotaikhoan = ? AND tennganhang = ?',
      [user_id, sotaikhoan, tennganhang]
    );

    if (existingAccounts.length > 0) {
      return res.status(400).json({ error: 'Bank account already exists' });
    }

    const [result] = await pool.execute(
      'INSERT INTO bank (user_id, tentaikhoan, sotaikhoan, tennganhang) VALUES (?, ?, ?, ?)',
      [user_id, tentaikhoan, sotaikhoan, tennganhang]
    );

    // Get the created account with user info
    const [newAccount] = await pool.execute(
      `SELECT b.id, b.user_id, b.tentaikhoan, b.sotaikhoan, b.tennganhang,
              b.created_at, b.updated_at, u.username
       FROM bank b
       LEFT JOIN users u ON b.user_id = u.id
       WHERE b.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Bank account created successfully',
      data: newAccount[0]
    });
  } catch (error) {
    console.error('Create bank account error:', error);
    res.status(500).json({ error: 'Failed to create bank account' });
  }
});

// Update bank account (admin only)
router.put('/:id', [
  authenticateToken,
  body('user_id').optional().isInt({ min: 1 }),
  body('tentaikhoan').optional().trim().isLength({ min: 1 }),
  body('sotaikhoan').optional().isInt({ min: 1 }),
  body('tennganhang').optional().trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { user_id, tentaikhoan, sotaikhoan, tennganhang } = req.body;

    // Check if bank account exists
    const [existingAccounts] = await pool.execute(
      'SELECT id FROM bank WHERE id = ?',
      [id]
    );

    if (existingAccounts.length === 0) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    // Check if user exists (if user_id is being updated)
    if (user_id) {
      const [users] = await pool.execute(
        'SELECT id FROM users WHERE id = ?',
        [user_id]
      );

      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    if (user_id !== undefined) {
      updateFields.push('user_id = ?');
      updateValues.push(user_id);
    }
    if (tentaikhoan !== undefined) {
      updateFields.push('tentaikhoan = ?');
      updateValues.push(tentaikhoan);
    }
    if (sotaikhoan !== undefined) {
      updateFields.push('sotaikhoan = ?');
      updateValues.push(sotaikhoan);
    }
    if (tennganhang !== undefined) {
      updateFields.push('tennganhang = ?');
      updateValues.push(tennganhang);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    await pool.execute(
      `UPDATE bank SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Get the updated account with user info
    const [updatedAccount] = await pool.execute(
      `SELECT b.id, b.user_id, b.tentaikhoan, b.sotaikhoan, b.tennganhang,
              b.created_at, b.updated_at, u.username
       FROM bank b
       LEFT JOIN users u ON b.user_id = u.id
       WHERE b.id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'Bank account updated successfully',
      data: updatedAccount[0]
    });
  } catch (error) {
    console.error('Update bank account error:', error);
    res.status(500).json({ error: 'Failed to update bank account' });
  }
});

// Delete bank account (admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if bank account exists
    const [existingAccounts] = await pool.execute(
      'SELECT id FROM bank WHERE id = ?',
      [id]
    );

    if (existingAccounts.length === 0) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    // Check if there are pending transactions for this account
    const [pendingTransactions] = await pool.execute(
      'SELECT COUNT(*) as count FROM transactions WHERE bank_account_id = ? AND status IN ("pending", "processing")',
      [id]
    );

    if (pendingTransactions[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete bank account with pending transactions' });
    }

    await pool.execute(
      'DELETE FROM bank WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Bank account deleted successfully'
    });
  } catch (error) {
    console.error('Delete bank account error:', error);
    res.status(500).json({ error: 'Failed to delete bank account' });
  }
});

module.exports = router;
