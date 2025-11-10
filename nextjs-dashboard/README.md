# Owner Dashboard - Master Template

A modern, multi-tenant owner dashboard built with Next.js 14, TypeScript, and Tailwind CSS. This is the **master template** that serves all property owners with customizable branding and data isolation.

## 🎯 Key Features

### Multi-Tenant Architecture
- ✅ **One Dashboard, All Owners** - Single codebase serves all customers
- ✅ **Data Isolation** - Each owner sees only their properties and reports
- ✅ **Custom Branding** - Per-owner themes (colors, logo, company name)
- ✅ **Feature Toggles** - Enable/disable features per customer

### Dashboard Features
- 🚀 **Server-side rendering** for fast initial loads
- 🎨 **Customizable theming** with per-owner branding
- 🔐 **Token-based authentication** with owner isolation
- 📱 **Fully responsive** design
- 📊 **Real-time statistics** dashboard
- 🏠 **Property management** with search and filters
- 📸 **Interactive gallery** with AI-powered photo analysis
- 📄 **Inspection reports** with PDF export
- 🔧 **HVAC maintenance** tracking module

## 🚀 Quick Start

See **[QUICK_START.md](./QUICK_START.md)** for detailed setup instructions.

### Prerequisites

- Node.js 18+
- Backend running on port 5000

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Open dashboard
# http://localhost:3000
```

### Access with Owner Token

```
http://localhost:3000?token=DEMO1234
```

**Note**: Authentication is disabled in development mode. See `src/middleware.ts`.

## 📁 Project Structure

```
nextjs-dashboard/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main dashboard (master template)
│   │   ├── layout.tsx            # Root layout with theme support
│   │   ├── settings/             # Settings page
│   │   ├── properties/           # Properties page
│   │   ├── reports/              # Reports page
│   │   └── api/                  # API routes (HVAC, etc.)
│   ├── components/
│   │   └── HVACMaintenanceModal.tsx  # Shared components
│   ├── config/
│   │   └── theme.ts              # 🎨 Theme system & presets
│   ├── services/
│   │   └── api.ts                # 🔌 API service layer
│   └── middleware.ts             # 🔐 Authentication & routing
├── QUICK_START.md                # Quick setup guide
├── MASTER_TEMPLATE_GUIDE.md      # Complete architecture docs
└── README.md                     # This file
```

## 🎨 Customization

### For All Owners (Master Template)
Edit these files to change layout/features for **all customers**:

- `src/app/page.tsx` - Main dashboard page
- `src/components/*` - Shared components
- `src/config/theme.ts` - Default theme settings

### Per Owner (Backend Configuration)
Customize per customer via the database:

```bash
# 1. Add theme_config column
python backend/add_theme_config_column.py

# 2. Set custom theme via API
curl -X POST http://localhost:5000/api/client/owners/ABC123/theme \
  -H "Content-Type: application/json" \
  -d '{
    "brandName": "ABC Properties",
    "colors": { "primary": "#10b981" }
  }'
```

See **[MASTER_TEMPLATE_GUIDE.md](./MASTER_TEMPLATE_GUIDE.md)** for complete customization guide.

## 🔌 Backend Integration

The dashboard connects to the FastAPI backend via `src/services/api.ts`:

**Required Endpoints:**
- `GET /api/portal/dashboard?portal_token={token}` - Owner data
- `GET /api/reports/list?owner_id={id}` - Reports list
- `GET /api/photos/property/{address}` - Property photos
- `GET /api/simple/simple/{reportId}` - Report HTML
- `GET /api/photo-report/{reportId}/{filename}/json` - Photo analysis

**Optional (Theme System):**
- `GET /api/client/owners/{ownerId}/theme` - Get owner theme
- `POST /api/client/owners/{ownerId}/theme` - Update owner theme

## 🚢 Deployment

### Single Deployment (Multi-Tenant) - Recommended
```bash
npm run build
npm start
```
All owners use same deployment with different tokens.

### Environment Variables
```env
NEXT_PUBLIC_API_BASE=https://api.yourdomain.com
```

### Hosting Options
- **Vercel** (recommended) - Zero config deployment
- **Netlify** - Static + serverless functions
- **AWS Amplify** - Full stack deployment
- **Docker** - Containerized deployment

## 📚 Documentation

- **[QUICK_START.md](./QUICK_START.md)** - Setup in 5 minutes
- **[MASTER_TEMPLATE_GUIDE.md](./MASTER_TEMPLATE_GUIDE.md)** - Architecture deep dive
- **[src/config/theme.ts](./src/config/theme.ts)** - Theme system docs
- **[src/services/api.ts](./src/services/api.ts)** - API integration docs

## 🧪 Testing

Test with multiple owner tokens:
```bash
# Owner 1
http://localhost:3000?token=OWNER1

# Owner 2
http://localhost:3000?token=OWNER2
```

Each should see different properties, reports, and branding.

## 🤝 Contributing

When editing the master template:
1. ✅ Test with multiple owner tokens
2. ✅ Ensure backward compatibility
3. ✅ Update theme system if adding features
4. ✅ Document customization points

## 📄 License

Proprietary - CheckMyRental