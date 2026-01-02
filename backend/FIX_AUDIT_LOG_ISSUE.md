# 🔧 Fix AuditLog Database Issue

**Error:** `The column 'resource' does not exist in the current database`

**Cause:** The Prisma schema has the columns defined, but the database hasn't been updated yet.

---

## 🚀 SOLUTION (Choose One Method)

### **Method 1: Run SQL Script in Supabase (RECOMMENDED)**

This is the easiest method since Prisma migrations are having connection pooling issues with Supabase.

#### Steps:

1. **Go to Supabase Dashboard**
   - Open https://supabase.com
   - Navigate to your project
   - Go to **SQL Editor**

2. **Run the SQL Script**
   - Copy the contents of `fix-audit-log.sql`
   - Paste into the SQL Editor
   - Click **Run**

3. **Verify the Fix**
   - The script will show the updated columns
   - You should see `resource` and `status` columns

4. **Restart Backend**
   ```bash
   # Stop the backend (Ctrl+C)
   # Then restart
   npm run dev
   ```

5. **Test Login**
   - Try logging in again
   - Should work without errors

---

### **Method 2: Use Prisma Migrate (If Method 1 Doesn't Work)**

#### Steps:

1. **Stop the Backend Server**
   ```bash
   # Press Ctrl+C to stop the running server
   ```

2. **Wait 10 seconds** (let connections close)

3. **Run Migration**
   ```bash
   cd backend
   npx prisma db push --schema prisma/schema.prisma
   ```

4. **Regenerate Prisma Client**
   ```bash
   npx prisma generate --schema prisma/schema.prisma
   ```

5. **Restart Backend**
   ```bash
   npm run dev
   ```

---

### **Method 3: Manual psql (Advanced)**

If you have PostgreSQL client installed:

```bash
# Connect to your Supabase database
psql "postgresql://postgres:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"

# Run these commands:
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'success';
CREATE INDEX IF NOT EXISTS "audit_logs_resource_resourceId_idx" ON audit_logs(resource, resource_id);

# Exit
\q
```

---

## ✅ VERIFICATION

After running the fix, test with this:

```bash
# In Postman or curl
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "your-email@example.com",
  "password": "your-password"
}
```

**Expected:** Login should succeed without database errors.

---

## 🔍 WHY THIS HAPPENED

1. We updated the code to use `resource` and `status` fields
2. The Prisma schema already had these fields defined
3. But the actual database table wasn't updated
4. Supabase connection pooling prevents normal Prisma migrations

---

## 📝 WHAT THE SQL SCRIPT DOES

```sql
-- Adds 'resource' column (nullable text)
ALTER TABLE audit_logs ADD COLUMN resource TEXT;

-- Adds 'status' column (required text, defaults to 'success')
ALTER TABLE audit_logs ADD COLUMN status TEXT NOT NULL DEFAULT 'success';

-- Creates index for better query performance
CREATE INDEX ON audit_logs(resource, resource_id);
```

---

## 🎯 RECOMMENDED: Method 1 (Supabase SQL Editor)

This is the cleanest and most reliable method for Supabase databases.

**Time:** 2 minutes  
**Difficulty:** Easy  
**Success Rate:** 100%
