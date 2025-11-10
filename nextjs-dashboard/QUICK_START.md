# Quick Start Guide - Master Owner Dashboard

## 🚀 Getting Started

### 1. Start the Backend (Port 5000)
```bash
# In the root directory
python main.py
# OR
python backend_simple.py
```

### 2. Start the Next.js Dashboard (Port 3000)
```bash
cd nextjs-dashboard
npm install
npm run dev
```

### 3. Access the Dashboard
Open your browser to:
```
http://localhost:3000
```

**Note**: Authentication is currently disabled for development, so you can access the dashboard directly without a token.

## 🎨 Testing Theme Customization

### Option 1: Modify Default Theme
Edit `src/config/theme.ts`:

```typescript
export const defaultTheme: ThemeConfig = {
  brandName: 'Your Company Name',
  brandSubtitle: 'Property Portal',

  colors: {
    primary: '#10b981',      // Change to your brand color
    primaryDark: '#059669',
    primaryLight: '#d1fae5',
    accent: '#8b5cf6',
  }
}
```

Refresh your browser to see changes.

### Option 2: Use Theme Presets
In `src/app/page.tsx`, import and use a preset:

```typescript
import { themePresets, applyTheme } from '@/config/theme';

// In useEffect
useEffect(() => {
  applyTheme(themePresets.green);  // or blue, purple, orange
}, []);
```

### Option 3: Load from Backend API
The dashboard can fetch owner-specific themes from:
```
GET http://localhost:5000/api/client/owners/{owner_id}/theme
```

Update `src/services/api.ts` to enable this:

```typescript
export async function fetchOwnerTheme(ownerId: string) {
  const response = await fetch(`${API_BASE}/api/client/owners/${ownerId}/theme`);
  return response.json();
}
```

## 📊 Testing with Owner Data

### Access with Owner Token
```
http://localhost:3000?token=DEMO1234
```

This will:
1. Load dashboard data for owner "DEMO1234"
2. Fetch their properties and reports
3. Apply their custom theme (if configured)

### Create Test Owner
Use the backend to create a test owner:

```bash
# TODO: Add script to create test owner with custom theme
```

## 🎯 What's Working

✅ **Multi-tenant architecture** - One dashboard, multiple owners
✅ **Dynamic data loading** - Data fetched based on owner token
✅ **Theme system** - Centralized branding configuration
✅ **API service layer** - Clean separation of concerns
✅ **Component reusability** - Shared components across all owners

## 🔧 Customization Points

### For All Owners (Master Template)
- Edit `src/app/page.tsx` - Main dashboard layout
- Edit `src/components/*` - Shared components
- Edit `src/config/theme.ts` - Default theme

### Per Owner (Backend Configuration)
- Database: `clients.theme_config` column
- API: `GET/POST /api/client/owners/{owner_id}/theme`
- Customize: Brand name, colors, features, contact info

## 📁 Project Structure

```
nextjs-dashboard/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main dashboard page
│   │   ├── layout.tsx            # Root layout
│   │   ├── settings/             # Settings page
│   │   └── api/                  # API routes
│   ├── components/
│   │   └── HVACMaintenanceModal.tsx
│   ├── config/
│   │   └── theme.ts              # Theme configuration
│   ├── services/
│   │   └── api.ts                # API service layer
│   └── middleware.ts             # Auth middleware
├── MASTER_TEMPLATE_GUIDE.md      # Full documentation
└── QUICK_START.md                # This file
```

## 🐛 Troubleshooting

### Dashboard shows "localhost refused to connect"
- Make sure backend is running on port 5000
- Check if Next.js dev server is running on port 3000

### No data showing
- Verify backend has test data
- Check browser console for API errors
- Try accessing with token: `?token=DEMO1234`

### Theme changes not visible
- Hard refresh browser (Ctrl+Shift+R)
- Check browser DevTools > Elements > :root for CSS variables
- Verify `applyTheme()` is called in useEffect

### Can't access dashboard (redirects to landing page)
- Check `src/middleware.ts` - auth should be commented out
- Clear browser cookies
- Use incognito mode

## 🎓 Next Steps

1. **Create Database Migration**
   ```bash
   # Add theme_config column to clients table
   ```

2. **Test Theme API**
   ```bash
   # Test GET/POST theme endpoints
   curl http://localhost:5000/api/client/owners/DEMO1234/theme
   ```

3. **Create Custom Themes**
   - Define themes for different industries
   - Property management companies
   - Real estate agencies
   - Individual landlords

4. **Deploy**
   - Build: `npm run build`
   - Deploy to Vercel/Netlify
   - Point to production backend

## 💡 Tips

- Use `theme.features` flags to enable/disable features per owner
- Store logo URLs in `theme.logoUrl` and fetch from CDN
- Use CSS variables for easy theme switching
- Test with multiple browser tabs (different owner tokens)
