# Remove Console.log Statements Script
# Removes debug console.log statements from production code

Write-Host "🧹 Removing console.log statements..." -ForegroundColor Cyan
Write-Host ""

$removed = 0
$kept = 0

# Get all TypeScript/JavaScript files
$files = Get-ChildItem -Path "src" -Recurse -Include *.ts,*.tsx,*.js,*.jsx -ErrorAction SilentlyContinue

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Remove console.log statements (but keep console.error, console.warn)
    # Pattern: console.log(...) including multiline
    $content = $content -replace "console\.log\([^)]*\);?[\r\n]*", ""
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $removed++
        Write-Host "  ✅ Cleaned: $($file.Name)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Files cleaned: $removed" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  Note: console.error and console.warn were preserved" -ForegroundColor Yellow
