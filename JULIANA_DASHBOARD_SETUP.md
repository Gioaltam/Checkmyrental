# Sending Reports to Juliana Shewmaker's Dashboard

## ✅ Account Setup Complete

**Account Details:**
- **Name**: Juliana Shewmaker
- **Email**: juliana@checkmyrental.com
- **Password**: owner2024
- **Status**: ✅ Active & Paid (Demo Account)
- **Portal Token**: DEMO1234

**Properties:**
1. Harborview 12B - 4155 Key Thatch Dr, Tampa, FL
2. Seaside Cottage - 308 Lookout Dr, Apollo Beach
3. Palm Grove 3C - Pinellas Park

---

## 📋 How to Send Reports to Juliana's Dashboard

### Method 1: Via Operator UI (Recommended)

**Step 1: Run the Operator UI**
```bash
python operator_ui.py
```

**Step 2: Configure Client**
When creating a report, select or create a client:
- **Client Name**: Juliana Shewmaker
- **Email**: juliana@checkmyrental.com

**Step 3: Process Inspection**
- Drop images or select folder
- Add property address (use one of her properties above)
- Click "Run Inspection"
- Report will be automatically sent to backend

**Step 4: View in Dashboard**
```bash
cd nextjs-dashboard
npm run dev
```
- Open: http://localhost:3000
- Login or use direct access
- Reports will appear automatically

---

### Method 2: Via Upload Script

**Using existing reports from output folder:**

```bash
python upload_to_portal.py \
  --client-name "Juliana Shewmaker" \
  --credentials juliana_demo_credentials.json
```

---

### Method 3: Direct API Call

**Endpoint**: `POST http://localhost:5000/api/client/report`

**Example Request:**
```bash
curl -X POST http://localhost:5000/api/client/report \
  -H "Content-Type: application/json" \
  -d '{
    "client_email": "juliana@checkmyrental.com",
    "property_address": "4155 Key Thatch Dr, Tampa, FL",
    "inspection_date": "2024-10-08",
    "inspector_name": "Your Name",
    "issues": [
      {
        "severity": "critical",
        "category": "HVAC",
        "description": "AC unit not cooling properly",
        "recommendation": "Schedule HVAC service"
      }
    ],
    "photos": []
  }'
```

---

## 🎯 Current System Status

### Backend Server
- ✅ Running on port 5000
- ✅ Database: `backend/app.db`
- ✅ Juliana's account seeded
- ✅ CORS enabled for localhost:3000

### Database Tables
- ✅ portal_clients (Juliana's account)
- ✅ portal_client_tokens (DEMO1234)
- ✅ reports (inspection data)
- ✅ properties (property details)
- ✅ assets (photos/files)

### API Endpoints Available
- `GET /api/client/reports?client_id=<id>` - Get all reports
- `POST /api/client/report` - Create new report
- `GET /api/client/properties` - List properties
- `GET /api/portal/account` - Get account info

---

## 🔄 Data Flow

```
┌──────────────────┐
│  Operator UI     │
│  Create Report   │
└────────┬─────────┘
         │
         │ POST /api/client/report
         │ {"client_email": "juliana@..."}
         ▼
┌──────────────────┐
│  Backend API     │
│  Port 5000       │
└────────┬─────────┘
         │
         │ Save to Database
         ▼
┌──────────────────┐
│  SQLite DB       │
│  app.db          │
└────────┬─────────┘
         │
         │ Fetch via API
         ▼
┌──────────────────┐
│  Dashboard       │
│  Port 3000       │
│  Juliana's View  │
└──────────────────┘
```

---

## 📱 Accessing Juliana's Dashboard

### Option 1: Direct URL (Token-based)
```
http://localhost:3000?token=DEMO1234
```

### Option 2: Login Page
```
http://localhost:3000/login
```
- Email: juliana@checkmyrental.com
- Password: owner2024

### Option 3: Development Mode (No Auth)
```
http://localhost:3000
```
- Dashboard loads with demo data
- Reports from API will populate automatically

---

## ✅ Testing the Connection

**Quick Test:**

1. **Start Backend** (already running ✅)
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload --port 5000
   ```

2. **Test API Connection**
   ```bash
   curl http://localhost:5000/api/client/clients
   ```
   Should show Juliana in the list.

3. **Start Dashboard**
   ```bash
   cd nextjs-dashboard
   npm run dev
   ```

4. **Create Test Report via Operator UI**
   - Run `python operator_ui.py`
   - Select client: Juliana Shewmaker
   - Process any inspection
   - Check dashboard - report appears!

---

## 🎨 What You'll See in Dashboard

When reports are sent to Juliana's account:
- ✅ **Action Center**: Latest inspection info
- ✅ **Metric Cards**: Next inspection, open issues
- ✅ **Properties List**: All 3 properties with status
- ✅ **Reports Section**: Detailed inspection reports
- ✅ **Photos**: All inspection images
- ✅ **Analytics**: Trends and statistics
- ✅ **Schedule**: Upcoming appointments
- ✅ **HVAC Maintenance**: Equipment tracking

---

## 🔐 Security Notes

- Demo account for testing only
- Token: DEMO1234 (change in production)
- Password: owner2024 (update for real deployment)
- Database: SQLite (upgrade to PostgreSQL for production)
- CORS: Currently allows all origins in dev mode

---

## 📞 Need Help?

**Common Issues:**

1. **Reports not appearing?**
   - Check backend is running on port 5000
   - Verify client email matches exactly
   - Check browser console for errors

2. **Connection refused?**
   - Ensure backend server is started
   - Check firewall settings
   - Verify port 5000 is available

3. **Dashboard shows no data?**
   - Create a report first via operator UI
   - Check API_BASE in page.tsx
   - Verify database has reports

---

**Last Updated**: 2024-10-08
**Status**: ✅ Ready to use
**Backend**: Running on port 5000
**Dashboard**: Ready on port 3000
