ALTER TABLE payment_attempts ADD COLUMN idempotency_key TEXT;
CREATE UNIQUE INDEX payment_attempts_idempotency_key_idx ON payment_attempts(idempotency_key);