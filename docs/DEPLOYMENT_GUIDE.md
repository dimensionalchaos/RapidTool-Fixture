# 🚀 Pre-Deployment Guide
**RapidTool Fixture Application**

**Date:** January 14, 2026  
**Target:** Production Deployment on AWS + Vercel

---

## 📊 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         USERS                                │
└─────────────────────┬───────────────────────────────────────┘
                      │
         ┌────────────┴────────────┐
         │                         │
    ┌────▼─────┐            ┌─────▼────┐
    │ Frontend │            │ Backend  │
    │ (Vercel) │            │  (AWS)   │
    └────┬─────┘            └─────┬────┘
         │                        │
         │                   ┌────▼────┐
         │                   │   RDS   │
         │                   │PostgreSQL│
         │                   └─────────┘
         │                        │
         └────────────────────────┘
              (API Calls)
```

---

## 🎯 PHASE 1: INFRASTRUCTURE SETUP

### 1.1 AWS Account Setup

#### Create AWS Account
```
1. Go to https://aws.amazon.com
2. Click "Create an AWS Account"
3. Follow registration process
4. Add payment method
5. Verify phone number
```

#### Set Up IAM User (Security Best Practice)
```
1. Go to IAM Console
2. Create new user: "rapidtool-deploy"
3. Attach policies:
   - AmazonECS_FullAccess
   - AmazonRDS_FullAccess
   - AmazonS3_FullAccess
   - CloudWatchLogsFullAccess
4. Create access keys
5. Save credentials securely
```

### 1.2 AWS Services Configuration

#### A. RDS PostgreSQL Database

**Option 1: Keep Supabase (Recommended for MVP)**
```
Pros:
- Already configured
- Free tier available
- Automatic backups
- Easy to use

Cost: $0 (Free tier) or $25/month (Pro)

Action: No setup needed, continue using current DB
```

**Option 2: Migrate to AWS RDS**
```
1. Go to RDS Console
2. Create Database
   - Engine: PostgreSQL 15
   - Template: Free tier (or Production)
   - DB Instance: db.t3.micro (Free tier)
   - Storage: 20 GB
   - Enable automated backups
   - Set master password
3. Configure Security Group
   - Allow inbound on port 5432
   - From ECS security group only
4. Note connection details
5. Update DATABASE_URL in backend

Cost: $15-20/month (db.t3.micro)
```

**Recommendation:** Keep Supabase for now, migrate later if needed.

#### B. S3 Bucket for File Storage

```bash
# Create S3 bucket
1. Go to S3 Console
2. Create bucket
   - Name: rapidtool-models-production
   - Region: us-east-1 (or closest to users)
   - Block public access: OFF (for public files)
   - Versioning: Enabled
   - Encryption: Enabled (AES-256)
3. Configure CORS
4. Create IAM policy for access
5. Note bucket name

Cost: $0.023 per GB/month (~$2-5/month for 100GB)
```

**S3 CORS Configuration:**
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://your-frontend.vercel.app"],
    "ExposeHeaders": ["ETag"]
  }
]
```

#### C. ECS Cluster (Container Orchestration)

```bash
# Create ECS Cluster
1. Go to ECS Console
2. Create Cluster
   - Name: rapidtool-cluster
   - Infrastructure: AWS Fargate
   - Monitoring: Enable Container Insights
3. Create Task Definition
   - Name: rapidtool-backend
   - Launch type: Fargate
   - CPU: 0.5 vCPU
   - Memory: 1 GB
   - Container definition:
     * Name: backend
     * Image: <your-ecr-image>
     * Port: 3000
     * Environment variables
4. Create Service
   - Launch type: Fargate
   - Desired tasks: 1 (or 2 for HA)
   - Load balancer: Application Load Balancer

Cost: $15-30/month (1 task) or $30-60/month (2 tasks)
```

#### D. Application Load Balancer

```bash
1. Go to EC2 → Load Balancers
2. Create Application Load Balancer
   - Name: rapidtool-alb
   - Scheme: Internet-facing
   - IP address type: IPv4
   - Listeners: HTTP (80), HTTPS (443)
   - Availability Zones: Select 2+
3. Configure Security Groups
   - Allow HTTP (80) from anywhere
   - Allow HTTPS (443) from anywhere
4. Configure Target Group
   - Target type: IP
   - Protocol: HTTP
   - Port: 3000
   - Health check: /api/health
5. Register ECS tasks as targets

Cost: $16-20/month
```

#### E. CloudFront CDN (Optional)

```bash
1. Go to CloudFront Console
2. Create Distribution
   - Origin: ALB DNS name
   - Viewer protocol: Redirect HTTP to HTTPS
   - Allowed HTTP methods: All
   - Cache policy: CachingOptimized
   - Origin request policy: AllViewer
3. Configure custom domain (optional)
4. Request SSL certificate (free)

Cost: $1-10/month (depending on traffic)
```

---

## 🎯 PHASE 2: DOCKER SETUP

### 2.1 Backend Dockerfile (Review & Update)

**Current Dockerfile:**
```dockerfile
# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "start"]
```

**Improved Multi-Stage Dockerfile:**
```dockerfile
# backend/Dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/index.js"]
```

