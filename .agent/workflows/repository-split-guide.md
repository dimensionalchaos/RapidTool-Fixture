---
description: Guide to split monorepo into separate frontend and backend repositories
---

# Repository Split Guide: RapidTool-Fixture

## 🎯 Overview

This guide will help you split the RapidTool-Fixture monorepo into two separate repositories:
- **rapidtool-fixture-frontend** - React + Vite + Three.js application
- **rapidtool-fixture-backend** - Node.js + Express + Prisma API

## 📊 Current Architecture

### Monorepo Structure
```
RapidTool-Fixture/
├── src/                    # Frontend source
├── public/                 # Frontend assets
├── backend/                # Backend source
├── docs/                   # Shared documentation
├── package.json            # Frontend dependencies
├── vite.config.ts          # Frontend build config
└── backend/package.json    # Backend dependencies
```

### Communication Flow
```
Frontend (Port 8080) ──HTTP──> Backend (Port 3000) ──> PostgreSQL (Supabase)
```

## 🚀 Migration Steps

### Step 1: Prepare New Directories

Create two new directories outside the current project:

```powershell
# Navigate to parent directory
cd c:\programs

# Create new repositories
mkdir rapidtool-fixture-frontend
mkdir rapidtool-fixture-backend
```

### Step 2: Copy Frontend Files

Copy frontend-specific files to the new frontend repo:

```powershell
# Files and directories to copy:
- /src/**                    # All frontend source code
- /public/**                 # Static assets
- /index.html                # Entry HTML
- /package.json              # Frontend dependencies
- /package-lock.json         # Lock file
- /vite.config.ts            # Vite configuration
- /tailwind.config.ts        # Tailwind config
- /tsconfig.json             # TypeScript config
- /tsconfig.app.json         # App TypeScript config
- /tsconfig.node.json        # Node TypeScript config
- /postcss.config.js         # PostCSS config
- /components.json           # shadcn/ui config
- /eslint.config.js          # ESLint config
- /.env.example              # Environment template
- /README.md                 # Update for frontend only
```

**Optional (if needed):**
```powershell
- /docs/**                   # Documentation (or keep separate)
- /packages/**               # If you have shared packages
```

### Step 3: Copy Backend Files

Copy backend-specific files to the new backend repo:

```powershell
# Files and directories to copy:
- /backend/src/**            # All backend source code
- /backend/prisma/**         # Database schema and migrations
- /backend/package.json      # Backend dependencies
- /backend/package-lock.json # Lock file
- /backend/tsconfig.json     # TypeScript config
- /backend/.env.example      # Environment template
- /backend/nodemon.json      # Nodemon config (if exists)
```

### Step 4: Create New .gitignore Files

**Frontend .gitignore:**
```gitignore
# Dependencies
node_modules/
/.pnp
.pnp.js

# Testing
/coverage

# Production
/dist
/build

# Environment
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Editor
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Vite
.vite/
*.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*
```

**Backend .gitignore:**
```gitignore
# Dependencies
node_modules/

# Environment
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build
/dist
/build

# Prisma
prisma/migrations/migration_lock.toml

# Uploads (if storing files locally)
uploads/
temp/

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
logs/

# Editor
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Testing
coverage/
.nyc_output/
```

### Step 5: Update Frontend Configuration

**1. Update `package.json` - Add proxy or API URL:**

```json
{
  "name": "rapidtool-fixture-frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

**2. Create `.env` file:**

```env
# Backend API URL
VITE_API_URL=http://localhost:3000
VITE_API_BASE_URL=http://localhost:3000/api

