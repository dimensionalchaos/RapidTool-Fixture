# Team Member Onboarding Guide

## For New Developers Joining the Project

### Step 1: Clone the Repository

```bash
git clone https://github.com/FracktalWorks/RapidTool-Fixture.git
cd RapidTool-Fixture
```

### Step 2: Install Dependencies

**Frontend:**
```bash
npm install
```

**Backend:**
```bash
cd backend
npm install
```

### Step 3: Get Environment Variables

**Contact the team lead to get access to:**
- Database credentials (Supabase)
- JWT secrets
- SMTP credentials (if needed)

**You will receive these through:**
- Shared password manager (1Password/Bitwarden)
- Secure document (Google Drive with restricted access)
- Encrypted message (Signal/Telegram)

### Step 4: Setup Backend Environment

1. **Copy the example file:**
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Edit `backend/.env` with the credentials you received:**
   ```bash
   # Use your preferred editor
   code .env
   # or
   notepad .env
   ```

3. **Replace placeholders with actual values:**
   - `[PROJECT-REF]` → Your Supabase project reference
   - `[PASSWORD]` → Your database password
   - `your-secret-here-change-in-production` → Actual JWT secrets

### Step 5: Setup Frontend Environment

1. **Copy the example file:**
   ```bash
   cd ..  # Back to root
   cp .env.example .env
   ```

2. **Verify the API URL:**
   ```env
   VITE_API_URL=http://localhost:3000/api
   ```

### Step 6: Setup Database

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
```

### Step 7: Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### Step 8: Verify Setup

1. **Backend health check:**
   ```bash
   curl http://localhost:3000/api/health
   ```

2. **Open frontend:**
   ```
   http://localhost:8080
   ```

3. **Test authentication:**
   - Try registering a new account
   - Try logging in

## Important Security Rules

### ⚠️ NEVER Commit These Files:

- ❌ `backend/.env`
- ❌ `.env`
- ❌ Any file containing passwords or secrets

### ✅ Always Commit These Files:

- ✅ `backend/.env.example`
- ✅ `.env.example`
- ✅ Documentation files
- ✅ Source code

### Before Every Commit:

```bash
# Check what you're committing
git status

# If you see .env files, DO NOT commit them!
# They should be gitignored automatically
```

## Troubleshooting

### "Can't reach database server"

1. Check your `DATABASE_URL` is correct
2. Verify Supabase project is active (not paused)
3. Ensure you're using Transaction Pooler URL
4. Contact team lead for updated credentials

### "Port already in use"

**Windows:**
```powershell
netstat -ano | findstr :3000
taskkill /F /PID [PID_NUMBER]
```

**Linux/Mac:**
```bash
lsof -ti:3000 | xargs kill -9
```

### "Prisma Client not generated"

```bash
cd backend
npx prisma generate
```

### CORS Errors

1. Check frontend is running on port 8080 or 8081
2. Verify `CORS_ORIGIN` in backend `.env`
3. Restart backend server

## Getting Help

- Read `backend/SETUP.md` for detailed backend setup
- Check `README.md` for project overview
- Ask team lead for access to secrets
- Review existing code and documentation

## Next Steps After Setup

1. Familiarize yourself with the codebase
2. Read the architecture documentation
3. Pick up a task from the project board
4. Create a feature branch for your work
5. Submit PRs for review

## Contact

For access to environment variables and credentials, contact:
- **Team Lead:** [Name/Email]
- **DevOps:** [Name/Email]

---

**Welcome to the team! 🎉**
