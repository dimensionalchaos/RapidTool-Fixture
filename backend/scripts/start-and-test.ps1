# ============================================
# Quick Start & Test Script
# ============================================

Write-Host "`nStarting RapidTool-Fixture Backend...`n" -ForegroundColor Cyan

# Check if server is already running
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method Get -ErrorAction Stop
    Write-Host "Server is already running (uptime: $([math]::Round($health.uptime, 2))s)" -ForegroundColor Green
    Write-Host "`nRunning tests...`n" -ForegroundColor Yellow
    & "$PSScriptRoot\test-backend.ps1"
} catch {
    Write-Host "Server not running. Please start it first:" -ForegroundColor Yellow
    Write-Host "  cd backend" -ForegroundColor Gray
    Write-Host "  npm run dev`n" -ForegroundColor Gray
    Write-Host "Then run this script again to test the API.`n" -ForegroundColor Yellow
}
