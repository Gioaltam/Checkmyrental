# Dashboard Audit Package

This document provides a comprehensive overview of the entire Next.js dashboard for ChatGPT audit.

---

## 1. MAIN DASHBOARD FILE

**File:** `nextjs-dashboard/src/app/page.tsx` (1858 lines)

**Purpose:** Core dashboard application with three main tabs

**Key Features:**
- Overview tab with AI Executive Summary, Portfolio Health, Quick Actions
- Properties tab with property accordion, reports, and photo galleries
- Analytics tab with issue trends and property health tracking
- Real-time data fetching from backend API
- Photo analysis with AI-powered observations
- Batch photo severity loading
- Command palette, notifications, mobile navigation

**API Integrations:**
- `/api/owners/dashboard?portal_token={token}` - Get owner and property data
- `/api/reports/list?owner_id={id}` - Get all reports
- `/api/photos/property/{address}` - Get photos for a property
- `/api/photo-report/{reportId}/{filename}/json` - Get AI photo analysis
- `/api/batch/property/{address}/severities` - Batch load photo severities
- `/api/pdf/property/{address}` - Get PDF reports

**State Management:**
- 25+ useState hooks for UI state
- Properties data with reports and photos
- Analytics calculations (trends, issue counts, property health)
- Modal states (photos, reports, HVAC, notifications)
- Filter states (year, quarter, property, timeframe)

**Key Functions:**
- `handleDashboardData()` - Process API response into property objects
- `calculateAnalytics()` - Real-time analytics from report data
- `generateRecentActivity()` - Create activity feed from reports
- `fetchPhotoAnalysis()` - Load AI analysis for individual photos

---

## 2. KEY COMPONENTS

### A. Executive Summary Component
**File:** `nextjs-dashboard/src/components/ExecutiveSummary.tsx`

**Features:**
- AI-powered portfolio analysis using OpenAI GPT-4
- Displays critical properties with specific addresses
- Priority actions with immediate next steps
- Enhanced fallback when no API key
- Visual sections for critical properties and urgent actions

**Props:**
- `portfolioData` - Aggregate metrics
- `properties` - Full property array with addresses and issue counts
- `userName` - Property owner name

### B. Portfolio Health Widget
**File:** `nextjs-dashboard/src/components/HealthScoreWidget.tsx`

**Features:**
- Real-time health score calculation (0-100)
- Animated circular progress indicator
- Property status breakdown (healthy/attention/critical)
- Expandable details showing specific properties
- Trend analysis (improving/stable/declining)
- Smart scoring algorithm:
  - Critical issue: -15 points each
  - Important issue: -5 points each
  - No inspection in 90 days: -10 points

**Props:**
- `properties` - Array of properties with reports
- `criticalIssues` - Total critical count
- `importantIssues` - Total important count
- `totalProperties` - Portfolio size

### C. Property Accordion
**File:** `nextjs-dashboard/src/components/PropertyAccordion.tsx`

**Features:**
- Expandable property cards with latest report
- Photo thumbnails and quick stats
- Report filtering by year/quarter
- HVAC maintenance scheduling
- Status indicators (critical/attention/healthy)

### D. Quick Actions Panel
**File:** `nextjs-dashboard/src/components/QuickActions.tsx`

**Features:**
- Recent activity feed from real reports
- Critical issue count with quick navigation
- Pending tasks
- Clickable activities that navigate to specific properties

### E. Other Key Components
- **MetricCard** - Reusable metric display with trends
- **CommandPalette** - Quick search (⌘K)
- **NotificationCenter** - Alert management
- **AIChatAssistant** - Portfolio Q&A assistant
- **ThemeToggle** - Light/dark mode switcher
- **MobileNav** - Mobile-responsive navigation

---

## 3. API ROUTES

### A. AI Executive Summary
**File:** `nextjs-dashboard/src/app/api/ai/executive-summary/route.ts`

**Endpoint:** `POST /api/ai/executive-summary`

**Features:**
- OpenAI GPT-4o-mini integration
- Detailed context generation with property addresses
- Structured JSON response
- Fallback handling when API unavailable

**Input:**
```json
{
  "totalProperties": 14,
  "totalCritical": 5,
  "totalImportant": 10,
  "properties": [
    {
      "address": "13699 99th Ave Unit 3",
      "criticalIssues": 2,
      "importantIssues": 1,
      "status": "critical"
    }
  ],
  "ownerName": "Juliana Shewmaker"
}
```

**Output:**
```json
{
  "summary": "Executive summary text",
  "priorityLevel": "Urgent",
  "priorityColor": "red",
  "criticalProperties": [
    {
      "address": "13699 99th Ave Unit 3",
      "issues": ["HVAC failure", "Water leak"],
      "urgency": "Action required within 24 hours"
    }
  ],
  "priorityActions": [
    "1. Schedule HVAC repair at 13699 99th Ave Unit 3",
    "2. Contact plumber for water leak inspection"
  ],
  "insights": ["Portfolio trend insights"],
  "recommendations": ["Strategic recommendations"]
}
```

---

## 4. DATA FLOW

