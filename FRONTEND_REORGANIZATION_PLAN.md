# 🏗️ Frontend Code Reorganization Plan

**Date:** December 31, 2025  
**Goal:** Clean, secure, maintainable frontend architecture

---

## 📊 CURRENT FRONTEND ANALYSIS

### **Total Files Analyzed**
- **Components:** 140+ files
- **Core Business Logic:** 29 files in `src/lib/`
- **Support Logic:** 4 critical files
- **Workers:** 6 web worker files
- **Total Lines of Code:** ~50,000+ lines

### **Key Issues Identified**

#### 1. **Scattered Business Logic**
- Logic spread across `/lib`, `/components`, `/core`
- No clear separation of concerns
- Hard to maintain and test

#### 2. **Mixed Responsibilities**
- UI components contain business logic
- Business logic files have UI dependencies
- Tight coupling between layers

#### 3. **Security Exposure**
- All algorithms visible in client code
- Proprietary logic easily accessible
- No protection for competitive advantages

#### 4. **Poor Organization**
- 140+ files in components folder
- No clear module boundaries
- Difficult to navigate

---

## 🎯 PROPOSED CLEAN ARCHITECTURE

### **Layer Separation**

```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                    │
│  (UI Components - React, Three.js rendering)            │
│  - Display only, no business logic                      │
│  - User interactions                                    │
│  - Visual feedback                                      │
└─────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                      │
│  (API Services, State Management, Orchestration)        │
│  - Coordinates between UI and backend                   │
│  - Manages application state                            │
│  - Handles API calls                                    │
└─────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│                     BACKEND LAYER                        │
│  (Business Logic - Protected on Server)                 │
│  - Support generation algorithms                        │
│  - Overhang analysis                                    │
│  - Clamp placement logic                                │
│  - Mesh processing                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 NEW FRONTEND STRUCTURE

### **Proposed Organization**

```
src/
├── app/                          # Application setup
│   ├── App.tsx                   # Main app component
│   ├── routes.tsx                # Route definitions
│   └── providers.tsx             # Context providers
│
├── features/                     # Feature-based modules
│   ├── design/                   # Design workspace
│   │   ├── components/           # Design UI components
│   │   ├── hooks/                # Design-specific hooks
│   │   ├── store/                # Design state
│   │   └── types/                # Design types
│   │
│   ├── supports/                 # Support feature
│   │   ├── components/           # Support UI
│   │   ├── api/                  # Support API calls
│   │   ├── hooks/                # Support hooks
│   │   └── types/                # Support types
│   │
│   ├── clamps/                   # Clamp feature
│   │   ├── components/           # Clamp UI
│   │   ├── api/                  # Clamp API calls
│   │   ├── hooks/                # Clamp hooks
│   │   └── types/                # Clamp types
│   │
│   ├── baseplate/                # Baseplate feature
│   │   ├── components/
│   │   ├── api/
│   │   └── types/
│   │
│   ├── mounting-holes/           # Mounting holes feature
│   │   ├── components/
│   │   ├── api/
│   │   └── types/
│   │
│   └── viewer/                   # 3D Viewer feature
│       ├── components/           # 3D viewer components
│       ├── hooks/                # Viewer hooks
│       ├── utils/                # Rendering utilities
│       └── types/                # Viewer types
│
├── shared/                       # Shared across features
│   ├── components/               # Reusable UI components
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── layout/               # Layout components
│   │   └── common/               # Common components
│   │
│   ├── api/                      # API client setup
│   │   ├── client.ts             # Axios/fetch setup
│   │   ├── auth.ts               # Auth API
│   │   └── design.ts             # Design API
│   │
│   ├── hooks/                    # Shared hooks
│   │   ├── useAuth.ts
│   │   ├── useApi.ts
│   │   └── useToast.ts
│   │
│   ├── utils/                    # Utility functions
│   │   ├── geometry.ts           # Basic geometry utils
│   │   ├── validation.ts         # Input validation
│   │   └── formatting.ts         # Data formatting
│   │
│   ├── types/                    # Shared TypeScript types
│   │   ├── api.ts                # API types
│   │   ├── geometry.ts           # Geometry types
│   │   └── common.ts             # Common types
│   │
│   └── constants/                # App constants
│       ├── config.ts             # Configuration
│       └── defaults.ts           # Default values
│
├── lib/                          # Third-party integrations
│   ├── three/                    # Three.js setup
│   │   ├── setup.ts
│   │   └── helpers.ts
│   │
│   └── storage/                  # IndexedDB (keep client-side)
│       ├── StorageManager.ts
│       ├── AutoSaveManager.ts
│       └── UndoRedoManager.ts
│
└── pages/                        # Page components
    ├── auth/                     # Auth pages
    │   ├── Login.tsx
    │   ├── Register.tsx
    │   └── ResetPassword.tsx
    │
    ├── dashboard/                # Dashboard
    │   └── Dashboard.tsx
    │
    └── design/                   # Design workspace page
        └── DesignWorkspace.tsx
