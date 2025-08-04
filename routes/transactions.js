const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken, authenticateAdmin } = require('../middleware/auth');

const router = express.Router();

// Generate reference number
const generateReferenceNumber = () => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN${timestamp}${random}`;
};

// Get all transactions (admin) or user's transactions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, type, status, admin } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let queryParams = [];

    if (admin === 'true') {
      // Check if user has admin privileges
      const [users] = await pool.execute(
        'SELECT role FROM users WHERE id = ?',
        [req.user.id]
      );

      if (users.length === 0 || users[0].role !== 1) {
        return res.status(403).json({ error: 'Admin privileges required' });
      }

      // Admin view - get all transactions with user info
      whereClause = 'WHERE 1=1';
    } else {
      // User view - get only user's transactions
      whereClause = 'WHERE t.user_id = ?';
      queryParams = [req.user.id];
    }

    if (type && ['deposit', 'withdrawal'].includes(type)) {
      whereClause += ' AND t.type = ?';
      queryParams.push(type);
    }

    if (status && ['pending', 'processing', 'completed', 'cancelled', 'failed'].includes(status)) {
      whereClause += ' AND t.status = ?';
      queryParams.push(status);
    }

    const [transactions] = await pool.execute(
      `SELECT t.*, b.tentaikhoan, b.tennganhang, b.sotaikhoan, u.username
       FROM transactions t
       LEFT JOIN bank b ON t.bank_account_id = b.id
       LEFT JOIN users u ON t.user_id = u.id
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
      'SELECT id FROM bank WHERE id = ? AND user_id = ?',
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
      `SELECT t.*, b.tentaikhoan, b.tennganhang, b.sotaikhoan
       FROM transactions t
       LEFT JOIN bank b ON t.bank_account_id = b.id
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
      'SELECT id FROM bank WHERE id = ? AND user_id = ?',
      [bankAccountId, req.user.id]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    // Check user balance
    const [users] = await pool.execute(
      'SELECT balance FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentBalance = parseFloat(users[0].balance) || 0;
    const withdrawAmount = parseFloat(amount);

    if (currentBalance < withdrawAmount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const referenceNumber = generateReferenceNumber();

    // Get connection for transaction
    const connection = await pool.getConnection();

    try {
      // Start transaction
      await connection.beginTransaction();

      // Deduct balance from user account
      await connection.execute(
        'UPDATE users SET balance = balance - ? WHERE id = ?',
        [withdrawAmount, req.user.id]
      );

      // Create withdrawal transaction
      const [result] = await connection.execute(
        'INSERT INTO transactions (user_id, bank_account_id, type, amount, status, description, reference_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [req.user.id, bankAccountId, 'withdrawal', withdrawAmount, 'pending', description || null, referenceNumber]
      );

      // Commit transaction
      await connection.commit();

      const transactionId = result.insertId;

      // Get the created transaction with bank account details (using pool for read)
      const [transaction] = await pool.execute(
        `SELECT t.*, b.tentaikhoan, b.tennganhang, b.sotaikhoan
         FROM transactions t
         LEFT JOIN bank b ON t.bank_account_id = b.id
         WHERE t.id = ?`,
        [transactionId]
      );

      res.status(201).json({
        message: 'Withdrawal transaction created successfully',
        transaction: transaction[0]
      });
    } catch (dbError) {
      // Rollback transaction on error
      await connection.rollback();
      throw dbError;
    } finally {
      // Release connection
      connection.release();
    }
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
      'SELECT id, status, type, amount FROM transactions WHERE id = ? AND user_id = ?',
      [transactionId, req.user.id]
    );

    if (transactions.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = transactions[0];

    if (!['pending', 'processing'].includes(transaction.status)) {
      return res.status(400).json({ error: 'Transaction cannot be cancelled' });
    }

    // Get connection for transaction
    const connection = await pool.getConnection();

    try {
      // Start transaction
      await connection.beginTransaction();

      // If it's a withdrawal, refund the amount to user balance
      if (transaction.type === 'withdrawal') {
        await connection.execute(
          'UPDATE users SET balance = balance + ? WHERE id = ?',
          [transaction.amount, req.user.id]
        );
      }

      // Update transaction status
      await connection.execute(
        'UPDATE transactions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['cancelled', transactionId]
      );

      // Commit transaction
      await connection.commit();
    } catch (dbError) {
      // Rollback transaction on error
      await connection.rollback();
      throw dbError;
    } finally {
      // Release connection
      connection.release();
    }

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
      `SELECT t.*, b.tentaikhoan, b.tennganhang, b.sotaikhoan
       FROM transactions t
       LEFT JOIN bank b ON t.bank_account_id = b.id
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

