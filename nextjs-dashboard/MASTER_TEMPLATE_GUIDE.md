# Master Owner Dashboard Template Guide

This Next.js dashboard serves as the **master template** for all owner dashboards. Each customer will see the same layout and functionality, but with their own data, branding, and customization.

## Architecture Overview

### Multi-Tenant Design
- **Single Codebase**: One dashboard serves all customers
- **Dynamic Data**: Content loads based on owner token/ID
- **Customizable Branding**: Each owner can have custom colors, logo, and company name
- **Feature Toggles**: Enable/disable features per owner

## Key Files

### Configuration
- `src/config/theme.ts` - Theme system for branding customization
- `src/services/api.ts` - Centralized API calls
- `src/middleware.ts` - Authentication and routing

### Components
- `src/app/page.tsx` - Main dashboard page
- `src/components/HVACMaintenanceModal.tsx` - HVAC maintenance component
- All components use theme variables for consistent styling

## How It Works

### 1. Owner Access
Each owner accesses their dashboard via:
```
http://localhost:3000?token=OWNER_TOKEN
```

The token identifies the owner and loads their specific data.

### 2. Theme Customization

#### Default Theme (CheckMyRental)
```typescript
{
  brandName: 'CheckMyRental',
  colors: {
    primary: '#ef4444',  // Red
    accent: '#3b82f6',   // Blue
  }
}
```

#### Custom Owner Theme
```typescript
{
  brandName: 'ABC Properties',
  colors: {
    primary: '#10b981',  // Green
    accent: '#8b5cf6',   // Purple
  }
}
```

### 3. Data Loading
```typescript
// 1. Get owner info from token
const dashboardData = await fetchDashboardData(token);

// 2. Load reports for this owner
const reportsData = await fetchReports(ownerId);

// 3. Process into properties
const properties = await processReportsIntoProperties(reports);
```

## Customizing for New Owners

### Option A: Backend Configuration (Recommended)
1. Store owner branding in database
2. Create API endpoint: `GET /api/owners/{ownerId}/theme`
3. Dashboard fetches theme on load

### Option B: Environment Variables
```env
NEXT_PUBLIC_BRAND_NAME=ABC Properties
NEXT_PUBLIC_PRIMARY_COLOR=#10b981
```

### Option C: Theme Presets
Use built-in presets from `theme.ts`:
- Default (Red)
- Green
- Blue
- Purple
- Orange

## Development Workflow

### 1. Edit the Master Template
```bash
cd nextjs-dashboard
npm run dev
```

Open http://localhost:3000

### 2. Test Theme Changes
Edit `src/config/theme.ts` to see different branding:
```typescript
export const defaultTheme: ThemeConfig = {
  brandName: 'Your Company',
  colors: {
    primary: '#your-color',
    // ...
  }
}
```

### 3. Test with Owner Data
Add token to URL:
```
http://localhost:3000?token=owner123
```

## Features That Adapt Per Owner

### Automatic
- ✅ Properties list
- ✅ Reports
- ✅ Photos
- ✅ Inspection history

### Customizable
- ⚙️ Brand name
- ⚙️ Logo
- ⚙️ Colors
- ⚙️ Contact info

### Optional (Feature Toggles)
- 🔧 HVAC Maintenance module
- 🔧 Photo Analysis
- 🔧 Report filtering
- 🔧 Notifications

## Building for Production

### Single Deployment (Multi-Tenant)
```bash
npm run build
npm start
```

All owners use same deployment, different tokens.

### Per-Owner Deployments
```bash
# Build with custom env
NEXT_PUBLIC_OWNER_ID=abc npm run build

# Deploy to owner-specific domain
# abc.checkmyrental.com
```

## API Integration

### Required Backend Endpoints
```
GET  /api/portal/dashboard?portal_token={token}
GET  /api/reports/list?owner_id={ownerId}
GET  /api/photos/property/{address}
GET  /api/simple/simple/{reportId}
GET  /api/photo-report/{reportId}/{filename}/json
```

### Optional (For Full Customization)
```
GET  /api/owners/{ownerId}/theme
POST /api/owners/{ownerId}/theme
```

## Common Customization Tasks

### Change Default Brand Colors
Edit `src/config/theme.ts`:
```typescript
export const defaultTheme: ThemeConfig = {
  colors: {
    primary: '#NEW_COLOR',
    // ...
  }
}
```

### Add New Feature Toggle
1. Add to `ThemeConfig.features`:
```typescript
features: {
  myNewFeature: boolean;
}
```

2. Use in components:
```typescript
{theme.features.myNewFeature && <MyComponent />}
```

### Change Layout
Edit `src/app/page.tsx` - all owners will inherit changes.

## Testing Multiple Owners

### Create Test Owners
```bash
# In backend
python generate_dashboard_token.py --owner-id owner1 --name "Owner One"
python generate_dashboard_token.py --owner-id owner2 --name "Owner Two"
```

### Access Dashboards
```
http://localhost:3000?token=owner1
http://localhost:3000?token=owner2
```

Each sees their own data with the same UI.

## Best Practices

### ✅ Do
- Use theme variables for all colors
- Keep components data-agnostic
- Test with multiple owner tokens
- Document customizations

### ❌ Don't
- Hardcode owner-specific data
- Modify core layout for single owner
- Skip theme configuration
- Create owner-specific components

## Troubleshooting

### Dashboard shows no data
- Check token is valid
- Verify backend is running (port 5000)
- Check browser console for API errors

### Theme not applying
- Clear browser cache
- Check `applyTheme()` is called
- Verify CSS variables in DevTools

### Authentication redirect loop
- Check `middleware.ts` auth is disabled for dev
- Clear cookies
- Use token in URL parameter

## Next Steps

1. ✅ Master template is ready
2. 🔧 Add backend theme endpoint
3. 🎨 Create theme presets for common industries
4. 📊 Add analytics per owner
5. 💳 Integrate payment status