```

---

## 🔄 MIGRATION STRATEGY

### **Phase 1: Create New Structure (Day 1-2)**

#### Step 1: Create Feature Folders
```bash
mkdir -p src/features/{design,supports,clamps,baseplate,mounting-holes,viewer}
mkdir -p src/shared/{components,api,hooks,utils,types,constants}
mkdir -p src/app
```

#### Step 2: Create Shared Infrastructure
- Set up API client
- Create shared types
- Set up state management
- Create utility functions

### **Phase 2: Migrate Features (Day 3-7)**

#### Feature Migration Order:
1. **Viewer** (least dependent)
2. **Baseplate** (simple)
3. **Mounting Holes** (simple)
4. **Supports** (complex - needs backend API)
5. **Clamps** (complex - needs backend API)
6. **Design** (orchestrates everything)

#### Migration Template for Each Feature:
```
1. Create feature folder structure
2. Move UI components to feature/components/
3. Create API service in feature/api/
4. Create feature-specific hooks
5. Define feature types
6. Update imports
7. Test feature independently
```

### **Phase 3: Backend API Creation (Parallel)**

While migrating frontend, create backend APIs:
1. Support generation API
2. Overhang analysis API
3. Clamp placement API
4. Mesh processing API

### **Phase 4: Integration & Testing (Day 8-10)**

1. Connect features together
2. Test complete workflows
3. Performance optimization
4. Bug fixes

---

## 🔧 DETAILED MIGRATION STEPS

### **Example: Migrating Supports Feature**

#### Current Structure:
```
src/components/Supports/
├── overhangAnalysis.ts      # 3,903 lines - MOVE TO BACKEND
├── autoPlacement.ts         # MOVE TO BACKEND
├── metrics.ts               # Keep for display
├── types.ts                 # Keep
├── SupportPanel.tsx         # UI component
└── SupportPreview.tsx       # UI component
```

#### New Structure:
```
src/features/supports/
├── components/              # UI only
│   ├── SupportPanel.tsx
│   ├── SupportPreview.tsx
│   ├── SupportList.tsx
│   └── SupportSettings.tsx
│
├── api/                     # Backend API calls
│   └── supportApi.ts        # Calls backend for generation
│
├── hooks/                   # React hooks
│   ├── useSupports.ts       # Support state management
│   ├── useSupportGeneration.ts
│   └── useSupportPreview.ts
│
├── types/                   # TypeScript types
│   └── support.types.ts
│
└── utils/                   # Display utilities only
    └── supportMetrics.ts    # For displaying metrics
