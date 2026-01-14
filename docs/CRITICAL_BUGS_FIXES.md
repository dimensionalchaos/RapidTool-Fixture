# 🐛 Critical Bugs & Fixes Document
**RapidTool Fixture Application**

**Date:** January 14, 2026  
**Status:** Awaiting Approval for Fixes

---

## 🔴 CRITICAL BUGS (Must Fix Before Deployment)

### Bug #1: Multiple Prisma Client Instances
**Severity:** 🔴 Critical  
**Impact:** Connection pool exhaustion, memory leaks  
**Status:** Ready to fix (awaiting approval)

#### Problem
```typescript
// ❌ WRONG: Creating new PrismaClient instances
// File: backend/src/middleware/auth.middleware.ts (line 11)
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// File: backend/src/middleware/license.middleware.ts (line 11)
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
```

#### Why This Is Bad
- Each `new PrismaClient()` creates a new connection pool
- Multiple instances = multiple connection pools
- Supabase has connection limits
- Causes "too many connections" errors
- Memory leaks over time

#### Solution
```typescript
// ✅ CORRECT: Import singleton instance
import prisma from '../lib/prisma';
```

#### Files to Fix
1. `backend/src/middleware/auth.middleware.ts`
2. `backend/src/middleware/license.middleware.ts`

---

### Bug #2: Database Schema Mismatch
**Severity:** 🔴 Critical  
**Impact:** Export tracking completely broken  
**Status:** Migration pending (awaiting approval)

#### Problem
```
Error: P2022
The column `exports.error_code` does not exist in the current database.
```

#### Root Cause
- Prisma schema defines `errorCode` field
- Database table doesn't have the column
- Schema and DB are out of sync

#### Solution Options

**Option A: SQL Migration (Recommended)**
```sql
-- Run in Supabase SQL Editor
ALTER TABLE exports 
ADD COLUMN IF NOT EXISTS error_code VARCHAR(255);
```

**Option B: Prisma Migration**
```bash
cd backend
npx prisma db push --accept-data-loss
```

**Option C: Manual Prisma Migration**
```bash
cd backend
npx prisma migrate dev --name add_error_code_to_exports
```

#### Recommendation
Use **Option A** (SQL) - fastest and most reliable given connection timeout issues.

---

### Bug #3: No Rate Limiting
**Severity:** 🔴 Critical  
**Impact:** Vulnerable to brute force, DDoS, abuse  
**Status:** Needs implementation

#### Problem
```
❌ No rate limiting on any endpoints
- Login endpoint: unlimited attempts
- File upload: unlimited uploads
- API endpoints: unlimited requests
```

#### Attack Scenarios
1. **Brute Force:** Attacker tries 1000s of passwords
2. **DDoS:** Flood server with requests
3. **Storage Abuse:** Upload massive files repeatedly
4. **API Abuse:** Scrape data with unlimited requests

#### Solution
```typescript
// Install package
npm install express-rate-limit

// Add to backend/src/index.ts
import rateLimit from 'express-rate-limit';

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts per 15 minutes
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true,
});

// Apply to routes
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
```

#### Files to Modify
1. `backend/package.json` - Add dependency
2. `backend/src/index.ts` - Add rate limiting middleware

---

## 🟡 HIGH PRIORITY BUGS

### Bug #4: Missing Input Validation
**Severity:** 🟡 High  
**Impact:** Invalid data can enter system  
**Status:** Needs implementation

#### Problem
```
✅ Auth endpoints have Zod validation
❌ Model import endpoints - NO validation
❌ Export endpoints - NO validation
❌ License endpoints - NO validation
```

#### Solution
Create validators for each endpoint:

```typescript
// backend/src/validators/modelImport.validator.ts
import { z } from 'zod';

export const uploadModelSchema = z.object({
  projectId: z.string().uuid().optional().nullable(),
  fileHash: z.string().optional(),
});

export const updateProgressSchema = z.object({
  progress: z.number().min(0).max(100),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']),
});
```

#### Files to Create
1. `backend/src/validators/modelImport.validator.ts`
2. `backend/src/validators/export.validator.ts`
3. `backend/src/validators/license.validator.ts`

#### Files to Modify
1. Update controllers to use validators

---

### Bug #5: CORS Too Permissive
**Severity:** 🟡 High  
**Impact:** Security risk in production  
**Status:** Needs configuration

#### Problem
```typescript
// ❌ DANGEROUS: Allows all local network IPs
origin.startsWith('http://192.168.') ||
origin.startsWith('http://10.') ||
origin.startsWith('http://localhost')
```

