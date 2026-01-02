# RapidTool-Fixture

**Browser-based 3D fixture design application for additive manufacturing**

Design custom fixtures in under 20 minutes with no CAD expertise required.

---

## 🎯 Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd fixture-view
npm install
cd backend && npm install && cd ..

# 2. Setup environment
cp .env.example .env
# Edit .env with your settings

# 3. Start PostgreSQL
docker run --name rapidtool-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=rapidtool_fixture \
  -p 5432:5432 -d postgres:15

# 4. Initialize database
cd backend
npx prisma generate
npx prisma migrate dev --name init
cd ..

# 5. Start servers
cd backend && npm run dev  # Terminal 1
npm run dev                # Terminal 2
```

Open http://localhost:5173

---

## 📚 Documentation

**Essential Documents (Read in Order):**

1. **[ARCHITECTURE.md](./ARCHITECTURE.md)** (15 min read)
   - System design & architecture
   - Database schema with all tables
   - API endpoints
   - Security & performance

2. **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** (30 min read)
   - Development setup
   - Storage system usage
   - Auth system usage
   - Testing & deployment

3. **[COORDINATE_SYSTEM.md](./COORDINATE_SYSTEM.md)** (5 min read)
   - 3D coordinate system reference

---

## 🏗️ Architecture Overview

**Hybrid Storage: Client-First + Backend Metadata**

```
┌─────────────────────────────────────────────────────────┐
│                    USER'S BROWSER                        │
├─────────────────────────────────────────────────────────┤
│  React Frontend                                          │
│  ├─ Three.js (3D rendering)                             │
│  ├─ IndexedDB (active design work - 1-2GB)              │
│  └─ Auto-save + Undo/Redo                               │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│              BACKEND (Auth + Metadata)                   │
├─────────────────────────────────────────────────────────┤
│  Express.js API                                          │
│  ├─ JWT Authentication                                   │
│  ├─ User Management                                      │
│  ├─ Project Metadata                                     │
│  └─ Optional Cloud Backup                                │
│                                                          │
│  PostgreSQL Database                                     │
│  ├─ Users & Auth                                         │
│  ├─ Projects (metadata only)                             │
│  ├─ Design Versions (metadata only)                      │
│  └─ Cloud Backups (optional)                             │
└─────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Client-Heavy** — All 3D work happens in browser
2. **Hybrid Storage** — Active work in IndexedDB, metadata in database
3. **Optional Sync** — Cloud backup is user-initiated
4. **Offline Capable** — Full design functionality without internet

---

## 🎨 Technology Stack

**Frontend:**
- React 18 + TypeScript
- Three.js + React Three Fiber
- Vite (build tool)
- Tailwind CSS
- IndexedDB (1-2GB local storage)

**Backend:**
- Node.js 20+ + TypeScript
- Express.js
- Prisma ORM
- PostgreSQL
- JWT Authentication

**DevOps:**
- Docker
- GitHub Actions
- Vercel (frontend)
- Railway/Render (backend)

---

## ✅ Current Status

### Completed
- ✅ Frontend UI (30+ components)
- ✅ 3D rendering system
- ✅ Client-side storage (IndexedDB)
- ✅ Undo/redo (50 levels)
- ✅ Auto-save (30s intervals)
- ✅ JWT authentication backend

### In Progress
- ⏳ Database schema design
- ⏳ Storage integration with UI
- ⏳ Project metadata management

### Pending
- 🔜 Export functionality (STL/3MF/PDF)
- 🔜 Cloud backup
- 🔜 Production deployment

---

## 🚀 Features

### Core Design
- Import STL/STEP/3MF models
- Add supports (rectangular, cylindrical, polygonal)
- Add clamps (toggle, screw, magnetic)
- Boolean operations (subtract, union)
- Baseplate configuration
- Real-time 3D preview

### Storage & History
- Local-first storage (IndexedDB)
- 50-level undo/redo
- Auto-save every 30 seconds
- Crash recovery
- Session management

### Authentication
- Email/password registration
- JWT access + refresh tokens
- Email verification
- Password reset
- Account security

### User Experience
- Works offline
- Instant performance
- No data loss (auto-save)
- Privacy-first (data on device)

---

## 🔧 Development

### Daily Workflow

```bash
# Start backend (Terminal 1)
cd backend && npm run dev

# Start frontend (Terminal 2)
npm run dev

# View database (Terminal 3)
cd backend && npx prisma studio
```

### Testing

```bash
# Frontend tests
npm test

# Backend tests
cd backend && npm test

# E2E tests
npm run test:e2e
```

---

## 📊 Project Statistics

- **Frontend Code:** ~15,000 lines
- **Backend Code:** ~2,000 lines
- **Storage System:** ~2,000 lines
- **Components:** 30+ React components
- **API Endpoints:** 15+ endpoints
- **Database Tables:** 8 tables
- **Documentation:** 3 essential files

---

## 🎯 Next Steps

1. Review **[ARCHITECTURE.md](./ARCHITECTURE.md)** for system design
2. Follow **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** for setup
3. Start implementing storage integration
4. Add export functionality
5. Deploy to production

---

**Status:** ✅ Core systems complete, ready for integration

**Last Updated:** December 23, 2025
