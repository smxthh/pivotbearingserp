-- Migration: Add missing columns to items and categories tables
-- Run this on your Supabase SQL Editor

-- Add new columns to items table
ALTER TABLE items
ADD COLUMN IF NOT EXISTS max_stock_level NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS weight_kg NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS usage_application TEXT;

-- Add new columns to categories table
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS is_final BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_returnable BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS remark TEXT;

-- Add comment for documentation
COMMENT ON COLUMN items.max_stock_level IS 'Maximum stock quantity threshold';
COMMENT ON COLUMN items.weight_kg IS 'Weight per unit in kilograms';
COMMENT ON COLUMN items.brand_id IS 'Reference to brands table';
COMMENT ON COLUMN items.usage_application IS 'Application or usage type';

COMMENT ON COLUMN categories.is_final IS 'Whether this is a final/leaf category (no subcategories allowed)';
COMMENT ON COLUMN categories.is_returnable IS 'Whether items in this category are returnable';
COMMENT ON COLUMN categories.remark IS 'Additional notes or remarks for this category';
