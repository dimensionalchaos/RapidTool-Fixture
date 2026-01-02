# ✅ Supabase Dual URL Configuration (RECOMMENDED)

**This is the correct approach for using Supabase with Prisma!**

---

## 🎯 How It Works

Prisma supports **two separate database URLs**:

1. **`DATABASE_URL`** - Used for regular queries (can use connection pooling)
2. **`DIRECT_URL`** - Used for migrations and schema operations (must be direct)

This gives you the **best of both worlds**:
- ✅ Fast connection pooling for queries
- ✅ Direct connection for migrations (no "prepared statement" errors)

---

## 📝 Configuration Steps

### **Step 1: Update `backend/.env`**

Add both URLs to your `.env` file:

```bash
# Connection pooling URL for queries (better performance)
DATABASE_URL="postgresql://postgres.mudheskhllsynicgyipt:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection URL for migrations (required for Prisma)
DIRECT_URL="postgresql://postgres.mudheskhllsynicgyipt:[YOUR-PASSWORD]@aws-1-ap-south-1.connect.supabase.com:5432/postgres"
```

**Important:** 
- `DATABASE_URL` uses `pooler.supabase.com:6543`
- `DIRECT_URL` uses `connect.supabase.com:5432` (NOT pooler!)

### **Step 2: Prisma Schema Already Updated ✅**

I've already updated `prisma/schema.prisma` to use both URLs:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### **Step 3: Regenerate Prisma Client**

After updating `.env`, regenerate the Prisma client:

```bash
cd backend
npx prisma generate --schema prisma/schema.prisma
```

### **Step 4: Restart Backend**

```bash
npm run dev
```

---

## 🔍 How to Get Your Connection Strings

### **From Supabase Dashboard:**

1. Go to https://supabase.com
2. Select your project
3. **Settings** → **Database**
4. Scroll to **Connection String** section

### **For DATABASE_URL (Pooled):**
- Select **URI** tab
- **Turn ON** "Use connection pooling"
- Copy the string (should have `pooler.supabase.com:6543`)
- Add `?pgbouncer=true` at the end

### **For DIRECT_URL (Direct):**
- Select **URI** tab
- **Turn OFF** "Use connection pooling"
- Copy the string (should have `connect.supabase.com:5432`)

---

## ✅ What This Fixes

### **Before (Single URL - Problems):**
- ❌ Using pooled URL → "prepared statement already exists" errors
- ❌ Using direct URL → No connection pooling benefits

### **After (Dual URL - Perfect):**
- ✅ Queries use pooled connection → Better performance
- ✅ Migrations use direct connection → No errors
- ✅ Best of both worlds!

---

## 🧪 Test It Works

After setup, test login:

```bash
# Backend should be running
npm run dev

# Try logging in via frontend or Postman
POST http://localhost:3000/api/auth/login
{
  "email": "testuser@fracktal.in",
  "password": "your-password"
}
```

**Expected Result:**
- ✅ Login succeeds
- ✅ No database errors
- ✅ Audit log created

---

## 📊 URL Comparison

| Purpose | URL Type | Host | Port | When Used |
|---------|----------|------|------|-----------|
| **Queries** | `DATABASE_URL` | `pooler.supabase.com` | 6543 | Runtime queries |
| **Migrations** | `DIRECT_URL` | `connect.supabase.com` | 5432 | Schema changes |

---

## 🎯 Summary

1. ✅ **Prisma schema updated** with `directUrl`
2. ✅ **`.env.example` updated** with both URLs
3. ⏳ **You need to:** Update your `backend/.env` with both URLs
4. ⏳ **Then:** Regenerate Prisma client and restart backend

This is the **official Prisma recommendation** for Supabase and will solve all connection issues!
