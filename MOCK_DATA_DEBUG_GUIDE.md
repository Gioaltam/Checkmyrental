# Mock Data Debugging Guide

## 🐛 Issue: Dashboard Not Showing Mock Data

### ✅ Fixes Applied

I've added comprehensive debugging and improvements to help identify why mock data isn't loading:

1. **Added Console Logging** - Track data flow through the system
2. **Skip Photo Fetching** - Don't try to fetch photos from backend when using mock data
3. **Better Error Handling** - More descriptive error messages

---

## 🔍 How to Debug

### Step 1: Open Browser Console

1. **Start the dashboard**:
   ```bash
   cd nextjs-dashboard
   npm run dev
   ```

2. **Open browser** to:
   ```
   http://localhost:3000
   ```

3. **Open DevTools** (F12) and go to **Console** tab

### Step 2: Check Console Logs

You should see these logs in order:

```
🔄 Loading mock data...
✅ Mock data fetch response: 200
✅ Mock data loaded: {owner: "Sarah Johnson", reports: Array(12)}
📊 Found 12 reports
📥 handleReportsData called with: {reports: Array(12)}
🏠 Processing 12 reports...
⏭️  Skipping photo fetch for mock data
✅ Setting 12 properties: Array(12)
✅ handleReportsData complete, loading set to false
```

### Step 3: Check for Errors

**If you see errors, check:**

#### ❌ "Failed to load mock data: 404"
**Cause**: mock-data.json file not found

**Solution**:
```bash
# Verify file exists
ls nextjs-dashboard/public/mock-data.json

# Should output: mock-data.json
```

#### ❌ "Failed to load mock data: SyntaxError"
**Cause**: Invalid JSON in mock-data.json

**Solution**:
```bash
# Validate JSON
cat nextjs-dashboard/public/mock-data.json | python -m json.tool

# Should output formatted JSON without errors
```

#### ❌ No logs at all
**Cause**: Page not loading or JavaScript error

**Solution**:
- Check for red errors in Console
- Look at Network tab for failed requests
- Verify Next.js dev server is running

---

## 🧪 Test Scenarios

### Test 1: Direct Mock Data Access
```bash
# Test if mock data file is accessible
curl http://localhost:3000/mock-data.json
```

**Expected**: JSON with Sarah Johnson's data

**If fails**: File is not in the public directory

---

### Test 2: Force Mock Mode
Visit: `http://localhost:3000?mock=true`

**Expected**: Same result as visiting without parameters

**Console should show**: "🔄 Loading mock data..."

---

### Test 3: Demo Mode
Visit: `http://localhost:3000?demo=true`

**Expected**: Same as mock mode

**Console should show**: "🔄 Loading mock data..."

---

## 📊 Expected Console Output (Complete Flow)

```javascript
// 1. Initial load
🔄 Loading mock data...

// 2. Fetch successful
✅ Mock data fetch response: 200

// 3. Data parsed
✅ Mock data loaded: {owner: "Sarah Johnson", email: "sarah.johnson@example.com", reports: Array(12)}

// 4. Report count
📊 Found 12 reports

// 5. Processing starts
📥 handleReportsData called with: {reports: Array(12)}

// 6. Reports being processed
🏠 Processing 12 reports...

// 7. Photo fetch skipped (mock data)
⏭️  Skipping photo fetch for mock data

// 8. Properties created
✅ Setting 12 properties: [
  {id: "904-marshal-st,-seattle,-wa-98109", name: "904 Marshal St", address: "904 Marshal St, Seattle, WA 98109", ...},
  {id: "4666-12th-ave-s,-seattle,-wa-98108", name: "4666 12th Ave S", address: "4666 12th Ave S, Seattle, WA 98108", ...},
  ... (10 more)
]

// 9. Loading complete
✅ handleReportsData complete, loading set to false
```

---

## 🎯 What Should Happen

After seeing all the console logs:

1. ✅ Loading spinner should disappear
2. ✅ Dashboard should show "Sarah Johnson"
3. ✅ Overview tab should show 12 properties
4. ✅ Executive Summary should display
5. ✅ Property Intelligence section should appear
6. ✅ Each property card should show:
   - Property address
   - Number of critical/important issues
   - Latest inspection date
   - Status indicator (critical/attention/ok)

---

## 🚨 Common Issues

### Issue 1: "Properties state is empty"

**Check in Console**:
```javascript
// Type this in console to inspect state
window.__NEXT_DATA__
```

**If properties array is empty**, the data isn't being set properly.

---

### Issue 2: "Loading forever"

**Symptoms**:
- Spinner never stops
- Console shows logs but UI doesn't update

**Cause**: `setLoading(false)` not being called

**Check**: Console should show "✅ handleReportsData complete, loading set to false"

**If missing**: There's an error in the data processing

---

### Issue 3: "Mock data loads but no properties display"

**Symptoms**:
- Console shows all success logs
- Properties state is populated
- But UI shows "no properties"

**Cause**: UI filtering or rendering issue

**Debug**:
```javascript
// In browser console, check:
// 1. Are there properties?
document.querySelector('[data-testid="property-list"]')

// 2. Check filter state
// Look for filter buttons in UI - are they set to "all"?
```

---

## 🔧 Quick Fixes

### Fix 1: Clear Browser Cache
```
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"
```

### Fix 2: Restart Dev Server
```bash
# Stop current server (Ctrl+C)
cd nextjs-dashboard
npm run dev
```

### Fix 3: Check for Port Conflicts
```bash
# Kill any process on port 3000
npx kill-port 3000

# Restart
npm run dev
```

---

## 📝 Share Debug Info

If still not working, share these from Console:

1. **All console logs** (copy entire console output)
2. **Network tab** - Check for failed requests
3. **Any red errors**
4. **Result of typing this in console**:
   ```javascript
   console.log({
     pathname: window.location.pathname,
     search: window.location.search,
     mockDataUrl: '/mock-data.json'
   });
   ```

---

## ✅ Success Indicators

You'll know it's working when:

- ✅ Console shows all success logs
- ✅ No red errors in console
- ✅ Dashboard displays "Sarah Johnson"
- ✅ 12 properties visible in UI
- ✅ Property cards show addresses and issue counts
- ✅ Executive Summary section appears
- ✅ Property Intelligence section appears

---

## 🎉 Next Steps

Once mock data loads successfully:

1. **Explore the dashboard** - Click through properties, reports
2. **Test filters** - Try filtering by status (critical/attention/ok)
3. **Check analytics** - View the analytics tab
4. **Test theme toggle** - Switch between light/dark mode

---

## 🔗 Related Files

- **Mock Data**: `nextjs-dashboard/public/mock-data.json`
- **Data Loading**: `nextjs-dashboard/src/app/page.tsx:460-480`
- **Data Processing**: `nextjs-dashboard/src/app/page.tsx:690-771`
- **UI Rendering**: `nextjs-dashboard/src/app/page.tsx` (various sections)

---

**The extensive logging will help us identify exactly where the issue is!** 🚀
