# Database Migration Guide

## 📊 Current Status

✅ **Schema Updated:** `backend/prisma/schema.prisma` replaced with final production schema
✅ **Prisma Client Generated:** New types available for TypeScript
✅ **Services Created:** Data capture services ready
✅ **Auth Updated:** Registration now includes phone, organization, tier setup

**Pending:** Database migration (needs Supabase Studio access)

---

## 🗄️ Database Migration Options

### **Option 1: Supabase Studio (Recommended)**

Since the direct database connection isn't working from your local environment, use Supabase Studio:

1. **Open Supabase Studio:**
   - Go to https://supabase.com/dashboard
   - Select your project: `rtbzttowhfkvabyusfox`
   - Navigate to **SQL Editor**

2. **Run Migration SQL:**
   Copy and paste the SQL below in sections (Supabase has query size limits)

---

## 📝 Migration SQL Script

### **Part 1: Create Enums**

```sql
-- Create all enum types
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
```

### **Part 2: Alter Users Table**

```sql
-- Add new columns to users table
ALTER TABLE users ALTER COLUMN name SET NOT NULL;
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

-- Update existing users with default values
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
```

### **Part 3: Create License Table**

```sql
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

CREATE INDEX idx_licenses_user_id ON licenses(user_id);
CREATE INDEX idx_licenses_license_type ON licenses(license_type);
CREATE INDEX idx_licenses_status ON licenses(status);
CREATE INDEX idx_licenses_date_end ON licenses(date_end);

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
```

### **Part 4: Create Subscription Table**

```sql
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

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_end_date ON subscriptions(end_date);
CREATE INDEX idx_subscriptions_next_billing_date ON subscriptions(next_billing_date);
```

### **Part 5: Create Payment Table**

```sql
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

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_gateway_order_id ON payments(gateway_order_id);
CREATE INDEX idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX idx_payments_created_at ON payments(created_at);
```

### **Part 6: Create ModelImport Table**

```sql
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

CREATE INDEX idx_model_imports_user_id ON model_imports(user_id);
CREATE INDEX idx_model_imports_project_id ON model_imports(project_id);
CREATE INDEX idx_model_imports_status ON model_imports(status);
CREATE INDEX idx_model_imports_file_hash ON model_imports(file_hash);
CREATE INDEX idx_model_imports_created_at ON model_imports(created_at);
CREATE INDEX idx_model_imports_counts_toward_limit ON model_imports(counts_toward_limit);
```

### **Part 7: Update Exports Table**

```sql
-- Add new columns to exports table
ALTER TABLE exports ADD COLUMN IF NOT EXISTS format "ExportFormat";
ALTER TABLE exports ADD COLUMN IF NOT EXISTS export_data BYTEA;
ALTER TABLE exports ADD COLUMN IF NOT EXISTS include_supports BOOLEAN DEFAULT TRUE;
ALTER TABLE exports ADD COLUMN IF NOT EXISTS include_clamps BOOLEAN DEFAULT TRUE;
ALTER TABLE exports ADD COLUMN IF NOT EXISTS include_baseplate BOOLEAN DEFAULT TRUE;
ALTER TABLE exports ADD COLUMN IF NOT EXISTS processing_time INTEGER;
ALTER TABLE exports ADD COLUMN IF NOT EXISTS number_of_exports_done INTEGER DEFAULT 1;
ALTER TABLE exports ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0;
ALTER TABLE exports ADD COLUMN IF NOT EXISTS last_downloaded_at TIMESTAMP;
ALTER TABLE exports ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Update format column from text to enum (if needed)
-- Note: You may need to update existing data first
UPDATE exports SET format = 'STL' WHERE format = 'stl';
UPDATE exports SET format = 'OBJ' WHERE format = 'obj';
```

### **Part 8: Update Projects Table**

```sql
-- Add new columns to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS processing_time INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tooling_applied JSONB;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Update status to use enum (if not already)
ALTER TABLE projects ALTER COLUMN status TYPE TEXT;
```

### **Part 9: Create ErrorLog Table**

```sql
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

CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX idx_error_logs_project_id ON error_logs(project_id);
CREATE INDEX idx_error_logs_category ON error_logs(category);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at);
CREATE INDEX idx_error_logs_resolved ON error_logs(resolved);
```

---

## ✅ After Migration

Once you've run the SQL in Supabase Studio:

1. **Verify Tables Created:**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```

2. **Check Existing Users Updated:**
   ```sql
   SELECT id, email, tier, model_limit, models_used 
   FROM users 
   LIMIT 5;
   ```

3. **Verify Licenses Created:**
   ```sql
   SELECT COUNT(*) as license_count FROM licenses;
   ```

---

## 🚀 Testing Data Capture

After migration, test the new features:

### **1. Test Registration with New Fields**
```bash
POST http://localhost:3000/api/auth/register
{
  "email": "test@example.com",
  "password": "Test@1234",
  "confirmPassword": "Test@1234",
  "name": "Test User",
  "phoneNumber": "+91 9876543210",
  "organization": "Test Company"
}
```

### **2. Test Model Import (when implemented)**
```bash
POST http://localhost:3000/api/models/import
Headers: Authorization: Bearer <token>
Body: multipart/form-data with file
```

### **3. Check User Usage**
```bash
GET http://localhost:3000/api/users/me
```

Should return:
```json
{
  "tier": "FREE",
  "modelLimit": 5,
  "modelsUsed": 0,
  "timeSpent": 0
}
```

---

## 📋 Services Created

All services are ready in `backend/src/services/`:

1. ✅ **modelImport.service.ts** - Track model imports, increment usage
2. ✅ **export.service.ts** - Track exports, store workpieces in DB
3. ✅ **errorLog.service.ts** - Comprehensive error logging
4. ✅ **userProgress.service.ts** - Track time and workflow steps
5. ✅ **license.middleware.ts** - Enforce 5-model limit for FREE tier

---

## 🔧 Next Implementation Steps

1. **Run migration in Supabase Studio** (copy SQL above)
2. **Create API routes** for model import/export
3. **Integrate services** into existing controllers
4. **Test limit enforcement** (try importing 6 models as FREE user)
5. **Test error capture** (trigger an error and check error_logs table)

---

## 💡 Important Notes

- **Backup First:** The migration is non-destructive but backup is recommended
- **Existing Data:** All existing users will get FREE tier with 5 model limit
- **Trial Licenses:** Auto-created for all users (30 days)
- **File Storage:** Models/exports stored as BYTEA (consider compression)
- **Indexes:** All critical fields indexed for performance

---

## 🆘 Troubleshooting

**If migration fails:**
1. Check Supabase logs in Dashboard
2. Run parts individually (enums first, then tables)
3. Verify enum types created: `\dT` in SQL editor

**If Prisma Client errors:**
```bash
cd backend
npx prisma generate
```

**If connection issues:**
- Verify `DATABASE_URL` has `?pgbouncer=true`
- Verify `DIRECT_URL` points to port 5432
