const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Generate reference number
const generateReferenceNumber = () => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN${timestamp}${random}`;
};

// Get all transactions for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, type, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE t.user_id = ?';
    const queryParams = [req.user.id];

    if (type && ['deposit', 'withdrawal'].includes(type)) {
      whereClause += ' AND t.type = ?';
      queryParams.push(type);
    }

    if (status && ['pending', 'processing', 'completed', 'cancelled', 'failed'].includes(status)) {
      whereClause += ' AND t.status = ?';
      queryParams.push(status);
    }

    const [transactions] = await pool.execute(
      `SELECT t.*, ba.account_name, ba.bank_name, ba.account_number 
       FROM transactions t 
       LEFT JOIN bank_accounts ba ON t.bank_account_id = ba.id 
       ${whereClause} 
       ORDER BY t.created_at DESC 
       LIMIT ? OFFSET ?`,
      [...queryParams, parseInt(limit), parseInt(offset)]
    );

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM transactions t ${whereClause}`,
      queryParams
    );

    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

// Create deposit transaction
router.post('/deposit', [
  authenticateToken,
  body('amount').isFloat({ min: 0.01 }),
  body('bankAccountId').isInt(),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, bankAccountId, description } = req.body;

    // Verify bank account belongs to user
    const [accounts] = await pool.execute(
      'SELECT id FROM bank_accounts WHERE id = ? AND user_id = ?',
      [bankAccountId, req.user.id]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    const referenceNumber = generateReferenceNumber();

    // Create deposit transaction
    const [result] = await pool.execute(
      'INSERT INTO transactions (user_id, bank_account_id, type, amount, status, description, reference_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, bankAccountId, 'deposit', amount, 'pending', description || null, referenceNumber]
    );

    const transactionId = result.insertId;

    // Get the created transaction with bank account details
    const [transaction] = await pool.execute(
      `SELECT t.*, ba.account_name, ba.bank_name, ba.account_number 
       FROM transactions t 
       LEFT JOIN bank_accounts ba ON t.bank_account_id = ba.id 
       WHERE t.id = ?`,
      [transactionId]
    );

    res.status(201).json({
      message: 'Deposit transaction created successfully',
      transaction: transaction[0]
    });
  } catch (error) {
    console.error('Create deposit error:', error);
    res.status(500).json({ error: 'Failed to create deposit transaction' });
  }
});

// Create withdrawal transaction
router.post('/withdrawal', [
  authenticateToken,
  body('amount').isFloat({ min: 0.01 }),
  body('bankAccountId').isInt(),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, bankAccountId, description } = req.body;

    // Verify bank account belongs to user
    const [accounts] = await pool.execute(
      'SELECT id FROM bank_accounts WHERE id = ? AND user_id = ?',
      [bankAccountId, req.user.id]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    const referenceNumber = generateReferenceNumber();

    // Create withdrawal transaction
    const [result] = await pool.execute(
      'INSERT INTO transactions (user_id, bank_account_id, type, amount, status, description, reference_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, bankAccountId, 'withdrawal', amount, 'pending', description || null, referenceNumber]
    );

    const transactionId = result.insertId;

    // Get the created transaction with bank account details
    const [transaction] = await pool.execute(
      `SELECT t.*, ba.account_name, ba.bank_name, ba.account_number 
       FROM transactions t 
       LEFT JOIN bank_accounts ba ON t.bank_account_id = ba.id 
       WHERE t.id = ?`,
      [transactionId]
    );

    res.status(201).json({
      message: 'Withdrawal transaction created successfully',
      transaction: transaction[0]
    });
  } catch (error) {
    console.error('Create withdrawal error:', error);
    res.status(500).json({ error: 'Failed to create withdrawal transaction' });
  }
});

// Cancel transaction
router.put('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const transactionId = req.params.id;

    // Verify transaction belongs to user and can be cancelled
    const [transactions] = await pool.execute(
      'SELECT id, status, type FROM transactions WHERE id = ? AND user_id = ?',
      [transactionId, req.user.id]
    );

    if (transactions.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = transactions[0];

    if (!['pending', 'processing'].includes(transaction.status)) {
      return res.status(400).json({ error: 'Transaction cannot be cancelled' });
    }

    // Update transaction status
    await pool.execute(
      'UPDATE transactions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['cancelled', transactionId]
    );

    res.json({ message: 'Transaction cancelled successfully' });
  } catch (error) {
    console.error('Cancel transaction error:', error);
    res.status(500).json({ error: 'Failed to cancel transaction' });
  }
});

// Get transaction by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const transactionId = req.params.id;

    const [transactions] = await pool.execute(
      `SELECT t.*, ba.account_name, ba.bank_name, ba.account_number 
       FROM transactions t 
       LEFT JOIN bank_accounts ba ON t.bank_account_id = ba.id 
       WHERE t.id = ? AND t.user_id = ?`,
      [transactionId, req.user.id]
    );

    if (transactions.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ transaction: transactions[0] });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ error: 'Failed to get transaction' });
  }
});

module.exports = router;