### 2.2 Frontend Dockerfile (Create New)

```dockerfile
# Dockerfile (root)
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Stage 2: Production (Nginx)
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### 2.3 Docker Compose (Complete)

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - AWS_REGION=${AWS_REGION}
      - S3_BUCKET=${S3_BUCKET}
    depends_on:
      - postgres
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 3s
      retries: 3

  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=rapidtool
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

volumes:
  postgres_data:
```

---

## 🎯 PHASE 3: CI/CD SETUP (GitHub Actions)

### 3.1 Backend CI/CD

```yaml
# .github/workflows/backend-deploy.yml
name: Deploy Backend to AWS ECS

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
      - '.github/workflows/backend-deploy.yml'

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: rapidtool-backend
  ECS_SERVICE: rapidtool-backend-service
  ECS_CLUSTER: rapidtool-cluster
  ECS_TASK_DEFINITION: rapidtool-backend

jobs:
  deploy:
    name: Deploy Backend
    runs-on: ubuntu-latest

    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}

    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v1

    - name: Build, tag, and push image to Amazon ECR
      id: build-image
      env:
        ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        IMAGE_TAG: ${{ github.sha }}
      run: |
        cd backend
        docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
        docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
        echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT

    - name: Download task definition
      run: |
        aws ecs describe-task-definition \
          --task-definition ${{ env.ECS_TASK_DEFINITION }} \
          --query taskDefinition > task-definition.json

    - name: Fill in the new image ID in the Amazon ECS task definition
      id: task-def
      uses: aws-actions/amazon-ecs-render-task-definition@v1
      with:
        task-definition: task-definition.json
        container-name: backend
        image: ${{ steps.build-image.outputs.image }}

    - name: Deploy Amazon ECS task definition
      uses: aws-actions/amazon-ecs-deploy-task-definition@v1
      with:
        task-definition: ${{ steps.task-def.outputs.task-definition }}
        service: ${{ env.ECS_SERVICE }}
        cluster: ${{ env.ECS_CLUSTER }}
        wait-for-service-stability: true

    - name: Run database migrations
      run: |
        # SSH into ECS task and run migrations
        # Or use AWS Systems Manager Session Manager
        echo "Migrations should be run manually or via separate job"
```

### 3.2 Frontend CI/CD (Vercel)

**Option A: Vercel Auto-Deploy (Recommended)**
```
1. Go to https://vercel.com
2. Sign up with GitHub
3. Import repository
4. Configure:
   - Framework: Vite
   - Build command: npm run build
   - Output directory: dist
   - Environment variables:
     * VITE_API_URL=https://api.rapidtool.com
5. Deploy

Cost: FREE (Hobby) or $20/month (Pro)
```

**Option B: GitHub Actions to Vercel**
```yaml
# .github/workflows/frontend-deploy.yml
name: Deploy Frontend to Vercel

on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'public/**'
      - 'package.json'
      - '.github/workflows/frontend-deploy.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Vercel CLI
        run: npm install --global vercel@latest
      
      - name: Pull Vercel Environment Information
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
      
      - name: Build Project Artifacts
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
      
      - name: Deploy Project Artifacts to Vercel
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```

### 3.3 CI Workflow (Tests & Linting)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  backend-tests:
    name: Backend Tests
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: backend/package-lock.json
    
    - name: Install dependencies
      run: |
        cd backend
        npm ci
    
    - name: Run linter
      run: |
        cd backend
        npm run lint
    
    - name: Run tests
      run: |
        cd backend
        npm test
    
    - name: Type check
      run: |
        cd backend
        npm run type-check

  frontend-tests:
    name: Frontend Tests
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linter
      run: npm run lint
    
    - name: Run tests
      run: npm test
    
    - name: Build
      run: npm run build
```

---

## 🎯 PHASE 4: EMAIL SERVICE INTEGRATION

### 4.1 SendGrid Setup (Recommended)

```bash
# 1. Sign up at https://sendgrid.com
# 2. Verify email address
# 3. Create API key
# 4. Install SDK

cd backend
npm install @sendgrid/mail
```

### 4.2 Update Email Service

```typescript
// backend/src/services/email.service.ts
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendVerificationEmail(
  to: string,
  token: string
): Promise<void> {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  
  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL!,
    subject: 'Verify your RapidTool account',
    html: `
      <h1>Welcome to RapidTool!</h1>
      <p>Click the link below to verify your email:</p>
      <a href="${verificationUrl}">Verify Email</a>
      <p>This link expires in 24 hours.</p>
    `,
  };
  
  await sgMail.send(msg);
}
```

### 4.3 Environment Variables

```bash
# backend/.env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@rapidtool.com
FRONTEND_URL=https://rapidtool.vercel.app
```

---

## 🎯 PHASE 5: MONITORING & LOGGING

### 5.1 Sentry Setup (Error Tracking)

```bash
# Install Sentry
npm install @sentry/node @sentry/react
```

**Backend Integration:**
```typescript
// backend/src/index.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

