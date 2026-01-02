# 🆕 Fresh Supabase Project Setup Guide

## ✅ Why This Approach is Good

Starting fresh will:
- ✅ Eliminate all connection issues
- ✅ Give you working database credentials
- ✅ Provide a clean database schema
- ✅ Take only 10-15 minutes

---

## 📋 **Step-by-Step Setup**

### **Step 1: Create New Supabase Project**

1. Go to https://supabase.com
2. Click **"New Project"**
3. Fill in details:
   - **Name:** `fixture-view-app` (or any name you prefer)
   - **Database Password:** Generate a strong password (SAVE THIS!)
   - **Region:** Choose closest to you (e.g., `ap-south-1` for India)
   - **Pricing Plan:** Free
4. Click **"Create new project"**
5. Wait 2-3 minutes for project to be created

---

### **Step 2: Get Database Connection Strings**

Once project is created:

1. Go to **Settings** → **Database**
2. Scroll to **Connection String** section
3. Select **"URI"** tab

#### **Get Direct Connection URL:**
- **Turn OFF** "Use connection pooling"
- Copy the connection string
- It will look like:
  ```
  postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
  ```
- Replace `[PASSWORD]` with your actual database password

#### **Get Pooled Connection URL (Optional):**
- **Turn ON** "Use connection pooling"
- Copy this connection string too
- It will have port `6543`

---

### **Step 3: Update Backend `.env` File**

Open `backend/.env` and update these lines:

```bash
# Direct connection for queries (recommended)
DATABASE_URL="postgresql://postgres.[NEW-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# Direct connection for migrations
DIRECT_URL="postgresql://postgres.[NEW-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
```

**Important:** Use the EXACT connection string from Supabase dashboard, just replace `[PASSWORD]` with your actual password.

---

### **Step 4: Run Database Migrations**

Now we'll create all the tables in your fresh database:

```powershell
cd C:\Users\Sidda\OneDrive\Desktop\fixture-view\backend

# Generate Prisma client
npx prisma generate

# Push schema to database (creates all tables)
npx prisma db push

# Verify tables were created
npx prisma studio
```

**What this does:**
- Creates all tables: `users`, `refresh_tokens`, `audit_logs`, etc.
- Sets up indexes and relationships
- Prepares database for authentication

---

### **Step 5: Restart Backend**

```powershell
# Stop backend if running (Ctrl+C)

# Start fresh
npm run dev
```

You should see:
```
✅ Backend listening on port 3000
```

---

### **Step 6: Test Authentication**

1. **Register a new user:**
   - Go to your frontend: http://localhost:8080
   - Click "Register"
   - Create account with email: `testuser@fracktal.in`
   - Password: Your choice

2. **Login:**
   - Use the credentials you just created
   - Should work without errors

3. **Verify in Supabase:**
   - Go to Supabase Dashboard
   - Click **"Table Editor"**
   - Check `users` table - you should see your new user
   - Check `audit_logs` table - you should see login events

---

## 🎯 **Expected Timeline**

- **Step 1 (Create project):** 3-5 minutes
- **Step 2 (Get connection strings):** 1 minute
- **Step 3 (Update .env):** 1 minute
- **Step 4 (Run migrations):** 2 minutes
- **Step 5 (Restart backend):** 30 seconds
- **Step 6 (Test):** 2 minutes

**Total:** ~10-15 minutes

---

## ⚠️ **Important Notes**

### **Save Your Database Password!**
When creating the project, Supabase will generate a password. **SAVE IT IMMEDIATELY!** You'll need it for the connection string.

### **Use Direct Connection**
For your use case (traditional Node.js server), use the **direct connection** (port 5432), not the pooled connection (port 6543).

### **Keep Old Project (Optional)**
Don't delete your old Supabase project immediately. Keep it for a few days in case you need to reference any data.

---

## 🔧 **What Gets Reset**

✅ **Will be fresh:**
- Database tables (empty)
- Users (none)
- Audit logs (none)

✅ **Stays the same:**
- Your code
- Prisma schema
- Backend configuration
- Frontend code

---

## 📝 **Checklist**

- [ ] Create new Supabase project
- [ ] Save database password
- [ ] Copy direct connection URL
- [ ] Update `backend/.env` with new DATABASE_URL
- [ ] Update `backend/.env` with new DIRECT_URL
- [ ] Run `npx prisma generate`
- [ ] Run `npx prisma db push`
- [ ] Restart backend
- [ ] Register new test user
- [ ] Test login
- [ ] Verify data in Supabase Table Editor

---

## 🆘 **If You Need Help**

After creating the new project, share:
1. The connection string format (with password hidden)
2. Any errors you see
3. I'll help you complete the setup

---

**Ready to start? Create your new Supabase project and let me know when you have the connection strings!**
