-- Add completed_at column to transactions table
ALTER TABLE transactions ADD COLUMN completed_at TIMESTAMP NULL DEFAULT NULL;
