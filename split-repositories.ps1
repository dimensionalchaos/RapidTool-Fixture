# RapidTool-Fixture Repository Split Script
# This script automates the process of splitting the monorepo into separate frontend and backend repositories

param(
    [string]$TargetDir = "c:\programs",
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RapidTool-Fixture Repository Split Tool" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$SourceDir = "c:\programs\RapidTool-Fixture"
$FrontendDir = Join-Path $TargetDir "rapidtool-fixture-frontend"
$BackendDir = Join-Path $TargetDir "rapidtool-fixture-backend"

if ($DryRun) {
    Write-Host "[DRY RUN MODE] No files will be copied" -ForegroundColor Yellow
    Write-Host ""
}

# Function to copy files with progress
function Copy-WithProgress {
    param(
        [string]$Source,
        [string]$Destination,
        [string]$Description
    )
    
    Write-Host "📁 $Description" -ForegroundColor Green
    Write-Host "   From: $Source" -ForegroundColor Gray
    Write-Host "   To:   $Destination" -ForegroundColor Gray
    
    if (-not $DryRun) {
        if (Test-Path $Source) {
            Copy-Item -Path $Source -Destination $Destination -Recurse -Force
            Write-Host "   ✓ Copied successfully" -ForegroundColor Green
        } else {
            Write-Host "   ⚠ Source not found, skipping" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   [DRY RUN] Would copy" -ForegroundColor Yellow
    }
    Write-Host ""
}

# Step 1: Create directories
Write-Host "Step 1: Creating new repository directories..." -ForegroundColor Cyan
Write-Host ""

if (-not $DryRun) {
    if (-not (Test-Path $FrontendDir)) {
        New-Item -ItemType Directory -Path $FrontendDir | Out-Null
        Write-Host "✓ Created: $FrontendDir" -ForegroundColor Green
    } else {
        Write-Host "⚠ Directory already exists: $FrontendDir" -ForegroundColor Yellow
    }
    
    if (-not (Test-Path $BackendDir)) {
        New-Item -ItemType Directory -Path $BackendDir | Out-Null
        Write-Host "✓ Created: $BackendDir" -ForegroundColor Green
    } else {
        Write-Host "⚠ Directory already exists: $BackendDir" -ForegroundColor Yellow
    }
} else {
    Write-Host "[DRY RUN] Would create: $FrontendDir" -ForegroundColor Yellow
    Write-Host "[DRY RUN] Would create: $BackendDir" -ForegroundColor Yellow
}
Write-Host ""

# Step 2: Copy Frontend Files
Write-Host "Step 2: Copying Frontend files..." -ForegroundColor Cyan
Write-Host ""

$FrontendFiles = @(
    @{Source = "src"; Dest = "src"; Desc = "Frontend source code"},
    @{Source = "public"; Dest = "public"; Desc = "Public assets"},
    @{Source = "index.html"; Dest = "index.html"; Desc = "Entry HTML"},
    @{Source = "package.json"; Dest = "package.json"; Desc = "Package configuration"},
    @{Source = "package-lock.json"; Dest = "package-lock.json"; Desc = "Package lock file"},
    @{Source = "vite.config.ts"; Dest = "vite.config.ts"; Desc = "Vite configuration"},
    @{Source = "tailwind.config.ts"; Dest = "tailwind.config.ts"; Desc = "Tailwind configuration"},
    @{Source = "tsconfig.json"; Dest = "tsconfig.json"; Desc = "TypeScript configuration"},
    @{Source = "tsconfig.app.json"; Dest = "tsconfig.app.json"; Desc = "App TypeScript config"},
    @{Source = "tsconfig.node.json"; Dest = "tsconfig.node.json"; Desc = "Node TypeScript config"},
    @{Source = "postcss.config.js"; Dest = "postcss.config.js"; Desc = "PostCSS configuration"},
    @{Source = "components.json"; Dest = "components.json"; Desc = "shadcn/ui configuration"},
    @{Source = "eslint.config.js"; Dest = "eslint.config.js"; Desc = "ESLint configuration"},
    @{Source = ".env.example"; Dest = ".env.example"; Desc = "Environment template"}
)

foreach ($file in $FrontendFiles) {
    $sourcePath = Join-Path $SourceDir $file.Source
    $destPath = Join-Path $FrontendDir $file.Dest
    Copy-WithProgress -Source $sourcePath -Destination $destPath -Description $file.Desc
}

# Step 3: Copy Backend Files
Write-Host "Step 3: Copying Backend files..." -ForegroundColor Cyan
Write-Host ""

$BackendFiles = @(
    @{Source = "backend\src"; Dest = "src"; Desc = "Backend source code"},
    @{Source = "backend\prisma"; Dest = "prisma"; Desc = "Prisma schema and migrations"},
    @{Source = "backend\package.json"; Dest = "package.json"; Desc = "Package configuration"},
    @{Source = "backend\package-lock.json"; Dest = "package-lock.json"; Desc = "Package lock file"},
    @{Source = "backend\tsconfig.json"; Dest = "tsconfig.json"; Desc = "TypeScript configuration"},
    @{Source = "backend\.env.example"; Dest = ".env.example"; Desc = "Environment template"}
)

foreach ($file in $BackendFiles) {
    $sourcePath = Join-Path $SourceDir $file.Source
    $destPath = Join-Path $BackendDir $file.Dest
    Copy-WithProgress -Source $sourcePath -Destination $destPath -Description $file.Desc
}

# Step 4: Create .gitignore files
Write-Host "Step 4: Creating .gitignore files..." -ForegroundColor Cyan
Write-Host ""

$FrontendGitignore = @"
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
"@

$BackendGitignore = @"
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

# Uploads
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
"@

if (-not $DryRun) {
    Set-Content -Path (Join-Path $FrontendDir ".gitignore") -Value $FrontendGitignore
    Write-Host "✓ Created frontend .gitignore" -ForegroundColor Green
    
    Set-Content -Path (Join-Path $BackendDir ".gitignore") -Value $BackendGitignore
    Write-Host "✓ Created backend .gitignore" -ForegroundColor Green
} else {
    Write-Host "[DRY RUN] Would create .gitignore files" -ForegroundColor Yellow
}
Write-Host ""

# Step 5: Create environment files
Write-Host "Step 5: Creating environment files..." -ForegroundColor Cyan
Write-Host ""

$FrontendEnv = @"
# Backend API URL
VITE_API_URL=http://localhost:3000
VITE_API_BASE_URL=http://localhost:3000/api

# For production, update these:
# VITE_API_URL=https://api.rapidtool.example.com
# VITE_API_BASE_URL=https://api.rapidtool.example.com/api
"@

$BackendEnv = @"
# Server
PORT=3000
NODE_ENV=development

# Database (Update with your credentials)
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"
DIRECT_URL="postgresql://user:password@host:5432/database?schema=public"

# JWT Secrets (Generate new secrets for production!)
JWT_ACCESS_SECRET=your-access-secret-here-change-this
JWT_REFRESH_SECRET=your-refresh-secret-here-change-this

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:8080
CORS_ORIGIN=http://localhost:8080

# Email Configuration (Optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
"@

if (-not $DryRun) {
    Set-Content -Path (Join-Path $FrontendDir ".env.example") -Value $FrontendEnv -Force
    Write-Host "✓ Created frontend .env.example" -ForegroundColor Green
    
    Set-Content -Path (Join-Path $BackendDir ".env.example") -Value $BackendEnv -Force
    Write-Host "✓ Created backend .env.example" -ForegroundColor Green
} else {
    Write-Host "[DRY RUN] Would create .env.example files" -ForegroundColor Yellow
}
Write-Host ""

# Step 6: Create README files
Write-Host "Step 6: Creating README files..." -ForegroundColor Cyan
Write-Host ""

$FrontendReadme = @"
# RapidTool-Fixture Frontend

React + Vite + Three.js application for automated 3D fixture design.

## Quick Start

``````bash
npm install
cp .env.example .env
# Edit .env with your backend API URL
npm run dev
``````

The application will be available at http://localhost:8080

## Environment Variables

- ``VITE_API_URL`` - Backend API URL (default: http://localhost:3000)
- ``VITE_API_BASE_URL`` - Backend API base URL (default: http://localhost:3000/api)

## Available Scripts

- ``npm run dev`` - Start development server
- ``npm run build`` - Build for production
- ``npm run preview`` - Preview production build
- ``npm run lint`` - Run ESLint

## Tech Stack

- React 18.3
- TypeScript
- Vite
- Three.js + React Three Fiber
- Tailwind CSS
- shadcn/ui
- Zustand (State Management)
- React Router

## Project Structure

``````
src/
├── components/     # Reusable UI components
├── features/       # Feature-specific components
├── pages/          # Page components
├── services/       # API services
├── stores/         # Zustand stores
├── hooks/          # Custom React hooks
├── lib/            # Utility libraries
└── utils/          # Helper functions
``````

## Related Repositories

- Backend: [rapidtool-fixture-backend](../rapidtool-fixture-backend)

## License

Proprietary - See PATENT_DOCUMENTATION.md for IP information.
"@

$BackendReadme = @"
# RapidTool-Fixture Backend

Node.js + Express + Prisma API for RapidTool-Fixture application.

## Quick Start

``````bash
npm install
cp .env.example .env
# Edit .env with your database credentials and secrets
npx prisma generate
npx prisma migrate deploy
npm run dev
``````

The API will be available at http://localhost:3000

## Environment Variables

See ``.env.example`` for all required variables. **Important:** Generate new JWT secrets for production!

## Available Scripts

- ``npm run dev`` - Start development server with hot reload
- ``npm run build`` - Build for production
- ``npm start`` - Start production server
- ``npx prisma generate`` - Generate Prisma client
- ``npx prisma migrate dev`` - Create and apply migrations
- ``npx prisma migrate deploy`` - Deploy migrations (production)
- ``npx prisma studio`` - Open Prisma Studio

## Tech Stack

- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL (Supabase)
- JWT Authentication
- Zod (Validation)
- Nodemailer (Email)

## Project Structure

``````
src/
├── config/         # Configuration files
├── controllers/    # Route controllers
├── middleware/     # Express middleware
├── routes/         # API routes
├── services/       # Business logic
├── utils/          # Helper functions
└── validators/     # Request validators
``````

## API Endpoints

- ``POST /api/auth/register`` - User registration
- ``POST /api/auth/login`` - User login
- ``POST /api/auth/refresh`` - Refresh access token
- ``POST /api/models/import`` - Import 3D model
- ``POST /api/exports/create`` - Export fixture
- ``GET /api/license/me`` - Get user license info

See full API documentation in the docs folder.

## Database Migrations

``````bash
# Create new migration
npx prisma migrate dev --name migration_name

# Deploy migrations to production
npx prisma migrate deploy

# Reset database (development only!)
npx prisma migrate reset
``````

## Related Repositories

- Frontend: [rapidtool-fixture-frontend](../rapidtool-fixture-frontend)

## License

Proprietary - See PATENT_DOCUMENTATION.md for IP information.
"@

if (-not $DryRun) {
    Set-Content -Path (Join-Path $FrontendDir "README.md") -Value $FrontendReadme
    Write-Host "✓ Created frontend README.md" -ForegroundColor Green
    
    Set-Content -Path (Join-Path $BackendDir "README.md") -Value $BackendReadme
    Write-Host "✓ Created backend README.md" -ForegroundColor Green
} else {
    Write-Host "[DRY RUN] Would create README.md files" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "DRY RUN COMPLETE - No files were copied" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To perform the actual split, run:" -ForegroundColor White
    Write-Host "  .\split-repositories.ps1" -ForegroundColor Cyan
} else {
    Write-Host "✓ Repository split complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Frontend repository: $FrontendDir" -ForegroundColor White
    Write-Host "Backend repository:  $BackendDir" -ForegroundColor White
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Review the copied files in both directories" -ForegroundColor White
    Write-Host "2. Copy .env.example to .env in both repos and configure" -ForegroundColor White
    Write-Host "3. Install dependencies:" -ForegroundColor White
    Write-Host "   cd $FrontendDir && npm install" -ForegroundColor Gray
    Write-Host "   cd $BackendDir && npm install" -ForegroundColor Gray
    Write-Host "4. Generate Prisma client:" -ForegroundColor White
    Write-Host "   cd $BackendDir && npx prisma generate" -ForegroundColor Gray
    Write-Host "5. Initialize git repositories:" -ForegroundColor White
    Write-Host "   cd $FrontendDir && git init" -ForegroundColor Gray
    Write-Host "   cd $BackendDir && git init" -ForegroundColor Gray
    Write-Host "6. Test both applications" -ForegroundColor White
}

Write-Host ""
Write-Host "For detailed instructions, see:" -ForegroundColor Cyan
Write-Host "  .agent\workflows\repository-split-guide.md" -ForegroundColor White
Write-Host ""
