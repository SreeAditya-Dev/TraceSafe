-- Migration: Add IoT columns to batches table
-- Run this migration to add IoT tracking fields

-- Add IoT fields to batches table
ALTER TABLE batches ADD COLUMN IF NOT EXISTS crate_temp DECIMAL(5, 2);
ALTER TABLE batches ADD COLUMN IF NOT EXISTS reefer_temp DECIMAL(5, 2);
ALTER TABLE batches ADD COLUMN IF NOT EXISTS humidity DECIMAL(5, 2);
ALTER TABLE batches ADD COLUMN IF NOT EXISTS location_temp DECIMAL(5, 2);
ALTER TABLE batches ADD COLUMN IF NOT EXISTS transit_duration INTEGER; -- in hours
ALTER TABLE batches ADD COLUMN IF NOT EXISTS crop_type_encoded INTEGER;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS transit_start_time TIMESTAMP;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS transit_end_time TIMESTAMP;

-- Create index for faster queries on IoT fields
CREATE INDEX IF NOT EXISTS idx_batches_crop_type_encoded ON batches(crop_type_encoded);

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'IoT columns added successfully to batches table';
END $$;
