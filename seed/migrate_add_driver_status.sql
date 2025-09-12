-- Add status column to drivers table
ALTER TABLE drivers ADD COLUMN status ENUM('pending', 'active', 'suspended') NOT NULL DEFAULT 'pending';

-- Update existing drivers to have 'active' status if they have verification = true
UPDATE drivers SET status = 'active' WHERE verification = true;

-- Add index on status for better query performance
CREATE INDEX idx_drivers_status ON drivers(status);
