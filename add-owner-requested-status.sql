-- Add 'owner_requested' status to entry_request_status enum

-- Step 1: Add the new value to the enum
-- Note: In PostgreSQL, we can add values to existing enums using ALTER TYPE
-- The new value will be added after 'bp_requested' and before 'owner_reviewing'

ALTER TYPE entry_request_status ADD VALUE IF NOT EXISTS 'owner_requested' AFTER 'bp_requested';

-- Verify the enum values
SELECT unnest(enum_range(NULL::entry_request_status));