#### Why This Is Bad
- In production, this allows ANY local network IP
- If deployed on cloud, could allow internal AWS IPs
- Potential for unauthorized access

#### Solution
```typescript
// ✅ BETTER: Environment-based configuration
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      process.env.FRONTEND_URL, // e.g., https://rapidtool.vercel.app
      process.env.CORS_ORIGIN,
    ].filter(Boolean)
  : [
      'http://localhost:5173',
      'http://localhost:8080',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:8080',
    ];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
```

#### Files to Modify
1. `backend/src/index.ts`
2. `backend/.env.example` - Add FRONTEND_URL

---

### Bug #6: Large File Upload Performance
**Severity:** 🟡 High  
**Impact:** Poor UX, potential timeouts  
**Status:** Architectural change needed

#### Problem
```
Current: Store files in PostgreSQL BYTEA column
- 26.42 MB file takes 45+ seconds to insert
- 50 MB file may timeout
- Database bloat
- Expensive to backup
- Slow to retrieve
```

#### Solution
**Move to Cloud Storage (S3 or Supabase Storage)**

```typescript
// Option A: AWS S3
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: 'us-east-1' });

async function uploadToS3(file: Buffer, filename: string) {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: `models/${filename}`,
    Body: file,
    ContentType: 'application/octet-stream',
  });
  
  await s3Client.send(command);
  return `https://${process.env.S3_BUCKET}.s3.amazonaws.com/models/${filename}`;
}

// Option B: Supabase Storage
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function uploadToSupabase(file: Buffer, filename: string) {
  const { data, error } = await supabase.storage
    .from('models')
    .upload(filename, file);
  
  if (error) throw error;
  
  const { data: urlData } = supabase.storage
    .from('models')
    .getPublicUrl(filename);
  
  return urlData.publicUrl;
}
```

#### Database Schema Change
```typescript
// Instead of storing file data:
modelData: Bytes?  // ❌ Remove this

// Store URL instead:
fileUrl: String    // ✅ Add this
```

#### Benefits
- ✅ Fast uploads (seconds instead of minutes)
- ✅ No database bloat
- ✅ CDN delivery
- ✅ Cheaper storage
- ✅ Better scalability

#### Files to Modify
1. `backend/prisma/schema.prisma` - Change modelData to fileUrl
2. `backend/src/services/modelImport.service.ts` - Add storage upload
3. `backend/src/controllers/modelImport.controller.ts` - Update logic
4. Add new service: `backend/src/services/storage.service.ts`

---

## 🟠 MEDIUM PRIORITY BUGS

### Bug #7: Hardcoded Configuration Values
**Severity:** 🟠 Medium  
**Impact:** Hard to change without redeployment  
**Status:** Refactoring needed

#### Problem
```typescript
// ❌ Hardcoded in license.service.ts
const TRIAL_DURATION_DAYS = 14;
const EXPIRY_WARNING_DAYS = 7;
const FREE_MODEL_LIMIT = 5;
const PREMIUM_MODEL_LIMIT = 999999;

// ❌ Hardcoded in export.service.ts
const EXPORT_LIMIT = 100;
```

#### Solution
```typescript
// ✅ Move to environment variables
// backend/.env
TRIAL_DURATION_DAYS=14
EXPIRY_WARNING_DAYS=7
FREE_MODEL_LIMIT=5
PREMIUM_MODEL_LIMIT=999999
EXPORT_LIMIT=100

// backend/src/config/license.config.ts
export const licenseConfig = {
  trialDurationDays: parseInt(process.env.TRIAL_DURATION_DAYS || '14'),
  expiryWarningDays: parseInt(process.env.EXPIRY_WARNING_DAYS || '7'),
  freeModelLimit: parseInt(process.env.FREE_MODEL_LIMIT || '5'),
  premiumModelLimit: parseInt(process.env.PREMIUM_MODEL_LIMIT || '999999'),
};
```

#### Files to Create
1. `backend/src/config/license.config.ts`
2. `backend/src/config/export.config.ts`

#### Files to Modify
1. `backend/src/services/license.service.ts`
2. `backend/src/services/export.service.ts`
3. `backend/.env.example`

---

### Bug #8: No React Error Boundaries
**Severity:** 🟠 Medium  
**Impact:** App crashes on component errors  
**Status:** Needs implementation

#### Problem
```
❌ No error boundaries in frontend
- Component error = white screen
- Poor UX
- No error reporting
```

#### Solution
```typescript
// src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send to error tracking service (Sentry)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary">
          <h1>Something went wrong</h1>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage in App.tsx
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