```

#### Backend (NEW):
```
backend/src/services/design/
└── supportGeneration.service.ts  # overhangAnalysis logic HERE
```

---

## 📋 FILE-BY-FILE MIGRATION CHECKLIST

### **Files to Move to Backend**

#### High Priority (Proprietary Algorithms):
- [ ] `src/components/Supports/overhangAnalysis.ts` → Backend
- [ ] `src/components/Supports/autoPlacement.ts` → Backend
- [ ] `src/components/Clamps/clampPlacement.ts` → Backend
- [ ] `src/lib/csgEngine.ts` → Backend
- [ ] `src/lib/fastQuadricSimplify.ts` → Backend
- [ ] `src/lib/fixtureComponents.ts` → Backend

#### Medium Priority:
- [ ] `src/lib/offset/*` → Backend (10 files)
- [ ] `src/lib/workers/*` → Backend or keep as optimization
- [ ] `src/components/Clamps/clampSupportUtils.ts` → Backend

### **Files to Keep Client-Side**

#### Rendering & Display:
- ✅ All Three.js rendering code
- ✅ UI components (React)
- ✅ Visual feedback
- ✅ User input handling

#### Storage (Local-First):
- ✅ `src/lib/storage/*` - IndexedDB operations
- ✅ Auto-save functionality
- ✅ Undo/redo system

#### Utilities:
- ✅ Basic geometry utilities
- ✅ Formatting functions
- ✅ Validation helpers

---

## 🎨 CODE ORGANIZATION PRINCIPLES

### **1. Feature-Based Organization**
- Group by feature, not by file type
- Each feature is self-contained
- Easy to find related code

### **2. Clear Separation of Concerns**
- UI components only handle display
- API layer handles backend communication
- Hooks manage state and side effects
- Utils provide pure functions

### **3. Dependency Direction**
```
Features → Shared → Lib
(Never: Shared → Features)
(Never: Lib → Features)
```

### **4. Naming Conventions**
- Components: PascalCase (e.g., `SupportPanel.tsx`)
- Hooks: camelCase with 'use' prefix (e.g., `useSupports.ts`)
- Utils: camelCase (e.g., `formatMetrics.ts`)
- Types: PascalCase with '.types.ts' suffix
- API: camelCase with 'Api' suffix (e.g., `supportApi.ts`)

---

## 🧪 TESTING STRATEGY

### **Unit Tests**
```
src/features/supports/
├── components/
│   ├── SupportPanel.tsx
│   └── SupportPanel.test.tsx     # Component tests
├── hooks/
│   ├── useSupports.ts
│   └── useSupports.test.ts       # Hook tests
└── utils/
    ├── supportMetrics.ts
    └── supportMetrics.test.ts    # Utility tests
```

### **Integration Tests**
- Test feature workflows
- Test API integration
- Test state management

### **E2E Tests**
- Complete user workflows
- Design → Generate → Export

---

## 📊 BEFORE vs AFTER COMPARISON

### **Before (Current)**
```
❌ 140+ files in components/
❌ Business logic scattered
❌ Tight coupling
❌ Hard to test
❌ All algorithms exposed
❌ No clear boundaries
```

### **After (Proposed)**
```
✅ Feature-based organization
✅ Clear separation of concerns
✅ Loose coupling
✅ Easy to test
✅ Algorithms protected on backend
✅ Clear module boundaries
✅ Scalable architecture
```

---

## 🚀 IMPLEMENTATION TIMELINE

### **Week 1: Setup & Planning**
- Day 1-2: Create new folder structure
- Day 3-4: Set up shared infrastructure
- Day 5: Create API client layer

### **Week 2: Feature Migration**
- Day 1: Migrate Viewer feature
- Day 2: Migrate Baseplate feature
- Day 3: Migrate Mounting Holes
- Day 4-5: Migrate Supports (complex)

### **Week 3: Backend APIs**
- Day 1-2: Support generation API
- Day 3: Clamp placement API
- Day 4-5: Mesh processing APIs

### **Week 4: Integration**
- Day 1-3: Connect frontend to backend
- Day 4-5: Testing and bug fixes

### **Week 5: Polish**
- Day 1-2: Performance optimization
- Day 3-4: Documentation
- Day 5: Final testing

---

## 💡 QUICK WINS (Start Here)

### **Immediate Actions (Today)**

1. **Create Shared API Client**
```typescript
// src/shared/api/client.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

2. **Create Feature Template**
```
src/features/_template/
├── components/
├── api/
├── hooks/
├── types/
└── README.md
```

3. **Document Migration Rules**
- Create migration checklist
- Define code standards
- Set up linting rules

---

## ✅ SUCCESS CRITERIA

### **Architecture**
- [ ] Clear feature boundaries
- [ ] No circular dependencies
- [ ] Shared code properly abstracted
- [ ] Backend APIs for sensitive logic

### **Code Quality**
- [ ] All features independently testable
- [ ] TypeScript strict mode enabled
- [ ] ESLint passing
- [ ] No TODO comments in production code

### **Security**
- [ ] No proprietary algorithms in frontend
- [ ] API authentication required
- [ ] Rate limiting on expensive operations
- [ ] Input validation on all APIs

### **Performance**
- [ ] Initial load < 3 seconds
- [ ] API responses < 2 seconds
- [ ] 60 FPS rendering maintained
- [ ] Optimized bundle size

---

## 🎯 NEXT STEPS

1. **Review this plan** - Confirm approach
2. **Choose migration strategy** - All at once or incremental?
3. **Set up new structure** - Create folders and base files
4. **Start with one feature** - Prove the pattern works
5. **Scale to all features** - Repeat the pattern

---

**Status:** ⏳ Awaiting approval to begin reorganization  
**Estimated Effort:** 4-5 weeks  
**Risk Level:** Medium (requires careful migration)  
**Benefit:** High (clean, secure, maintainable codebase)
