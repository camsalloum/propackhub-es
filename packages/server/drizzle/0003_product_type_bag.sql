-- Add 'bag' to the product_type enum so Bag estimates are stored correctly
ALTER TYPE product_type ADD VALUE IF NOT EXISTS 'bag';
