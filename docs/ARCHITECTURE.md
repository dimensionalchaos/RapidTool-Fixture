# RapidTool-Fixture — System Architecture

Complete system design, database schema, and API architecture.

---

## Architecture Philosophy

**Hybrid Storage: Client-First + Backend Metadata**

RapidTool-Fixture uses a **hybrid architecture** where active design work happens client-side (IndexedDB) for instant performance, while project metadata and user data are stored server-side (PostgreSQL) for persistence and cross-device access.

### Core Principles

1. **Client-Heavy** — All 3D operations run in browser (Three.js)
2. **Hybrid Storage** — Active work in IndexedDB, metadata in database
3. **Instant Performance** — Zero network latency for design operations
4. **Offline-Capable** — Full design functionality without internet
5. **Optional Sync** — Cloud backup is user-initiated

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  React Frontend Application                             │    │
│  │  ├─ Three.js Scene (3D Rendering)                      │    │
│  │  ├─ React Three Fiber (React Integration)              │    │
│  │  ├─ UI Components (Tailwind CSS)                       │    │
│  │  └─ State Management (Zustand)                         │    │
│  └────────────────────────────────────────────────────────┘    │
│                          ↕                                       │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Client-Side Storage Layer (IndexedDB)                  │    │
│  │  ├─ Active design sessions (8-22 MB each)              │    │
│  │  ├─ Imported models (STL/STEP/3MF)                     │    │
│  │  ├─ Undo/redo history (50 states)                      │    │
│  │  ├─ Auto-save snapshots (10 per session)               │    │
│  │  └─ Export records                                      │    │
│  │  Capacity: 1-2GB (45-125 sessions)                     │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS (Auth + Metadata)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND API SERVER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Express.js REST API                                    │    │
│  │  ├─ /api/auth/* (authentication)                       │    │
│  │  ├─ /api/projects/* (project metadata)                 │    │
│  │  ├─ /api/versions/* (version metadata)                 │    │
│  │  └─ /api/backup/* (optional cloud backup)              │    │
│  └────────────────────────────────────────────────────────┘    │
│                          ↕                                       │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  PostgreSQL Database                                    │    │
│  │  ├─ users (authentication)                             │    │
│  │  ├─ refresh_tokens (JWT rotation)                      │    │
│  │  ├─ projects (metadata only)                           │    │
│  │  ├─ design_versions (metadata only)                    │    │
│  │  ├─ exports (export records)                           │    │
│  │  ├─ cloud_backups (optional compressed data)           │    │
│  │  ├─ shared_projects (collaboration)                    │    │
│  │  └─ audit_logs (security events)                       │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema Design

### Overview

**8 Tables Total:**
- 3 Auth tables (users, refresh_tokens, audit_logs)
- 4 Project tables (projects, design_versions, exports, shared_projects)
- 1 Optional table (cloud_backups)

**Key Design Decisions:**
- **No 3D data in database** — Only metadata (names, timestamps, thumbnails)
- **Lightweight** — Small footprint, fast queries
- **Scalable** — Designed for millions of users
- **GDPR-compliant** — Easy data deletion and export

---

### Table 1: users

**Purpose:** User authentication and account management

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Authentication
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255),
  verification_token_expiry TIMESTAMP,
  
  -- Password Reset
  password_reset_token VARCHAR(255),
  password_reset_expiry TIMESTAMP,
  
  -- Security
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_secret VARCHAR(255),
  
  -- Profile
  name VARCHAR(255),
  avatar_url TEXT,
  
  -- Preferences
  preferences JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP,
  
  -- Soft Delete
  deleted_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_verification_token ON users(verification_token);
CREATE INDEX idx_users_reset_token ON users(password_reset_token);
```

**Fields Explained:**
- `id` — UUID primary key
- `email` — Unique email address
- `password_hash` — bcrypt hash (12 rounds)
- `email_verified` — Email verification status
- `verification_token` — Email verification token
- `password_reset_token` — Password reset token
- `failed_login_attempts` — Track failed logins
- `locked_until` — Account lockout timestamp
- `mfa_enabled` — Multi-factor auth enabled
- `preferences` — User settings (JSON)
- `deleted_at` — Soft delete timestamp

---

### Table 2: refresh_tokens

**Purpose:** JWT refresh token management with rotation

```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Token Data
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  
  -- Rotation
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP,
  replaced_by_token VARCHAR(255),
  
  -- Metadata
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
```

**Fields Explained:**
- `token_hash` — SHA-256 hash of refresh token
- `expires_at` — Token expiration (7 days)
- `revoked` — Token revoked status
- `replaced_by_token` — New token hash (rotation)
- `ip_address` — Client IP for security
- `user_agent` — Client browser info

---

### Table 3: audit_logs

**Purpose:** Security event tracking and compliance

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Event Data
  action VARCHAR(50) NOT NULL,
  resource VARCHAR(50),
  resource_id VARCHAR(255),
  
  -- Result
  status VARCHAR(20) NOT NULL, -- success, failure, error
  error_message TEXT,
  
  -- Request Context
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  -- Additional Data
  metadata JSONB,
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource, resource_id);
```

**Actions Tracked:**
- `LOGIN`, `LOGOUT`, `REGISTER`
- `PASSWORD_CHANGE`, `PASSWORD_RESET`
- `EMAIL_VERIFY`
- `PROJECT_CREATE`, `PROJECT_DELETE`, `PROJECT_SHARE`
- `EXPORT_CREATE`
- `BACKUP_UPLOAD`, `BACKUP_DOWNLOAD`

---

### Table 4: projects

**Purpose:** Project metadata (NOT 3D data)

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Project Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  
  -- Model Info (metadata only)
  model_filename VARCHAR(255),
  model_file_type VARCHAR(10), -- STL, STEP, 3MF
  model_file_size INTEGER,
  
  -- Design Stats
  supports_count INTEGER DEFAULT 0,
  clamps_count INTEGER DEFAULT 0,
  has_baseplate BOOLEAN DEFAULT FALSE,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active', -- active, archived, deleted
  
  -- Collaboration
  is_public BOOLEAN DEFAULT FALSE,
  share_token VARCHAR(255) UNIQUE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_opened_at TIMESTAMP,
  
  -- Soft Delete
  deleted_at TIMESTAMP
);

CREATE INDEX idx_projects_user_id ON projects(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_share_token ON projects(share_token);
CREATE INDEX idx_projects_updated_at ON projects(updated_at DESC);
```

**Fields Explained:**
- `name` — Project name (e.g., "Fixture for Part XYZ")
- `description` — Optional description
- `thumbnail_url` — Preview image URL
- `model_filename` — Original file name
- `model_file_type` — STL, STEP, or 3MF
- `supports_count` — Number of supports
- `clamps_count` — Number of clamps
- `status` — active, archived, or deleted
- `is_public` — Public sharing enabled
- `share_token` — Unique share link token

**Note:** Actual 3D data is in IndexedDB, not database!

---

### Table 5: design_versions

**Purpose:** Version history metadata (NOT full state)

```sql
CREATE TABLE design_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Version Info
  version_number INTEGER NOT NULL,
  name VARCHAR(255),
  description TEXT,
  thumbnail_url TEXT,
  
  -- Changes Summary
  changes_summary TEXT,
  supports_count INTEGER DEFAULT 0,
  clamps_count INTEGER DEFAULT 0,
  
  -- Metadata
  is_auto_save BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_design_versions_project_id ON design_versions(project_id);
CREATE INDEX idx_design_versions_created_at ON design_versions(created_at DESC);
CREATE UNIQUE INDEX idx_design_versions_project_version 
  ON design_versions(project_id, version_number);
```

**Fields Explained:**
- `version_number` — Sequential version (1, 2, 3...)
- `name` — Version name (e.g., "Initial design", "Added clamps")
- `changes_summary` — What changed
- `is_auto_save` — Auto-saved or manual
- `thumbnail_url` — Version preview

**Note:** Full version state is in IndexedDB snapshots!

---

### Table 6: exports

**Purpose:** Track exported files

```sql
CREATE TABLE exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Export Info
  format VARCHAR(10) NOT NULL, -- STL, 3MF, PDF, SESSION
  filename VARCHAR(255) NOT NULL,
  file_size INTEGER,
  file_url TEXT,
  
  -- Export Settings
  settings JSONB,
  
  -- Status
  status VARCHAR(20) DEFAULT 'completed', -- pending, completed, failed
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP -- For temporary download links
);

CREATE INDEX idx_exports_project_id ON exports(project_id);
CREATE INDEX idx_exports_user_id ON exports(user_id);
CREATE INDEX idx_exports_created_at ON exports(created_at DESC);
CREATE INDEX idx_exports_expires_at ON exports(expires_at) WHERE expires_at IS NOT NULL;
```

**Fields Explained:**
- `format` — STL, 3MF, PDF, or SESSION
- `filename` — Export filename
- `file_url` — S3 URL or download link
- `settings` — Export settings (JSON)
- `expires_at` — Link expiration (24-48 hours)

---

### Table 7: shared_projects

**Purpose:** Project sharing and collaboration

```sql
CREATE TABLE shared_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_with UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Permissions
  permission VARCHAR(20) DEFAULT 'view', -- view, edit, admin
  
  -- Share Type
  share_type VARCHAR(20) NOT NULL, -- user, link, public
  share_token VARCHAR(255) UNIQUE,
  
  -- Status
  accepted BOOLEAN DEFAULT FALSE,
  revoked BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  revoked_at TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE INDEX idx_shared_projects_project_id ON shared_projects(project_id);
CREATE INDEX idx_shared_projects_shared_with ON shared_projects(shared_with);
CREATE INDEX idx_shared_projects_share_token ON shared_projects(share_token);
CREATE INDEX idx_shared_projects_expires_at ON shared_projects(expires_at);
```

**Fields Explained:**
- `shared_by` — User who shared
- `shared_with` — User receiving share (NULL for link shares)
- `permission` — view, edit, or admin
- `share_type` — user (direct), link, or public
- `share_token` — Unique token for link sharing
- `accepted` — Share accepted status
- `expires_at` — Share expiration

---

### Table 8: cloud_backups (Optional)

**Purpose:** Optional cloud backup storage

```sql
CREATE TABLE cloud_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Backup Data
  backup_name VARCHAR(255),
  compressed_data BYTEA, -- Or S3 URL
  file_size INTEGER NOT NULL,
  checksum VARCHAR(64) NOT NULL,
  
  -- Compression
  compression_type VARCHAR(20) DEFAULT 'gzip', -- gzip, brotli
  original_size INTEGER,
  
  -- Metadata
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  accessed_at TIMESTAMP
);

CREATE INDEX idx_cloud_backups_project_id ON cloud_backups(project_id);
CREATE INDEX idx_cloud_backups_user_id ON cloud_backups(user_id);
CREATE INDEX idx_cloud_backups_created_at ON cloud_backups(created_at DESC);
```

**Fields Explained:**
- `compressed_data` — Compressed session data (or S3 URL)
- `file_size` — Compressed size
- `checksum` — SHA-256 checksum
- `compression_type` — gzip or brotli
- `original_size` — Uncompressed size

**Note:** This table is optional. Users can work without cloud backup.

---

## Database Relationships

```
users (1) ──────── (N) projects
  │                      │
  │                      ├── (N) design_versions
  │                      ├── (N) exports
  │                      └── (N) cloud_backups
  │
  ├── (N) refresh_tokens
  ├── (N) audit_logs
  └── (N) shared_projects (as shared_by or shared_with)
```

---

## API Endpoints

### Authentication Endpoints

```typescript
// Public
POST   /api/auth/register          // Create account
POST   /api/auth/login             // Login
POST   /api/auth/refresh           // Refresh access token
GET    /api/auth/verify            // Verify email
POST   /api/auth/request-reset     // Request password reset
POST   /api/auth/reset             // Reset password

// Protected
GET    /api/auth/me                // Get current user
PUT    /api/auth/profile           // Update profile
POST   /api/auth/change-password   // Change password
POST   /api/auth/logout            // Logout
DELETE /api/auth/account           // Delete account
```

### Project Endpoints

```typescript
// Protected
GET    /api/projects               // List user's projects
POST   /api/projects               // Create project (metadata only)
GET    /api/projects/:id           // Get project metadata
PUT    /api/projects/:id           // Update project metadata
DELETE /api/projects/:id           // Delete project
POST   /api/projects/:id/archive   // Archive project
POST   /api/projects/:id/restore   // Restore project
```

### Version Endpoints

```typescript
// Protected
GET    /api/projects/:id/versions          // List versions
POST   /api/projects/:id/versions          // Create version
GET    /api/projects/:id/versions/:verId   // Get version
DELETE /api/projects/:id/versions/:verId   // Delete version
```

### Export Endpoints

```typescript
// Protected
GET    /api/projects/:id/exports           // List exports
POST   /api/projects/:id/exports           // Create export record
GET    /api/exports/:id/download           // Download export
DELETE /api/exports/:id                    // Delete export
```

### Share Endpoints

```typescript
// Protected
POST   /api/projects/:id/share             // Share project
GET    /api/projects/:id/shares            // List shares
DELETE /api/shares/:id                     // Revoke share
GET    /api/shared-with-me                 // Projects shared with me

// Public
GET    /api/share/:token                   // Access shared project
```

### Cloud Backup Endpoints (Optional)

```typescript
// Protected
POST   /api/backup/upload                  // Upload compressed session
GET    /api/backup/list                    // List backups
GET    /api/backup/:id/download            // Download backup
DELETE /api/backup/:id                     // Delete backup
```

---

## Data Flow

### Creating a New Project

```
1. User imports STL file in browser
   ↓
2. Frontend stores in IndexedDB
   ↓
3. Frontend calls POST /api/projects with metadata
   {
     name: "Fixture for Part XYZ",
     model_filename: "part.stl",
     model_file_type: "STL",
     model_file_size: 5242880
   }
   ↓
4. Backend creates project record in database
   ↓
5. Frontend continues working offline with IndexedDB
```

### Saving Progress

```
1. User makes changes (add support, etc.)
   ↓
2. Auto-save triggers (30 seconds)
   ↓
3. Frontend saves to IndexedDB (instant)
   ↓
4. (Optional) Frontend calls PUT /api/projects/:id
   to update metadata (supports_count, updated_at)
```

### Loading a Project

```
1. User opens project list
   ↓
2. Frontend calls GET /api/projects
   Returns: [{ id, name, thumbnail, updated_at }]
   ↓
3. User clicks project
   ↓
4. Frontend loads from IndexedDB (instant)
   ↓
5. If not in IndexedDB, show "Download from cloud" option
```

---

## Storage Strategy

### Client-Side (IndexedDB)

**What Gets Stored:**
- Imported 3D models (full geometry)
- Current design state
- Undo/redo history (50 states)
- Auto-save snapshots (10 per session)
- Export files (temporary)

**Capacity:** 1-2 GB per device (45-125 projects)

### Server-Side (PostgreSQL)

**What Gets Stored:**
- User accounts
- Project metadata (names, timestamps, thumbnails)
- Version metadata (not full state)
- Export records
- Share permissions
- Optional: Compressed backups

**Capacity:** ~1-10 MB per user

---

## Security Architecture

### Authentication
- **Password Hashing:** bcrypt with 12 salt rounds
- **JWT Tokens:** 15-minute access, 7-day refresh
- **Token Rotation:** Refresh tokens rotated on use
- **Account Lockout:** 5 failed attempts → 15-minute lockout

### Authorization
- **Row-Level Security:** Users can only access their own data
- **Share Permissions:** view, edit, admin levels
- **Audit Logging:** All sensitive actions logged

### Data Protection
- **Client-Side:** Data stays on device
- **In Transit:** HTTPS/TLS 1.3
- **At Rest:** Database encryption (AES-256)
- **Backups:** Encrypted before upload

---

## Performance Optimization

### Database Indexes
- All foreign keys indexed
- Composite indexes for common queries
- Partial indexes for soft deletes
- Covering indexes for list queries

### Query Optimization
- Pagination for list endpoints (limit 50)
- Select only needed fields
- Eager loading for relationships
- Connection pooling (max 20 connections)

### Caching Strategy
- Redis for session data (optional)
- CDN for thumbnails and exports
- Browser caching for static assets

---

## Scalability

### Horizontal Scaling
- Stateless API (scale backend instances)
- Load balancer distribution
- Database read replicas
- CDN for static content

### Vertical Scaling
- Database optimization (indexes, queries)
- Connection pooling
- Async operations
- Background jobs for exports

---

## Summary

### Database Design
- **8 tables** — Lightweight and focused
- **Metadata only** — No 3D data in database
- **GDPR-compliant** — Easy data deletion
- **Scalable** — Designed for millions of users

### Architecture Benefits
- ✅ **Fast** — Instant client-side operations
- ✅ **Offline** — Full functionality without internet
- ✅ **Scalable** — Minimal server load
- ✅ **Private** — Data stays on device
- ✅ **Flexible** — Optional cloud features

---

**Next:** [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) for implementation details
