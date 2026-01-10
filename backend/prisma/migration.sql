-- RapidTool-Fixture Database Migration
-- Run this in Supabase SQL Editor
-- Date: 2026-01-09

-- ============================================================================
-- PART 1: CREATE ENUMS
-- ============================================================================

CREATE TYPE "UserTier" AS ENUM ('FREE', 'PREMIUM');
CREATE TYPE "LicenseType" AS ENUM ('TRIAL', 'PAID');
CREATE TYPE "LicenseStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED');
CREATE TYPE "ImportStatus" AS ENUM ('UPLOADING', 'UPLOADED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "ExportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED');
CREATE TYPE "ExportFormat" AS ENUM ('STL', 'OBJ', 'GLTF', 'GLB', 'THREE_MF', 'STEP', 'IGES');
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PROCESSING', 'COMPLETED', 'ARCHIVED', 'DELETED');
CREATE TYPE "ErrorSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "ErrorCategory" AS ENUM ('IMPORT_ERROR', 'PROCESSING_ERROR', 'EXPORT_ERROR', 'VALIDATION_ERROR', 'SYSTEM_ERROR', 'NETWORK_ERROR', 'PAYMENT_ERROR', 'AUTH_ERROR');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED');
CREATE TYPE "PaymentMethod" AS ENUM ('CREDIT_CARD', 'DEBIT_CARD', 'UPI', 'NET_BANKING', 'WALLET', 'RAZORPAY', 'STRIPE');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');

-- ============================================================================
-- PART 2: UPDATE USERS TABLE
-- ============================================================================

-- Add new columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tier "UserTier" DEFAULT 'FREE';
ALTER TABLE users ADD COLUMN IF NOT EXISTS model_limit INTEGER DEFAULT 5;
ALTER TABLE users ADD COLUMN IF NOT EXISTS models_used INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS time_spent INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS max_step_reached INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_session_final_step INTEGER DEFAULT 0;

-- Update existing users
UPDATE users SET 
  tier = 'FREE',
  model_limit = 5,
  models_used = 0,
  time_spent = 0,
  max_step_reached = 0,
  last_session_final_step = 0
WHERE tier IS NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization);

-- ============================================================================
-- PART 3: CREATE LICENSES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS licenses (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  license_type "LicenseType" NOT NULL,
  status "LicenseStatus" DEFAULT 'ACTIVE',
  date_start TIMESTAMP NOT NULL,
  date_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_licenses_user_id ON licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_licenses_license_type ON licenses(license_type);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_date_end ON licenses(date_end);

-- Create trial licenses for existing users
INSERT INTO licenses (id, user_id, license_type, status, date_start, date_end)
SELECT 
  gen_random_uuid()::text,
  id,
  'TRIAL',
  'ACTIVE',
  created_at,
  created_at + INTERVAL '30 days'
FROM users
WHERE NOT EXISTS (SELECT 1 FROM licenses WHERE licenses.user_id = users.id);

-- ============================================================================
-- PART 4: CREATE SUBSCRIPTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier "UserTier" NOT NULL,
  status "SubscriptionStatus" DEFAULT 'ACTIVE',
  billing_cycle TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  currency TEXT DEFAULT 'INR',
  model_limit INTEGER NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  next_billing_date TIMESTAMP,
  cancelled_at TIMESTAMP,
  auto_renew BOOLEAN DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing_date ON subscriptions(next_billing_date);

-- ============================================================================
-- PART 5: CREATE PAYMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id TEXT REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount DOUBLE PRECISION NOT NULL,
  currency TEXT DEFAULT 'INR',
  status "PaymentStatus" DEFAULT 'PENDING',
  payment_method "PaymentMethod" NOT NULL,
  gateway_provider TEXT NOT NULL,
  gateway_order_id TEXT,
  gateway_payment_id TEXT,
  gateway_signature TEXT,
  transaction_id TEXT UNIQUE,
  receipt_url TEXT,
  invoice_url TEXT,
  failure_reason TEXT,
  failure_code TEXT,
  refunded_amount DOUBLE PRECISION,
  refunded_at TIMESTAMP,
  refund_reason TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_order_id ON payments(gateway_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- ============================================================================
-- PART 6: CREATE MODEL_IMPORTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS model_imports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_hash TEXT,
  model_data BYTEA,
  thumbnail_data BYTEA,
  status "ImportStatus" DEFAULT 'UPLOADING',
  progress INTEGER DEFAULT 0,
  processing_started_at TIMESTAMP,
  processing_completed_at TIMESTAMP,
  processing_duration INTEGER,
  vertex_count INTEGER,
  face_count INTEGER,
  bounding_box JSONB,
  dimensions JSONB,
  volume DOUBLE PRECISION,
  is_valid BOOLEAN DEFAULT TRUE,
  validation_errors JSONB,
  error_message TEXT,
  error_code TEXT,
  counts_toward_limit BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_model_imports_user_id ON model_imports(user_id);
CREATE INDEX IF NOT EXISTS idx_model_imports_project_id ON model_imports(project_id);
CREATE INDEX IF NOT EXISTS idx_model_imports_status ON model_imports(status);
CREATE INDEX IF NOT EXISTS idx_model_imports_file_hash ON model_imports(file_hash);
CREATE INDEX IF NOT EXISTS idx_model_imports_created_at ON model_imports(created_at);
CREATE INDEX IF NOT EXISTS idx_model_imports_counts_toward_limit ON model_imports(counts_toward_limit);

-- ============================================================================
-- PART 7: UPDATE EXPORTS TABLE
-- ============================================================================

-- Add new columns to exports table
ALTER TABLE exports ADD COLUMN IF NOT EXISTS export_data BYTEA;
ALTER TABLE exports ADD COLUMN IF NOT EXISTS include_supports BOOLEAN DEFAULT TRUE;
ALTER TABLE exports ADD COLUMN IF NOT EXISTS include_clamps BOOLEAN DEFAULT TRUE;
ALTER TABLE exports ADD COLUMN IF NOT EXISTS include_baseplate BOOLEAN DEFAULT TRUE;
ALTER TABLE exports ADD COLUMN IF NOT EXISTS processing_time INTEGER;
ALTER TABLE exports ADD COLUMN IF NOT EXISTS number_of_exports_done INTEGER DEFAULT 1;
ALTER TABLE exports ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0;
ALTER TABLE exports ADD COLUMN IF NOT EXISTS last_downloaded_at TIMESTAMP;
ALTER TABLE exports ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- ============================================================================
-- PART 8: UPDATE PROJECTS TABLE
-- ============================================================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS processing_time INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tooling_applied JSONB;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- ============================================================================
-- PART 9: CREATE ERROR_LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS error_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  model_import_id TEXT REFERENCES model_imports(id) ON DELETE SET NULL,
  export_id TEXT REFERENCES exports(id) ON DELETE SET NULL,
  category "ErrorCategory" NOT NULL,
  severity "ErrorSeverity" DEFAULT 'MEDIUM',
  error_code TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  operation TEXT NOT NULL,
  step TEXT,
  browser_info JSONB,
  device_info JSONB,
  url TEXT,
  method TEXT,
  status_code INTEGER,
  user_action TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  resolution TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_project_id ON error_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_category ON error_logs(category);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check tables created
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- Check user columns
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position;

-- Check existing users updated
SELECT id, email, tier, model_limit, models_used FROM users LIMIT 3;