```
User visits dashboard with token
        ↓
    page.tsx loads
        ↓
Fetches /api/owners/dashboard?portal_token={token}
        ↓
    Receives owner info + properties
        ↓
For each property: Fetches photos from /api/photos/property/{address}
        ↓
    Displays in 3 tabs:
        ↓
    ┌─────────────┬──────────────┬─────────────┐
    │  Overview   │  Properties  │  Analytics  │
    └─────────────┴──────────────┴─────────────┘
         ↓               ↓              ↓
    Executive      Property      Analytics
    Summary +      Accordion     Charts +
    Health Score   + Photos      Trends
```

---

## 5. ANALYTICS CALCULATIONS

**Function:** `calculateAnalytics()` in page.tsx

**Metrics Calculated:**
1. Total issues (critical + important)
2. Properties with critical issues count
3. Average issues per property
4. Total inspections in timeframe
5. Issues by month (for trend charts)
6. Recent activity feed generation

**Filtering:**
- Timeframe: 30d, 90d, 6m, 1y, all
- Property: specific or all
- Date range calculations

---

## 6. PHOTO ANALYSIS SYSTEM

**Features:**
- Batch loading of severities for performance
- Individual detailed analysis on demand
- Caching to prevent duplicate API calls
- Expandable photo cards with observations, issues, and recommendations

**Flow:**
1. User opens photo modal → Batch load all photo severities
2. User clicks "View Analysis" → Fetch full analysis for that photo
3. Results cached in `photoAnalysis` state
4. Expandable accordion shows detailed AI insights

---

## 7. STYLING & THEMING

**Theme System:**
- Light/dark mode toggle
- CSS variables for colors
- Tailwind CSS utility classes
- Glass morphism effects
- Responsive breakpoints (mobile/tablet/desktop)

**Key Classes:**
- `glass-card` - Frosted glass effect
- `enhanced-card` - Premium card styling
- `sidebar-light-blue` - Light mode sidebar
- `header-light-blue` - Light mode header

---

## 8. PERFORMANCE OPTIMIZATIONS

1. **Batch API Calls:** Load all photo severities at once
2. **Caching:** Photo analysis stored in state
3. **Lazy Loading:** Photos load on demand
4. **Memoization:** Analytics calculated once per data change
5. **Parallel Fetching:** Properties and photos fetched concurrently

---

## 9. MOBILE RESPONSIVENESS

- Responsive grid layouts (1/2/3 columns based on screen size)
- Mobile navigation component
- Touch-friendly buttons and controls
- Collapsible sections for mobile
- Horizontal scroll prevention

---

## 10. ERROR HANDLING

- Fallback mock data when API unavailable
- Try-catch blocks for all API calls
- User-friendly error messages
- Graceful degradation (works without OpenAI key)
- Loading states for async operations

---

## 11. ACCESSIBILITY

- ARIA labels on all interactive elements
- Keyboard navigation support (⌘K for command palette)
- Focus management in modals
- Semantic HTML structure
- Color contrast compliance

---

## 12. SECURITY CONSIDERATIONS

- Token-based authentication via URL parameter
- No sensitive data in client-side code
- API key stored server-side only
- CORS configured in backend
- Input sanitization for search/filters

---

## AUDIT CHECKLIST FOR CHATGPT

Please review for:

### Code Quality
- [ ] TypeScript types and interfaces properly defined
- [ ] No any types without justification
- [ ] Consistent naming conventions
- [ ] DRY principle violations
- [ ] Code organization and structure

### Performance
- [ ] Unnecessary re-renders
- [ ] Missing React.memo or useMemo
- [ ] Large bundle size concerns
- [ ] API call optimization opportunities
- [ ] State management efficiency

### Security
- [ ] XSS vulnerabilities
- [ ] Exposed sensitive data
- [ ] Authentication/authorization gaps
- [ ] API endpoint security

### UX/UI
- [ ] Accessibility issues
- [ ] Mobile responsiveness problems
- [ ] Loading states missing
- [ ] Error handling improvements
- [ ] User feedback clarity

### Architecture
- [ ] Component coupling issues
- [ ] State management complexity
- [ ] API design concerns
- [ ] Scalability limitations

### Best Practices
- [ ] React hooks usage
- [ ] Error boundary implementation
- [ ] Testing coverage gaps
- [ ] Documentation needs

---

## FILES TO PROVIDE TO CHATGPT

For complete audit, share these files:

1. **Main Dashboard:** `nextjs-dashboard/src/app/page.tsx`
2. **Executive Summary:** `nextjs-dashboard/src/components/ExecutiveSummary.tsx`
3. **Health Widget:** `nextjs-dashboard/src/components/HealthScoreWidget.tsx`
4. **API Route:** `nextjs-dashboard/src/app/api/ai/executive-summary/route.ts`
5. **Property Accordion:** `nextjs-dashboard/src/components/PropertyAccordion.tsx`

Or simply share the main `page.tsx` file for a comprehensive review since it integrates everything.

---

**Recommendation:** Start with just `page.tsx` for the main audit, then provide specific component files for deeper dives into areas ChatGPT identifies as needing attention.
