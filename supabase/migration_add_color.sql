-- Migration: Add color column to calendar_events table
-- Run this in Supabase SQL Editor

ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'purple';

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'calendar_events' AND column_name = 'color';