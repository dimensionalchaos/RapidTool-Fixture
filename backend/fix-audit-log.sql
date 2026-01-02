-- Fix AuditLog table - Add ALL missing columns
-- Run this in Supabase SQL Editor

-- Check if columns exist and add them if missing
DO $$ 
BEGIN
    -- Add resource column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_logs' AND column_name = 'resource'
    ) THEN
        ALTER TABLE audit_logs ADD COLUMN resource TEXT;
    END IF;

    -- Add resource_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_logs' AND column_name = 'resource_id'
    ) THEN
        ALTER TABLE audit_logs ADD COLUMN resource_id TEXT;
    END IF;

    -- Add status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_logs' AND column_name = 'status'
    ) THEN
        ALTER TABLE audit_logs ADD COLUMN status TEXT NOT NULL DEFAULT 'success';
    END IF;

    -- Add error_message column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_logs' AND column_name = 'error_message'
    ) THEN
        ALTER TABLE audit_logs ADD COLUMN error_message TEXT;
    END IF;

    -- Add user_agent column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_logs' AND column_name = 'user_agent'
    ) THEN
        ALTER TABLE audit_logs ADD COLUMN user_agent TEXT;
    END IF;
END $$;

-- Create index on resource and resource_id if it doesn't exist
CREATE INDEX IF NOT EXISTS "audit_logs_resource_resourceId_idx" ON audit_logs(resource, resource_id);

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'audit_logs' 
ORDER BY ordinal_position;