// Error handler
app.use(Sentry.Handlers.errorHandler());
```

**Frontend Integration:**
```typescript
// src/main.tsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0,
});
```

### 5.2 CloudWatch Logs

```bash
# Already configured with ECS
# View logs in AWS CloudWatch Console
# Set up log retention: 30 days
# Create alarms for errors
```

### 5.3 Uptime Monitoring

```bash
# Use UptimeRobot (Free)
1. Go to https://uptimerobot.com
2. Add monitors:
   - Backend API: https://api.rapidtool.com/api/health
   - Frontend: https://rapidtool.vercel.app
3. Set alert contacts (email, SMS)
4. Check interval: 5 minutes

Cost: FREE
```

---

## 🎯 PHASE 6: SECURITY HARDENING

### 6.1 Environment Variables

```bash
# backend/.env.production
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db
DIRECT_URL=postgresql://user:pass@host:5432/db

# JWT
JWT_SECRET=<generate-strong-secret>
JWT_REFRESH_SECRET=<generate-strong-secret>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# AWS
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
AWS_REGION=us-east-1
S3_BUCKET=rapidtool-models-production

# Email
SENDGRID_API_KEY=<your-key>
SENDGRID_FROM_EMAIL=noreply@rapidtool.com

# Frontend
FRONTEND_URL=https://rapidtool.vercel.app
CORS_ORIGIN=https://rapidtool.vercel.app

# Monitoring
SENTRY_DSN=<your-dsn>
```

### 6.2 Secrets Management

```bash
# Store secrets in AWS Secrets Manager
1. Go to AWS Secrets Manager
2. Store new secret
   - Secret type: Other
   - Key/value pairs:
     * JWT_SECRET
     * JWT_REFRESH_SECRET
     * DATABASE_URL
     * SENDGRID_API_KEY
3. Note secret ARN
4. Update ECS task definition to use secrets

Cost: $0.40/month per secret
```

### 6.3 SSL/TLS Certificates

```bash
# AWS Certificate Manager (Free)
1. Go to ACM Console
2. Request certificate
   - Domain: api.rapidtool.com
   - Validation: DNS
3. Add CNAME records to DNS
4. Wait for validation
5. Attach to ALB

Cost: FREE
```

---

## 💰 TOTAL COST ESTIMATE

### Minimal Setup (MVP)
```
Backend:
- ECS Fargate (1 task)          : $15-30
- Supabase (Free tier)           : $0
- S3 Storage (10GB)              : $0.23
- Application Load Balancer      : $16
Total Backend                    : $31-46/month

Frontend:
- Vercel (Free tier)             : $0

Email:
- SendGrid (Free tier)           : $0

Monitoring:
- Sentry (Free tier)             : $0
- UptimeRobot (Free tier)        : $0

TOTAL MONTHLY COST               : $31-46/month
```

### Production Setup
```
Backend:
- ECS Fargate (2 tasks)          : $60-120
- RDS PostgreSQL (db.t3.small)   : $30-40
- S3 Storage (100GB)             : $2.30
- Application Load Balancer      : $16
- CloudFront CDN                 : $10
Total Backend                    : $118-188/month

Frontend:
- Vercel Pro                     : $20

Email:
- SendGrid (40k emails)          : $15

Monitoring:
- Sentry Team                    : $26
- UptimeRobot Pro                : $7

TOTAL MONTHLY COST               : $186-256/month
```

---

## 📋 DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] All critical bugs fixed
- [ ] Database migration completed
- [ ] Rate limiting implemented
- [ ] Input validation added
- [ ] CORS configured for production
- [ ] Environment variables set
- [ ] Secrets stored securely
- [ ] Docker images built and tested
- [ ] CI/CD pipelines configured

### Infrastructure
- [ ] AWS account created
- [ ] IAM user configured
- [ ] RDS or Supabase ready
- [ ] S3 bucket created
- [ ] ECS cluster created
- [ ] ALB configured
- [ ] SSL certificates issued
- [ ] DNS records configured

### Application
- [ ] Backend deployed to ECS
- [ ] Frontend deployed to Vercel
- [ ] Database migrations run
- [ ] Email service configured
- [ ] Monitoring set up
- [ ] Error tracking enabled
- [ ] Uptime monitoring active

### Testing
- [ ] Health checks passing
- [ ] API endpoints working
- [ ] Frontend loads correctly
- [ ] Authentication working
- [ ] File upload working
- [ ] Email sending working
- [ ] Error tracking working

### Documentation
- [ ] API documentation updated
- [ ] Deployment guide created
- [ ] Runbook for common issues
- [ ] Contact information for support

---

## 🚨 ROLLBACK PLAN

### If Deployment Fails

**Backend:**
```bash
# Revert to previous ECS task definition
aws ecs update-service \
  --cluster rapidtool-cluster \
  --service rapidtool-backend-service \
  --task-definition rapidtool-backend:PREVIOUS_VERSION
```

**Frontend:**
```bash
# Revert Vercel deployment
vercel rollback
```

**Database:**
```bash
# Restore from backup
# In Supabase: Go to Database → Backups → Restore
# In RDS: Restore from snapshot
```

---

**Ready to deploy!** 🚀

Follow this guide step by step for a successful production deployment.
