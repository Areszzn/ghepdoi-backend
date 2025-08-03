const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all bank accounts for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [accounts] = await pool.execute(
      'SELECT id, account_name, account_number, bank_name, routing_number, account_type, is_primary, is_verified, created_at FROM bank_accounts WHERE user_id = ? ORDER BY is_primary DESC, created_at DESC',
      [req.user.id]
    );

    res.json({ accounts });
  } catch (error) {
    console.error('Get bank accounts error:', error);
    res.status(500).json({ error: 'Failed to get bank accounts' });
  }
});

// Add new bank account
router.post('/', [
  authenticateToken,
  body('accountName').trim().isLength({ min: 1 }),
  body('accountNumber').trim().isLength({ min: 8 }),
  body('bankName').trim().isLength({ min: 1 }),
  body('routingNumber').optional().trim().isLength({ min: 9, max: 9 }),
  body('accountType').isIn(['checking', 'savings'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { accountName, accountNumber, bankName, routingNumber, accountType } = req.body;

    // Check if account already exists for this user
    const [existingAccounts] = await pool.execute(
      'SELECT id FROM bank_accounts WHERE user_id = ? AND account_number = ? AND bank_name = ?',
      [req.user.id, accountNumber, bankName]
    );

    if (existingAccounts.length > 0) {
      return res.status(400).json({ error: 'Bank account already exists' });
    }

    // Check if this should be the primary account (if user has no accounts yet)
    const [userAccounts] = await pool.execute(
      'SELECT COUNT(*) as count FROM bank_accounts WHERE user_id = ?',
      [req.user.id]
    );

    const isPrimary = userAccounts[0].count === 0;

    // Add bank account
    const [result] = await pool.execute(
      'INSERT INTO bank_accounts (user_id, account_name, account_number, bank_name, routing_number, account_type, is_primary) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, accountName, accountNumber, bankName, routingNumber || null, accountType, isPrimary]
    );

    const accountId = result.insertId;

    // Get the created account
    const [newAccount] = await pool.execute(
      'SELECT id, account_name, account_number, bank_name, routing_number, account_type, is_primary, is_verified, created_at FROM bank_accounts WHERE id = ?',
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

// Set primary bank account
router.put('/:id/set-primary', authenticateToken, async (req, res) => {
  try {
    const accountId = req.params.id;

    // Verify account belongs to user
    const [accounts] = await pool.execute(
      'SELECT id FROM bank_accounts WHERE id = ? AND user_id = ?',
      [accountId, req.user.id]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Remove primary status from all accounts
      await connection.execute(
        'UPDATE bank_accounts SET is_primary = FALSE WHERE user_id = ?',
        [req.user.id]
      );

      // Set new primary account
      await connection.execute(
        'UPDATE bank_accounts SET is_primary = TRUE WHERE id = ? AND user_id = ?',
        [accountId, req.user.id]
      );

      await connection.commit();
      connection.release();

      res.json({ message: 'Primary bank account updated successfully' });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Set primary account error:', error);
    res.status(500).json({ error: 'Failed to set primary account' });
  }
});

// Delete bank account
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const accountId = req.params.id;

    // Verify account belongs to user
    const [accounts] = await pool.execute(
      'SELECT id, is_primary FROM bank_accounts WHERE id = ? AND user_id = ?',
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
      'DELETE FROM bank_accounts WHERE id = ? AND user_id = ?',
      [accountId, req.user.id]
    );

    // If this was the primary account, set another account as primary
    if (accounts[0].is_primary) {
      const [remainingAccounts] = await pool.execute(
        'SELECT id FROM bank_accounts WHERE user_id = ? ORDER BY created_at ASC LIMIT 1',
        [req.user.id]
      );

      if (remainingAccounts.length > 0) {
        await pool.execute(
          'UPDATE bank_accounts SET is_primary = TRUE WHERE id = ?',
          [remainingAccounts[0].id]
        );
      }
    }

    res.json({ message: 'Bank account deleted successfully' });
  } catch (error) {
    console.error('Delete bank account error:', error);
    res.status(500).json({ error: 'Failed to delete bank account' });
  }
});

module.exports = router;
