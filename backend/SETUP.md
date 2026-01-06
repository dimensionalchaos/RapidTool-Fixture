# Backend Setup Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (Supabase recommended)
- npm or yarn package manager

## Initial Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `backend/.env` and configure the following:

#### Database Configuration (Supabase)

Get your database credentials from Supabase Dashboard → Settings → Database:

**For IPv4 networks (recommended):**
```env
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

Replace:
- `[PROJECT-REF]` - Your Supabase project reference (e.g., `rtbzttowhfkvabyusfox`)
- `[PASSWORD]` - Your database password

**Example:**
```env
DATABASE_URL="postgresql://postgres.rtbzttowhfkvabyusfox:your-password@aws-1-ap-south-1.pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres:your-password@db.rtbzttowhfkvabyusfox.supabase.co:5432/postgres"
```

#### JWT Secrets

Generate secure secrets:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Update in `.env`:
```env
JWT_ACCESS_SECRET=your-generated-secret-here
JWT_REFRESH_SECRET=your-generated-secret-here
```

#### CORS Configuration

```env
CORS_ORIGIN=http://localhost:8080
```

For multiple origins, use comma-separated values:
```env
CORS_ORIGIN=http://localhost:8080,http://localhost:8081,http://localhost:5173
```

### 3. Database Setup

Generate Prisma client:

```bash
npx prisma generate
```

Run database migrations:

```bash
npx prisma migrate deploy
```

### 4. Start Development Server

```bash
npm run dev
```

Backend will start on `http://localhost:3000`

## Verification

Test the backend is running:

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{"status":"ok","uptime":123.456}
```

## Common Issues

### Port Already in Use

If you see `EADDRINUSE: address already in use :::3000`:

**Windows:**
```powershell
netstat -ano | findstr :3000
taskkill /F /PID [PID_NUMBER]
```

**Linux/Mac:**
```bash
lsof -ti:3000 | xargs kill -9
```

### Database Connection Failed

1. Verify Supabase project is active (not paused)
2. Check database credentials are correct
3. Ensure you're using Transaction Pooler for IPv4 networks
4. Test connection: `npx prisma db pull`

### Prisma Client Not Generated

```bash
npx prisma generate
```

## Environment Variables Reference

See `backend/.env.example` for complete list of required and optional environment variables.

### Required Variables

- `DATABASE_URL` - PostgreSQL connection string
- `DIRECT_URL` - Direct PostgreSQL connection (for migrations)
- `JWT_ACCESS_SECRET` - JWT access token secret
- `JWT_REFRESH_SECRET` - JWT refresh token secret

### Optional Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode (development/production)
- `CORS_ORIGIN` - Allowed CORS origins
- Email configuration (SMTP)
- Rate limiting settings
- Security settings

## Security Notes

⚠️ **NEVER commit `.env` files to git!**

- `.env` files contain sensitive credentials
- Only commit `.env.example` with placeholder values
- Each developer should create their own `.env` file
- Use different credentials for development and production

## Next Steps

After backend setup:
1. Start the frontend development server
2. Test authentication endpoints
3. Verify database connectivity
4. Check CORS configuration
