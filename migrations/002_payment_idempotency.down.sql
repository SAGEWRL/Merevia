DROP INDEX IF EXISTS payment_attempts_idempotency_key_idx;
ALTER TABLE payment_attempts DROP COLUMN idempotency_key;