// Admin endpoints
// Get transaction by ID (admin only)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [transactions] = await pool.execute(
      `SELECT t.*, b.tentaikhoan, b.tennganhang, b.sotaikhoan, u.username
       FROM transactions t
       LEFT JOIN bank b ON t.bank_account_id = b.id
       LEFT JOIN users u ON t.user_id = u.id
       WHERE t.id = ?`,
      [id]
    );

    if (transactions.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({
      success: true,
      data: transactions[0]
    });
  } catch (error) {
    console.error('Get transaction by ID error:', error);
    res.status(500).json({ error: 'Failed to get transaction' });
  }
});

// Create transaction (admin only)
router.post('/admin', [
  authenticateToken,
  body('user_id').isInt({ min: 1 }),
  body('bank_account_id').optional().isInt({ min: 1 }),
  body('type').isIn(['deposit', 'withdrawal']),
  body('amount').isFloat({ min: 1000 }),
  body('status').optional().isIn(['pending', 'processing', 'completed', 'cancelled', 'failed']),
  body('description').optional().trim(),
  body('reference_number').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { user_id, bank_account_id, type, amount, status, description, reference_number } = req.body;

    // Check if user exists
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE id = ?',
      [user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if bank account exists and belongs to user (if provided)
    if (bank_account_id) {
      const [bankAccounts] = await pool.execute(
        'SELECT id FROM bank WHERE id = ? AND user_id = ?',
        [bank_account_id, user_id]
      );

      if (bankAccounts.length === 0) {
        return res.status(404).json({ error: 'Bank account not found or does not belong to user' });
      }
    }

    const finalReferenceNumber = reference_number || generateReferenceNumber();
    const finalStatus = status || 'pending';

    const [result] = await pool.execute(
      'INSERT INTO transactions (user_id, bank_account_id, type, amount, status, description, reference_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [user_id, bank_account_id || null, type, amount, finalStatus, description || null, finalReferenceNumber]
    );

    // Get the created transaction with related data
    const [newTransaction] = await pool.execute(
      `SELECT t.*, b.tentaikhoan, b.tennganhang, b.sotaikhoan, u.username
       FROM transactions t
       LEFT JOIN bank b ON t.bank_account_id = b.id
       LEFT JOIN users u ON t.user_id = u.id
       WHERE t.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: newTransaction[0]
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Reference number already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create transaction' });
    }
  }
});

// Update transaction (admin only)
router.put('/:id', [
  authenticateToken,
  body('user_id').optional().isInt({ min: 1 }),
  body('bank_account_id').optional().isInt({ min: 1 }),
  body('type').optional().isIn(['deposit', 'withdrawal']),
  body('amount').optional().isFloat({ min: 1000 }),
  body('status').optional().isIn(['pending', 'processing', 'completed', 'cancelled', 'failed']),
  body('description').optional().trim(),
  body('reference_number').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { user_id, bank_account_id, type, amount, status, description, reference_number } = req.body;

    // Check if transaction exists
    const [existingTransactions] = await pool.execute(
      'SELECT id FROM transactions WHERE id = ?',
      [id]
    );

    if (existingTransactions.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
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

    // Check if bank account exists and belongs to user (if provided)
    if (bank_account_id && user_id) {
      const [bankAccounts] = await pool.execute(
        'SELECT id FROM bank WHERE id = ? AND user_id = ?',
        [bank_account_id, user_id]
      );

      if (bankAccounts.length === 0) {
        return res.status(404).json({ error: 'Bank account not found or does not belong to user' });
      }
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    if (user_id !== undefined) {
      updateFields.push('user_id = ?');
      updateValues.push(user_id);
    }
    if (bank_account_id !== undefined) {
      updateFields.push('bank_account_id = ?');
      updateValues.push(bank_account_id);
    }
    if (type !== undefined) {
      updateFields.push('type = ?');
      updateValues.push(type);
    }
    if (amount !== undefined) {
      updateFields.push('amount = ?');
      updateValues.push(amount);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);

      // Set completed_at if status is completed
      if (status === 'completed') {
        updateFields.push('completed_at = CURRENT_TIMESTAMP');
      }
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (reference_number !== undefined) {
      updateFields.push('reference_number = ?');
      updateValues.push(reference_number);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    await pool.execute(
      `UPDATE transactions SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Get the updated transaction with related data
    const [updatedTransaction] = await pool.execute(
      `SELECT t.*, b.tentaikhoan, b.tennganhang, b.sotaikhoan, u.username
       FROM transactions t
       LEFT JOIN bank b ON t.bank_account_id = b.id
       LEFT JOIN users u ON t.user_id = u.id
       WHERE t.id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'Transaction updated successfully',
      data: updatedTransaction[0]
    });
  } catch (error) {
    console.error('Update transaction error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Reference number already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update transaction' });
    }
  }
});

// Delete transaction (admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if transaction exists
    const [existingTransactions] = await pool.execute(
      'SELECT id FROM transactions WHERE id = ?',
      [id]
    );

    if (existingTransactions.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await pool.execute(
      'DELETE FROM transactions WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

module.exports = router;
