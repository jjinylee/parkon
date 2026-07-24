-- Add hash columns for encrypted PII lookup
ALTER TABLE users ADD COLUMN phone_hash TEXT;
ALTER TABLE users ADD COLUMN car_number_hash TEXT;
ALTER TABLE whitelist ADD COLUMN phone_hash TEXT;
ALTER TABLE whitelist ADD COLUMN car_number_hash TEXT;

-- Encrypt existing phone numbers and car_numbers
-- (handled by application code during migration run)