# For production
# VITE_API_URL=https://api.rapidtool.example.com
# VITE_API_BASE_URL=https://api.rapidtool.example.com/api
```

**3. Update API client configuration:**

Update all API calls to use the environment variable:

```typescript
// src/lib/api.ts or similar
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});
```

### Step 6: Update Backend Configuration

**1. Update `package.json`:**

```json
{
  "name": "rapidtool-fixture-backend",
  "version": "1.0.0",
  "description": "Backend API for RapidTool-Fixture",
  "main": "dist/index.js",
  "scripts": {
    "dev": "nodemon src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "migrate": "prisma migrate dev",
    "migrate:deploy": "prisma migrate deploy",
    "generate": "prisma generate",
    "studio": "prisma studio"
  }
}
```

**2. Update CORS configuration in `src/index.ts`:**

```typescript
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:8080',
      'http://localhost:5173',
      'http://localhost:8080',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:8080'
    ].filter(Boolean);

    // Allow local network IPs
    if (
      allowedOrigins.includes(origin) ||
      origin.startsWith('http://192.168.') ||
      origin.startsWith('http://10.') ||
      origin.startsWith('http://localhost')
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
```

**3. Create `.env` file:**

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"
DIRECT_URL="postgresql://user:password@host:5432/database?schema=public"

# JWT Secrets
JWT_ACCESS_SECRET=your-access-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:8080

# Email (if using)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
```

### Step 7: Initialize Git Repositories

**Frontend:**
```powershell
cd c:\programs\rapidtool-fixture-frontend
git init
git add .
git commit -m "Initial commit: Frontend application"
```

**Backend:**
```powershell
cd c:\programs\rapidtool-fixture-backend
git init
git add .
git commit -m "Initial commit: Backend API"
```

### Step 8: Update README Files

**Frontend README.md:**
```markdown
# RapidTool-Fixture Frontend

React + Vite + Three.js application for automated 3D fixture design.

## Quick Start

\`\`\`bash
npm install
cp .env.example .env
# Edit .env with your backend API URL
npm run dev
\`\`\`

## Environment Variables

- `VITE_API_URL` - Backend API URL (default: http://localhost:3000)
- `VITE_API_BASE_URL` - Backend API base URL (default: http://localhost:3000/api)

## Tech Stack

- React 18.3
- TypeScript
- Vite
- Three.js
- Tailwind CSS
- shadcn/ui
- Zustand

## Related Repositories

- Backend: [rapidtool-fixture-backend](link-to-backend-repo)
```

**Backend README.md:**
```markdown
# RapidTool-Fixture Backend

Node.js + Express + Prisma API for RapidTool-Fixture application.

## Quick Start

\`\`\`bash
npm install
cp .env.example .env
# Edit .env with your database credentials
npx prisma generate
npx prisma migrate deploy
npm run dev
\`\`\`

## Environment Variables

See `.env.example` for all required variables.

## Tech Stack

- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL (Supabase)
- JWT Authentication

## Database Migrations

\`\`\`bash
# Create new migration
npx prisma migrate dev --name migration_name

# Deploy migrations
npx prisma migrate deploy

# Open Prisma Studio
npx prisma studio
\`\`\`

## Related Repositories

- Frontend: [rapidtool-fixture-frontend](link-to-frontend-repo)
```

### Step 9: Test Both Applications

**Terminal 1 - Backend:**
```powershell
cd c:\programs\rapidtool-fixture-backend
npm install
npx prisma generate
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd c:\programs\rapidtool-fixture-frontend
npm install
npm run dev
```

**Verify:**
- Frontend runs on http://localhost:8080
- Backend runs on http://localhost:3000
- Frontend can communicate with backend
- Authentication works
- Model import/export works

### Step 10: Push to Remote Repositories

```powershell
# Frontend
cd c:\programs\rapidtool-fixture-frontend
git remote add origin https://github.com/your-org/rapidtool-fixture-frontend.git
git branch -M main
git push -u origin main

# Backend
cd c:\programs\rapidtool-fixture-backend
git remote add origin https://github.com/your-org/rapidtool-fixture-backend.git
git branch -M main
git push -u origin main
```

## 📝 Checklist

### Frontend Repository
- [ ] All source files copied
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file created with backend URL
- [ ] API client updated to use environment variables
- [ ] `.gitignore` created
- [ ] README.md updated
- [ ] Git initialized
- [ ] Application runs successfully
- [ ] Can connect to backend API

### Backend Repository
- [ ] All source files copied
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file created with database credentials
- [ ] Prisma client generated (`npx prisma generate`)
- [ ] CORS updated with frontend URL
- [ ] `.gitignore` created
- [ ] README.md updated
- [ ] Git initialized
- [ ] Application runs successfully
- [ ] Database connection works

### Both Repositories
- [ ] Environment variables documented
- [ ] Cross-repository links added to READMEs
- [ ] CI/CD pipelines updated (if applicable)
- [ ] Deployment documentation updated
- [ ] Team notified of new repository structure

## 🔧 Common Issues

### Issue: Frontend can't connect to backend
**Solution:** Check CORS configuration in backend and ensure `VITE_API_URL` is set correctly in frontend `.env`

### Issue: Database connection fails
**Solution:** Verify `DATABASE_URL` in backend `.env` and ensure database is accessible

### Issue: Authentication not working
**Solution:** Ensure `credentials: true` in CORS config and `withCredentials: true` in axios config

### Issue: Missing dependencies
**Solution:** Run `npm install` in both repositories

## 🎯 Next Steps

1. Set up CI/CD pipelines for each repository
2. Configure separate deployment environments
3. Update documentation with new repository structure
4. Set up monitoring and logging for each service
5. Consider creating a shared types package if needed

## 📚 Additional Resources

- [Vite Documentation](https://vitejs.dev/)
- [Express Documentation](https://expressjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [CORS Configuration Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
