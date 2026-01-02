# ============================================
# Deployment Cleanup Script
# ============================================
# Removes test files, duplicates, and prepares for production

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deployment Cleanup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$issuesFound = 0
$issuesFixed = 0

# ============================================
# 1. Remove Test Files
# ============================================
Write-Host "1. Removing test files..." -ForegroundColor Yellow

$testFiles = @(
    "backend\test-email.js",
    "backend\test-api.ps1",
    "backend\test-backend.ps1",
    "backend\start-and-test.ps1"
)

foreach ($file in $testFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "   ✅ Removed: $file" -ForegroundColor Green
        $issuesFixed++
    }
}

# ============================================
# 2. Remove Duplicate Documentation
# ============================================
Write-Host "`n2. Checking for duplicate documentation..." -ForegroundColor Yellow

$duplicateDocs = @(
    "SETUP_COMPLETE.md"  # Keep in docs/ only
)

foreach ($doc in $duplicateDocs) {
    if (Test-Path $doc) {
        $docsVersion = "docs\$doc"
        if (Test-Path $docsVersion) {
            Remove-Item $doc -Force
            Write-Host "   ✅ Removed duplicate: $doc (kept in docs/)" -ForegroundColor Green
            $issuesFixed++
        }
    }
}

# ============================================
# 3. Check .gitignore
# ============================================
Write-Host "`n3. Checking .gitignore configuration..." -ForegroundColor Yellow

if (Test-Path ".gitignore") {
    $gitignoreContent = Get-Content .gitignore -Raw
    
    $requiredEntries = @(".env", "backend/.env", "*.log")
    $missingEntries = @()
    
    foreach ($entry in $requiredEntries) {
        if ($gitignoreContent -notmatch [regex]::Escape($entry)) {
            $missingEntries += $entry
            $issuesFound++
        }
    }
    
    if ($missingEntries.Count -gt 0) {
        Write-Host "   ⚠️  Missing entries in .gitignore:" -ForegroundColor Red
        foreach ($entry in $missingEntries) {
            Write-Host "      - $entry" -ForegroundColor Red
        }
    } else {
        Write-Host "   ✅ .gitignore properly configured" -ForegroundColor Green
    }
} else {
    Write-Host "   ❌ .gitignore file not found!" -ForegroundColor Red
    $issuesFound++
}

# ============================================
# 4. Check for .env.example files
# ============================================
Write-Host "`n4. Checking .env.example files..." -ForegroundColor Yellow

if (-not (Test-Path "backend\.env.example")) {
    Write-Host "   ⚠️  backend/.env.example missing - should be created" -ForegroundColor Red
    $issuesFound++
} else {
    Write-Host "   ✅ backend/.env.example exists" -ForegroundColor Green
}

if (-not (Test-Path ".env.example")) {
    Write-Host "   ⚠️  .env.example missing - should be created" -ForegroundColor Red
    $issuesFound++
} else {
    Write-Host "   ✅ .env.example exists" -ForegroundColor Green
}

# ============================================
# 5. Check JWT Secrets
# ============================================
Write-Host "`n5. Checking JWT secrets..." -ForegroundColor Yellow

if (Test-Path "backend\.env") {
    $envContent = Get-Content "backend\.env" -Raw
    
    if ($envContent -match "your-super-secret") {
        Write-Host "   ❌ CRITICAL: Default JWT secrets detected!" -ForegroundColor Red
        Write-Host "      Generate new secrets with:" -ForegroundColor Yellow
        Write-Host "      node -e `"console.log(require('crypto').randomBytes(64).toString('hex'))`"" -ForegroundColor Cyan
        $issuesFound++
    } else {
        Write-Host "   ✅ JWT secrets appear customized" -ForegroundColor Green
    }
} else {
    Write-Host "   ⚠️  backend/.env not found" -ForegroundColor Red
    $issuesFound++
}

# ============================================
# 6. Check for console.log statements
# ============================================
Write-Host "`n6. Scanning for console.log statements..." -ForegroundColor Yellow

$consoleLogCount = 0
$files = Get-ChildItem -Path "src" -Recurse -Include *.ts,*.tsx,*.js,*.jsx -ErrorAction SilentlyContinue

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $matches = [regex]::Matches($content, "console\.log")
    $consoleLogCount += $matches.Count
}

if ($consoleLogCount -gt 0) {
    Write-Host "   ⚠️  Found $consoleLogCount console.log statements" -ForegroundColor Yellow
    Write-Host "      Consider removing debug logs before production" -ForegroundColor Yellow
    $issuesFound++
} else {
    Write-Host "   ✅ No console.log statements found" -ForegroundColor Green
}

# ============================================
# 7. Check empty files
# ============================================
Write-Host "`n7. Checking for empty files..." -ForegroundColor Yellow

$emptyFiles = Get-ChildItem -Path . -Recurse -File -ErrorAction SilentlyContinue | 
    Where-Object { $_.Length -eq 0 -and $_.Name -notmatch "^\.git" }

if ($emptyFiles.Count -gt 0) {
    Write-Host "   ⚠️  Found $($emptyFiles.Count) empty files:" -ForegroundColor Yellow
    foreach ($file in $emptyFiles | Select-Object -First 5) {
        Write-Host "      - $($file.FullName)" -ForegroundColor Yellow
    }
    $issuesFound++
} else {
    Write-Host "   ✅ No empty files found" -ForegroundColor Green
}

# ============================================
# Summary
# ============================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Cleanup Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Issues Fixed:  $issuesFixed" -ForegroundColor Green
Write-Host "Issues Found:  $issuesFound" -ForegroundColor $(if ($issuesFound -gt 0) { "Yellow" } else { "Green" })
Write-Host ""

if ($issuesFound -gt 0) {
    Write-Host "⚠️  Please review and fix the issues listed above" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Review DEPLOYMENT_AUDIT_REPORT.md" -ForegroundColor White
    Write-Host "2. Review DEPLOYMENT_FIXES.md" -ForegroundColor White
    Write-Host "3. Fix critical security issues" -ForegroundColor White
    Write-Host "4. Run tests before deployment" -ForegroundColor White
} else {
    Write-Host "✅ All checks passed! Ready for deployment" -ForegroundColor Green
}

Write-Host ""