#### Files to Create
1. `src/components/ErrorBoundary.tsx`

#### Files to Modify
1. `src/main.tsx` - Wrap app with ErrorBoundary

---

### Bug #9: Missing Loading States
**Severity:** 🟠 Medium  
**Impact:** Poor UX during operations  
**Status:** UI enhancement needed

#### Problem
```
⚠️ File upload shows no progress
⚠️ Login shows no loading indicator
⚠️ Export shows no feedback
```

#### Solution
Add loading states to all async operations:

```typescript
// Example: File upload with progress
const [uploadProgress, setUploadProgress] = useState(0);

await modelImportAPI.uploadModel(file, null, {
  onUploadProgress: (progressEvent) => {
    const percent = Math.round(
      (progressEvent.loaded * 100) / progressEvent.total
    );
    setUploadProgress(percent);
  },
});
```

#### Files to Modify
1. `src/modules/FileImport/hooks/useFileProcessing.ts`
2. `src/components/Auth/LoginForm.tsx`
3. `src/services/export/exportService.ts`

---

## 🟢 LOW PRIORITY ISSUES

### Issue #10: Large Bundle Size
**Severity:** 🟢 Low  
**Impact:** Slow initial load  
**Status:** Optimization opportunity

#### Problem
```
Three.js and dependencies are large
- Initial bundle: ~2-3 MB
- Slow on 3G connections
```

#### Solution
```typescript
// Lazy load 3D components
const Scene3D = lazy(() => import('./components/3DScene'));

// Code splitting by route
const FixtureDesign = lazy(() => import('./pages/FixtureDesign'));
const Auth = lazy(() => import('./pages/Auth'));
```

---

## 📋 FIX PRIORITY ORDER

### Phase 1: Critical (Before Any Deployment)
1. ✅ Fix Prisma singleton issue (5 minutes)
2. ✅ Add database migration for error_code (2 minutes)
3. ✅ Add rate limiting (30 minutes)
4. ⏳ Fix CORS configuration (15 minutes)

### Phase 2: High Priority (Before Production)
5. ⏳ Add input validation (2 hours)
6. ⏳ Move to cloud storage (4-6 hours)

### Phase 3: Medium Priority (Post-Launch)
7. ⏳ Move config to environment variables (1 hour)
8. ⏳ Add error boundaries (1 hour)
9. ⏳ Add loading states (2 hours)

### Phase 4: Optimization (Ongoing)
10. ⏳ Bundle size optimization (4 hours)

---

## 🔧 QUICK FIX SCRIPTS

### Fix #1: Prisma Singleton
```bash
# No script needed - manual code changes
# See detailed fix in Bug #1 section
```

### Fix #2: Database Migration
```bash
# Option A: SQL (Recommended)
# Run in Supabase SQL Editor:
ALTER TABLE exports ADD COLUMN IF NOT EXISTS error_code VARCHAR(255);

# Then regenerate Prisma client:
cd backend
npx prisma generate
```

### Fix #3: Add Rate Limiting
```bash
# Install package
cd backend
npm install express-rate-limit

# Then add code from Bug #3 section
```

---

## ✅ TESTING CHECKLIST

After each fix, test:

### After Prisma Singleton Fix
- [ ] Login works
- [ ] Model upload works
- [ ] License check works
- [ ] No "too many connections" errors

### After Database Migration
- [ ] Export tracking works
- [ ] No P2022 errors
- [ ] Export count increments

### After Rate Limiting
- [ ] Normal requests work
- [ ] Excessive requests get blocked
- [ ] Error message is clear

### After CORS Fix
- [ ] Frontend can access backend
- [ ] Unauthorized origins blocked
- [ ] Production deployment works

### After Input Validation
- [ ] Valid requests work
- [ ] Invalid requests rejected
- [ ] Error messages are clear

---

## 🚨 ROLLBACK PROCEDURES

### If Prisma Fix Breaks
```bash
git checkout HEAD -- backend/src/middleware/auth.middleware.ts
git checkout HEAD -- backend/src/middleware/license.middleware.ts
npm run dev
```

### If Migration Breaks
```sql
-- Rollback migration
ALTER TABLE exports DROP COLUMN IF EXISTS error_code;
```

### If Rate Limiting Breaks
```bash
# Remove from package.json
npm uninstall express-rate-limit

# Remove from index.ts
git checkout HEAD -- backend/src/index.ts
```

---

**All fixes are ready to implement pending your approval!** 🚀

Please review and let me know which fixes to proceed with.
