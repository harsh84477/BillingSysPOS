-- Add store type and split address fields to customers table
ALTER TABLE customers
ADD COLUMN store_type VARCHAR(255),
ADD COLUMN location_name VARCHAR(255),
ADD COLUMN pincode VARCHAR(50);

-- Make sure existing views or RPCs are okay
