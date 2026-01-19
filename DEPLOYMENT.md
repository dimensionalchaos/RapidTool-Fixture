# Frontend Deployment Guide - RapidTool Fixture

## 🚀 Deployment Platform: Vercel (Recommended)

### Prerequisites
- GitHub repository connected to Vercel
- Custom domain: `fixtures.appliedadditive.com`

---

## 📋 Deployment Steps

### 1. **Push Code to GitHub**

Make sure all changes are committed and pushed:
```bash
cd c:\programs\RapidTool-Fixture
git add .
git commit -m "Configure production environment"
git push origin main
```

---

### 2. **Deploy to Vercel**

#### Option A: Using Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

5. **Add Environment Variables:**
   Click "Environment Variables" and add:
   ```
   VITE_API_URL=https://rapi.appliedadditive.com
   VITE_APP_URL=https://fixtures.appliedadditive.com
   NODE_ENV=production
   ```

6. Click **"Deploy"**

#### Option B: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

---

### 3. **Add Custom Domain**

1. In Vercel Dashboard → Your Project → Settings → Domains
2. Add domain: `fixtures.appliedadditive.com`
3. Vercel will show DNS configuration

---

### 4. **Configure DNS in Hostinger**

Add CNAME record in Hostinger:

```
Type:  CNAME
Name:  fixtures
Value: cname.vercel-dns.com
TTL:   3600
```

**Alternative (if Vercel shows A records):**
```
Type:  A
Name:  fixtures
Value: 76.76.21.21 (Vercel's IP)
TTL:   3600
```

---

## 🔧 Configuration Files

### `vercel.json`
- ✅ Configures SPA routing (all routes → index.html)
- ✅ Sets cache headers for assets
- ✅ Defines build settings

### `.npmrc`
- ✅ Ensures devDependencies are installed (needed for Vite)
- ✅ Uses legacy peer deps to avoid conflicts

### `package.json`
- ✅ Build script uses `npx vite build`
- ✅ Works even if vite is in devDependencies

### `.env`
- ✅ Contains all production environment variables
- ✅ Points to `rapi.appliedadditive.com` for API

---

## 🧪 Testing After Deployment

### 1. **Check Build Logs**
- Go to Vercel Dashboard → Deployments
- Click on latest deployment
- Check build logs for errors

### 2. **Test the Site**
```bash
# Check if site is live
curl https://fixtures.appliedadditive.com

# Check if API connection works
# Open browser console and check network tab
```

### 3. **Test Functionality**
- [ ] Site loads at `https://fixtures.appliedadditive.com`
- [ ] SSL certificate is active (green padlock)
- [ ] Login/Register works
- [ ] API calls go to `https://rapi.appliedadditive.com`
- [ ] No CORS errors in console
- [ ] Cookies are being set correctly

---

## 🐛 Troubleshooting

### Error: "vite: command not found"

**Solution:** Already fixed! The build script now uses `npx vite build`

**If still failing:**
1. Check `.npmrc` exists with `production=false`
2. Verify Vercel is running `npm install` (not `npm ci --production`)
3. Check build logs in Vercel dashboard

---

### Error: "Module not found" or Import Errors

**Solution:**
```bash
# Locally, clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

Then push changes and redeploy.

---

### CORS Errors

**Solution:**
1. Verify backend CORS_ORIGIN includes `https://fixtures.appliedadditive.com`
2. Check Railway environment variables
3. Restart Railway deployment

---

### 404 on Routes (e.g., /app/fixture)

**Solution:** Already fixed! `vercel.json` includes SPA rewrites.

All routes are rewritten to `/index.html` so React Router can handle them.

---

## 🔄 Redeployment

### Automatic Deployment
Vercel automatically redeploys when you push to GitHub:
```bash
git add .
git commit -m "Update feature"
git push origin main
```

### Manual Deployment
```bash
vercel --prod
```

---

## 📊 Environment Variables Reference

| Variable | Value | Purpose |
|----------|-------|---------|
| `VITE_API_URL` | `https://rapi.appliedadditive.com` | Backend API endpoint |
| `VITE_APP_URL` | `https://fixtures.appliedadditive.com` | Frontend URL |
| `NODE_ENV` | `production` | Environment mode |
| `VITE_API_TIMEOUT` | `30000` | API timeout (ms) |

---

## ✅ Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Vercel project created and connected
- [ ] Environment variables added in Vercel
- [ ] Custom domain added in Vercel
- [ ] DNS configured in Hostinger
- [ ] DNS propagated (check at whatsmydns.net)
- [ ] SSL certificate active
- [ ] Build successful
- [ ] Site accessible at custom domain
- [ ] API calls working
- [ ] Authentication working
- [ ] No console errors

---

## 🎯 Final URLs

- **Frontend:** https://fixtures.appliedadditive.com
- **Backend API:** https://rapi.appliedadditive.com
- **Vercel Dashboard:** https://vercel.com/dashboard

---

## 📞 Support

If deployment fails:
1. Check Vercel build logs
2. Check Railway logs for backend
3. Verify DNS propagation
4. Check browser console for errors
5. Verify environment variables are set correctly
