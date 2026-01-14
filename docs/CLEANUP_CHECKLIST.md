# 🧹 File Cleanup Checklist
**RapidTool Fixture Application**

**Date:** January 14, 2026  
**Status:** Awaiting Approval

---

## 📋 FILES TO DELETE

### Backend Files (8 items)

#### 1. Unused Legacy Database Client
```
File: backend/src/lib/db.js
Size: 20 lines
Reason: Old postgres client, replaced by prisma.ts
Status: ❌ SAFE TO DELETE
```

#### 2. Empty Test Files
```
File: backend/test-api-endpoints.ts
Size: 0 bytes
Reason: Empty placeholder
Status: ❌ SAFE TO DELETE

File: backend/test-db-connection.ts
Size: 0 bytes
Reason: Empty placeholder
Status: ❌ SAFE TO DELETE
```

#### 3. Old Test File
```
File: backend/testdb.ts
Size: 584 bytes
Reason: Old test file, not in use
Status: ⚠️ REVIEW FIRST (has code)
Action: Check if needed, then delete or move to tests/
```

#### 4. Empty Documentation
```
File: backend/SETUP.md
Size: 0 bytes
Reason: Empty file
Status: ❌ SAFE TO DELETE
```

#### 5. Empty SQL Files
```
File: backend/check-migration-status.sql
Size: 0 bytes
Reason: Empty placeholder
Status: ❌ SAFE TO DELETE

File: backend/verify-migration.sql
Size: 0 bytes
Reason: Empty placeholder
Status: ❌ SAFE TO DELETE
```

#### 6. Duplicate Docker Compose
```
File: backend/docker-compose.yml
Size: 0 bytes
Reason: Empty duplicate (root has docker-compose.yml)
Status: ❌ SAFE TO DELETE
```

### Root Files (4 items)

#### 7. Unknown Archive
```
File: thuast.zip
Size: 22,666 bytes
Reason: Unknown archive, not referenced
Status: ⚠️ REVIEW FIRST
Action: Extract and check contents, then delete
```

#### 8. Unknown Folder
```
Folder: thuast/
Size: Unknown
Reason: Unknown folder, not referenced
Status: ⚠️ REVIEW FIRST
Action: Check contents, then delete
```

#### 9. Empty Folders
```
Folder: portal/
Size: 0 items
Reason: Empty folder
Status: ❌ SAFE TO DELETE

Folder: packages/
Size: 0 items
Reason: Empty folder
Status: ❌ SAFE TO DELETE
```

---

## 🔍 FILES TO REVIEW (Not Delete)

### Backend Database Folder
```
Folder: backend/database/
Size: 0 items
Reason: Empty but may be needed for migrations
Status: ✅ KEEP (may be used later)
```

### Backend Scripts Folder
```
Folder: backend/scripts/
Size: 0 items
Reason: Empty but good for utility scripts
Status: ✅ KEEP (will add scripts)
```

---

## 📝 DELETION COMMANDS

### Safe to Delete (No Review Needed)
```bash
# Backend files
rm backend/src/lib/db.js
rm backend/test-api-endpoints.ts
rm backend/test-db-connection.ts
rm backend/SETUP.md
rm backend/check-migration-status.sql
rm backend/verify-migration.sql
rm backend/docker-compose.yml

# Root folders
rm -rf portal/
rm -rf packages/

# Total: 9 items
```

### Review First, Then Delete
```bash
# Check testdb.ts contents first
cat backend/testdb.ts
# If not needed:
rm backend/testdb.ts

# Check thuast.zip contents first
unzip -l thuast.zip
# If not needed:
rm thuast.zip

# Check thuast/ folder first
ls -la thuast/
# If not needed:
rm -rf thuast/

# Total: 3 items
```

---

## 🎯 CLEANUP IMPACT

### Disk Space Saved
```
Estimated: ~23 KB (excluding thuast files)
With thuast: ~45 KB
```

### Benefits
- ✅ Cleaner repository
- ✅ Faster git operations
- ✅ Less confusion for developers
- ✅ Easier to navigate codebase

### Risks
- ⚠️ testdb.ts might have useful test code
- ⚠️ thuast.zip might contain important files
- ⚠️ thuast/ folder might be referenced somewhere

---

## ✅ VERIFICATION STEPS

After deletion, verify:

### 1. Backend Still Runs
```bash
cd backend
npm run dev
# Should start without errors
```

### 2. No Import Errors
```bash
# Search for references to deleted files
grep -r "db.js" backend/src/
grep -r "testdb" backend/src/
grep -r "thuast" src/
# Should return no results
```

### 3. Git Status Clean
```bash
git status
# Should show only deleted files
```

### 4. Tests Still Pass
```bash
cd backend
npm test
# Should pass (if tests exist)
```

---

## 🔄 ROLLBACK PROCEDURE

If something breaks after deletion:

```bash
# Restore all deleted files
git checkout HEAD -- backend/src/lib/db.js
git checkout HEAD -- backend/test-api-endpoints.ts
git checkout HEAD -- backend/test-db-connection.ts
git checkout HEAD -- backend/testdb.ts
git checkout HEAD -- backend/SETUP.md
git checkout HEAD -- backend/check-migration-status.sql
git checkout HEAD -- backend/verify-migration.sql
git checkout HEAD -- backend/docker-compose.yml
git checkout HEAD -- thuast.zip
git checkout HEAD -- thuast/
git checkout HEAD -- portal/
git checkout HEAD -- packages/

# Restart backend
cd backend
npm run dev
```

---

## 📊 CLEANUP SUMMARY

| Category | Count | Action |
|----------|-------|--------|
| Safe to Delete | 9 | Delete immediately |
| Review First | 3 | Check contents, then delete |
| Keep | 2 | Empty folders for future use |
| **Total to Remove** | **12** | **~45 KB saved** |

---

## 🚀 RECOMMENDED CLEANUP ORDER

### Step 1: Safe Deletions (No Risk)
```bash
# Delete obviously unused files
rm backend/src/lib/db.js
rm backend/test-api-endpoints.ts
rm backend/test-db-connection.ts
rm backend/SETUP.md
rm backend/check-migration-status.sql
rm backend/verify-migration.sql
rm backend/docker-compose.yml
rm -rf portal/
rm -rf packages/

# Commit
git add .
git commit -m "chore: Remove unused files and empty folders"
```

### Step 2: Review and Delete (Low Risk)
```bash
# Review testdb.ts
cat backend/testdb.ts
# If not needed, delete:
rm backend/testdb.ts

# Review thuast files
unzip -l thuast.zip
ls -la thuast/
# If not needed, delete:
rm thuast.zip
rm -rf thuast/

# Commit
git add .
git commit -m "chore: Remove old test files and unknown archives"
```

### Step 3: Verify Everything Works
```bash
# Test backend
cd backend
npm run dev

# Test frontend
cd ..
npm run dev

# Run tests
npm test
```

---

## 📝 APPROVAL CHECKLIST

Please confirm:

- [ ] I have reviewed the list of files to delete
- [ ] I understand which files are safe to delete
- [ ] I understand which files need review first
- [ ] I want to proceed with cleanup
- [ ] I understand the rollback procedure if needed

---

**Ready to proceed with cleanup?** 

Please approve and I'll execute the deletion commands.
