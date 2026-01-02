# 🔧 Fix Supabase "Prepared Statement Already Exists" Error

**Error:** `prepared statement "s0" already exists`

**Cause:** Using Supabase's **pooled connection URL** with Prisma causes this error.

---

## ✅ SOLUTION: Use Direct Connection URL

Supabase provides TWO connection URLs:
1. **Pooled URL** (port 6543) - For serverless/edge functions - **CAUSES ERRORS WITH PRISMA**
2. **Direct URL** (port 5432) - For traditional servers - **USE THIS ONE**

---

## 🔍 Find Your Direct Connection URL

### **Method 1: Supabase Dashboard**

1. Go to https://supabase.com
2. Select your project
3. Click **Settings** → **Database**
4. Scroll to **Connection String** section
5. Select **URI** tab
6. Look for **Connection pooling** toggle
7. **Turn OFF** "Use connection pooling"
8. Copy the connection string (should have port **5432**, not 6543)

### **Method 2: Manual Construction**

If your current URL looks like:
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres
```

Change it to:
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-ap-south-1.connect.supabase.com:5432/postgres
```

**Changes:**
- `pooler.supabase.com` → `connect.supabase.com`
- Port `6543` → `5432`

---

## 📝 Update Your .env File

1. **Open:** `backend/.env`

2. **Find the line:**
   ```
   DATABASE_URL=postgresql://...
   ```

3. **Replace with your direct connection URL:**
   ```
   DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-ap-south-1.connect.supabase.com:5432/postgres
   ```

4. **Save the file**

---

## 🔄 Restart Backend

```bash
# Stop the backend (Ctrl+C)
# Then restart
cd backend
npm run dev
```

---

## ✅ Verify It Works

Try logging in again. You should see:
- ✅ No "prepared statement" errors
- ✅ Login succeeds
- ✅ Audit logs are created

---

## 📊 Connection URL Comparison

| Type | Port | URL Pattern | Use Case | Works with Prisma? |
|------|------|-------------|----------|-------------------|
| **Pooled** | 6543 | `pooler.supabase.com` | Serverless/Edge | ❌ NO |
| **Direct** | 5432 | `connect.supabase.com` | Traditional servers | ✅ YES |

---

## 🎯 Why This Happens

Supabase's connection pooler uses **PgBouncer** in transaction mode, which doesn't support prepared statements. Prisma relies heavily on prepared statements for performance, causing this conflict.

**Solution:** Use the direct connection URL which bypasses the pooler.

---

## 🔒 Security Note

The direct connection URL is still secure and encrypted. It just bypasses the connection pooler, which you don't need for a traditional Node.js server.

---

## ⚠️ Important

After changing the DATABASE_URL:
1. ✅ Restart your backend server
2. ✅ Test login functionality
3. ✅ Verify audit logs are being created

The SQL script you ran earlier already added all the necessary columns, so once you fix the connection URL, everything should work!
