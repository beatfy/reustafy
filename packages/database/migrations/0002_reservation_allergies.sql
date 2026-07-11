-- Add allergies column to reservations table
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS allergies VARCHAR(255);
