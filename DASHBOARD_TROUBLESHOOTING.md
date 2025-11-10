# Dashboard Mock Data Troubleshooting Guide

## ✅ Fixes Applied

### 1. Backend Port Configuration Fixed
**Changed:** Default API_BASE port from 5000 → 8000
- **File**: `nextjs-dashboard/src/app/page.tsx:69`
- **Before**: `http://localhost:5000`
- **After**: `http://localhost:8000`

This matches your backend configuration in `.env.local`.

---

## 🔍 How Mock Data Loading Works

The dashboard automatically loads mock data when:
1. ✅ No `token` parameter in URL
2. ✅ `?mock=true` in URL
3. ✅ `?demo=true` in URL
4. ✅ Backend fetch fails (fallback)

### Code Logic (page.tsx:457):
```typescript
const useMock = urlParams.get("mock") === "true" || isDemo || !code;
```

---

## 🚀 How to Access the Dashboard

### Option 1: Mock Data (No Backend Required)
Just visit the dashboard URL without any parameters:
```
http://localhost:3000
```

### Option 2: Explicitly Request Mock Data
```
http://localhost:3000?mock=true
```

### Option 3: Demo Mode
```
http://localhost:3000?demo=true
```

### Option 4: Real Data (Backend Required)
```
http://localhost:3000?token=YOUR_TOKEN_HERE
```

---

## 🧪 Verification Steps

### Step 1: Check Next.js Dev Server is Running
```bash
cd nextjs-dashboard
npm run dev
```

Expected output:
```
▲ Next.js 14.x
- Local:        http://localhost:3000
- Ready in X.Xs
```

### Step 2: Verify Mock Data File Exists
```bash
ls nextjs-dashboard/public/mock-data.json
```

Expected: ✅ File exists (3391 bytes)

### Step 3: Access Dashboard
Open browser and navigate to:
```
http://localhost:3000
```

**Expected Result:** Dashboard loads with 12 sample properties from Sarah Johnson's portfolio

### Step 4: Check Browser Console
Open DevTools (F12) and check Console tab:
- ❌ Should NOT see: "Failed to load mock data"
- ✅ Should see: Network request to `/mock-data.json` succeeds

---

## 🐛 Common Issues & Solutions

### Issue 1: "Failed to load mock data" error
**Cause:** mock-data.json file missing or incorrect path

**Solution:**
```bash
# Verify file exists
ls nextjs-dashboard/public/mock-data.json

# If missing, it should have 12 sample reports
```

---

### Issue 2: Dashboard shows loading forever
**Causes:**
- Next.js dev server not running
- Port conflict (3000 already in use)
- TypeScript compilation errors

**Solutions:**
```bash
# Stop any process on port 3000
npx kill-port 3000

# Restart Next.js dev server
cd nextjs-dashboard
npm run dev

# Check for TypeScript errors
npm run build
```

---

### Issue 3: Backend connection error (when using token)
**Cause:** Backend not running on port 8000

**Solution:**
```bash
# Start backend on port 8000
cd backend
uvicorn app.main:app --reload --port 8000
```

---

### Issue 4: Environment variable not loading
**Cause:** NEXT_PUBLIC_API_BASE not recognized

**Solution:**
1. Verify `.env.local` exists:
   ```bash
   cat nextjs-dashboard/.env.local
   ```

2. Should contain:
   ```
   NEXT_PUBLIC_API_BASE=http://localhost:8000
   ```

3. Restart Next.js dev server (env vars load on startup)

---

## 🔧 Current Configuration

### Frontend (Next.js Dashboard)
- **Port**: 3000
- **API Base**: `http://localhost:8000` (from NEXT_PUBLIC_API_BASE)
- **Fallback**: `http://localhost:8000` (if env var missing)
- **Mock Data**: `/public/mock-data.json`

### Backend (FastAPI)
- **Port**: 8000
- **AI Endpoints**: `/api/ai/*`
- **Reports**: `/api/reports/*`
- **Health Check**: `http://localhost:8000/health`

---

## 📊 Mock Data Contents

The `mock-data.json` file contains:
- **Owner**: Sarah Johnson
- **Email**: sarah.johnson@example.com
- **Properties**: 12 sample properties
- **Reports**: 12 inspection reports
- **Issues**: Mix of critical and important issues
- **Photos**: 20-74 photos per report

---

## ✅ Quick Test Commands

### Test 1: Check Next.js Server
```bash
curl http://localhost:3000
```
Should return HTML

### Test 2: Check Mock Data File
```bash
curl http://localhost:3000/mock-data.json
```
Should return JSON with Sarah Johnson's data

### Test 3: Check Backend Health (if running)
```bash
curl http://localhost:8000/health
```
Should return: `{"status":"ok"}`

### Test 4: Check AI Cache Endpoint (if backend running)
```bash
curl -X POST http://localhost:8000/api/ai/clear-cache
```
Should return: `{"message":"AI intelligence cache cleared successfully","status":"ok"}`

---

## 🎯 Expected Dashboard Behavior

When you visit `http://localhost:3000` (no params):

1. ✅ Dashboard loads immediately
2. ✅ Shows "Sarah Johnson" as owner name
3. ✅ Displays 12 properties
4. ✅ Shows property intelligence section
5. ✅ Shows health score widget
6. ✅ Each property has critical/important issue counts
7. ✅ Can click properties to view reports (mock PDFs won't work)

---

## 🚨 Still Not Working?

### Debug Checklist:
- [ ] Next.js dev server running (`npm run dev`)
- [ ] Browser pointed to `http://localhost:3000`
- [ ] No console errors in browser DevTools (F12)
- [ ] Mock data file exists at `nextjs-dashboard/public/mock-data.json`
- [ ] Port 3000 not blocked by firewall
- [ ] No TypeScript compilation errors

### Get Console Output:
1. Open browser to `http://localhost:3000`
2. Open DevTools (F12)
3. Go to Console tab
4. Look for errors (red text)
5. Check Network tab for failed requests

### Share This Info:
- Browser console errors
- Network tab failed requests
- Next.js terminal output
- `npm run dev` output

---

## 📝 Files Modified

1. ✅ `nextjs-dashboard/src/app/page.tsx:69` - Fixed API_BASE default port
2. ✅ `nextjs-dashboard/public/mock-data.json` - Verified exists
3. ✅ `nextjs-dashboard/.env.local` - Verified has NEXT_PUBLIC_API_BASE=http://localhost:8000

---

## 🎉 Next Steps

1. **Restart Next.js Dev Server**:
   ```bash
   cd nextjs-dashboard
   npm run dev
   ```

2. **Open Browser**:
   ```
   http://localhost:3000
   ```

3. **Verify Mock Data Loads**:
   - Should see Sarah Johnson's 12 properties
   - No "Failed to load mock data" errors in console

4. **If Still Not Working**:
   - Check browser console (F12)
   - Share the error messages
   - Verify mock-data.json exists

The mock data should now load automatically! 🚀
