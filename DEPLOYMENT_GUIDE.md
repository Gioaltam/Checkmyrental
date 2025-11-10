# CheckMyRental Deployment Guide

Quick reference for deploying your production-ready site.

---

## 📋 Pre-Deployment Checklist

- [x] All production blockers fixed
- [ ] Environment variables configured
- [ ] Backend deployed
- [ ] Dashboard deployed
- [ ] DNS configured
- [ ] SSL certificates active

---

## 🔧 Environment Configuration

### Create `.env` file:

```env
# For Production
PUBLIC_BACKEND_URL=https://api.checkmyrental.io
PUBLIC_DASHBOARD_URL=https://dashboard.checkmyrental.io

# For Staging (Optional)
# PUBLIC_BACKEND_URL=https://staging-api.checkmyrental.io
# PUBLIC_DASHBOARD_URL=https://staging-dashboard.checkmyrental.io
```

### Deployment Platforms

#### Option 1: Vercel (Recommended for Astro)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Settings → Environment Variables
PUBLIC_BACKEND_URL=https://api.checkmyrental.io
PUBLIC_DASHBOARD_URL=https://dashboard.checkmyrental.io
```

#### Option 2: Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod

# Set environment variables
netlify env:set PUBLIC_BACKEND_URL https://api.checkmyrental.io
netlify env:set PUBLIC_DASHBOARD_URL https://dashboard.checkmyrental.io
```

#### Option 3: Static Build + Any Host

```bash
# Build static site
npm run build

# Output directory: dist/
# Upload dist/ folder to any static host (AWS S3, Cloudflare Pages, etc.)
```

---

## 🗄️ Backend Deployment

### FastAPI Backend (Railway/Render/DigitalOcean)

1. **Railway (Easiest):**
   ```bash
   # Connect GitHub repo to Railway
   # Railway auto-detects FastAPI
   # Set environment variables in Railway dashboard
   ```

2. **Render:**
   - Create new Web Service
   - Connect GitHub repo
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`

3. **Environment Variables (for all platforms):**
   ```env
   DATABASE_URL=postgresql://...  # Use Postgres for production
   JWT_SECRET_KEY=your-secure-secret-here
   S3_ACCESS_KEY=...
   S3_SECRET_KEY=...
   S3_BUCKET_NAME=inspection-reports
   OPENAI_API_KEY=...
   ```

---

## 🎨 Dashboard Deployment

### Next.js Dashboard (Vercel/Netlify)

```bash
cd nextjs-dashboard

# Vercel (Recommended)
vercel

# Or Netlify
netlify deploy --prod
```

**Environment Variables:**
```env
NEXT_PUBLIC_API_URL=https://api.checkmyrental.io
```

---

## 🌐 DNS Configuration

### Example DNS Records:

```
Type    Name        Value                           TTL
----    ----        -----                           ---
A       @           <your-landing-page-ip>          300
A       www         <your-landing-page-ip>          300
CNAME   dashboard   your-dashboard.vercel.app       300
CNAME   api         your-backend.railway.app        300
```

Or if using subdomains directly on platforms:
```
landing page:  checkmyrental.io         → Vercel/Netlify
dashboard:     dashboard.checkmyrental.io → Vercel
backend:       api.checkmyrental.io      → Railway/Render
```

---

## 🔒 SSL/HTTPS

Most platforms (Vercel, Netlify, Railway, Render) provide **automatic SSL certificates**.

- ✅ Vercel: Automatic
- ✅ Netlify: Automatic
- ✅ Railway: Automatic
- ✅ Render: Automatic

No configuration needed!

---

## 🧪 Post-Deployment Testing

### 1. Test Authentication Flow

```
1. Visit https://checkmyrental.io
2. Click "Owner Login"
3. Try registering a new account
4. Verify email is received (if email configured)
5. Test login with credentials
6. Verify redirect to dashboard
```

### 2. Test Shopping Cart Flow

```
1. Go to /pricing
2. Add "Quarterly Maintenance" to cart
3. Add an add-on service
4. Click cart icon in header
5. Review items in cart
6. Click "Proceed to Checkout"
7. Fill out checkout form
8. Submit order
9. Verify success message
```

### 3. Test Dashboard Preview

```
1. Visit homepage
2. Scroll to dashboard preview section
3. Click to interact with iframe
4. Verify dashboard loads (not 404)
```

### 4. Test Legal Pages

```
1. Scroll to footer
2. Click "Privacy Policy" → should load /privacy
3. Click "Terms of Service" → should load /terms
4. Verify all content displays correctly
```

### 5. Test Icons

```
1. Check cart icon (🛒) in header
2. Check security lock (🔒) on checkout button
3. Verify all SVG icons load
4. Test on multiple browsers (Chrome, Firefox, Safari)
```

---

## 🐛 Troubleshooting

### Issue: "Failed to fetch" errors on login

**Cause:** CORS misconfiguration
**Fix:** Update backend CORS settings:

```python
# backend/app/main.py
allowed_origins = [
    "https://checkmyrental.io",
    "https://www.checkmyrental.io",
    "https://dashboard.checkmyrental.io",
]
```

### Issue: Dashboard iframe shows 404

**Cause:** Environment variable not set
**Fix:** Verify `PUBLIC_DASHBOARD_URL` in deployment platform:

```bash
# Vercel
vercel env add PUBLIC_DASHBOARD_URL production

# Netlify
netlify env:set PUBLIC_DASHBOARD_URL https://dashboard.checkmyrental.io
```

### Issue: Checkout page is empty

**Cause:** localStorage cart not persisting
**Fix:** Test in non-incognito browser, ensure items added to cart first

### Issue: Icons showing as "?"

**Cause:** Font encoding issue (rare)
**Fix:** Already using Unicode emojis and SVGs - should work. Try different browser.

---

## 📊 Monitoring (Optional but Recommended)

### Error Tracking

- **Sentry** for frontend errors
- **LogTail/Better Stack** for backend logs

### Analytics

- **Google Analytics 4**
- **Plausible Analytics** (privacy-friendly alternative)

### Uptime Monitoring

- **UptimeRobot** (free tier)
- **Pingdom**
- **Better Uptime**

---

## 🚀 Deployment Commands Summary

```bash
# 1. Landing Page (Astro)
npm run build
vercel --prod

# 2. Backend (FastAPI)
# Connect GitHub to Railway/Render
# Auto-deploys on push to main

# 3. Dashboard (Next.js)
cd nextjs-dashboard
npm run build
vercel --prod

# 4. Set all environment variables in each platform's dashboard
```

---

## 📝 Final Checklist

Before going live:

- [ ] All environment variables set correctly
- [ ] Backend health check returns 200: `https://api.checkmyrental.io/health`
- [ ] Dashboard loads: `https://dashboard.checkmyrental.io`
- [ ] Landing page loads: `https://checkmyrental.io`
- [ ] Login/Register works
- [ ] Checkout flow completes
- [ ] Privacy & Terms pages load
- [ ] All icons render correctly
- [ ] Test on mobile devices
- [ ] SSL certificates active (https://)
- [ ] DNS propagated (wait 24-48h after DNS changes)

---

## 🎉 You're Ready to Launch!

Once all checks pass, your site is production-ready.

**Support:** checkmyrentals.fl@gmail.com | (727) 642-4457
