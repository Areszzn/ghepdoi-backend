-- Fix foreign key constraint for transactions table
-- Drop the existing constraint that references bank_accounts
ALTER TABLE transactions DROP FOREIGN KEY transactions_ibfk_2;

-- Add the correct constraint that references bank table
ALTER TABLE transactions ADD CONSTRAINT transactions_ibfk_2 
FOREIGN KEY (bank_account_id) REFERENCES bank(id) ON DELETE SET NULL;
