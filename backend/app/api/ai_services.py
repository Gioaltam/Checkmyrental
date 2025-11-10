"""
AI-powered features for the inspection dashboard
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Literal, Dict, Any
from openai import OpenAI, AuthenticationError, RateLimitError
from ..config import settings
import json
import hashlib
import time
from datetime import datetime

router = APIRouter(prefix="/ai", tags=["ai"])

# Configure OpenAI client
client = OpenAI(api_key=settings.OPENAI_API_KEY)

class PropertyDetail(BaseModel):
    id: str
    address: str
    status: Optional[str] = None
    criticalIssues: int = 0
    importantIssues: int = 0
    lastInspection: Optional[str] = None
    systems: Optional[Dict[str, Any]] = None  # HVAC, plumbing, electrical, etc.

class PortfolioData(BaseModel):
    totalProperties: int
    totalCritical: int
    totalImportant: int
    propertiesWithCritical: int
    properties: Optional[List[PropertyDetail]] = None

# In-memory cache with TTL (Time To Live)
class AICache:
    def __init__(self, ttl_seconds: int = 300):  # 5 minutes default
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.ttl = ttl_seconds

    def _generate_key(self, data: "PortfolioData") -> str:
        """Generate cache key from portfolio data"""
        key_string = f"{data.totalProperties}-{data.totalCritical}-{data.totalImportant}-{data.propertiesWithCritical}"
        return hashlib.md5(key_string.encode()).hexdigest()

    def get(self, data: "PortfolioData") -> Optional[Any]:
        """Get cached result if available and not expired"""
        key = self._generate_key(data)
        if key in self.cache:
            cached_item = self.cache[key]
            if time.time() - cached_item['timestamp'] < self.ttl:
                return cached_item['data']
            else:
                # Expired, remove from cache
                del self.cache[key]
        return None

    def set(self, data: "PortfolioData", result: Any):
        """Store result in cache"""
        key = self._generate_key(data)
        self.cache[key] = {
            'data': result,
            'timestamp': time.time()
        }

    def clear(self):
        """Clear all cached data"""
        self.cache.clear()

# Initialize cache (5 minutes TTL)
intelligence_cache = AICache(ttl_seconds=300)

class InsightCard(BaseModel):
    type: Literal["trend", "cost", "pattern", "seasonal", "action"]
    title: str
    description: str
    severity: Literal["info", "warning", "critical"]
    icon: str  # Icon name for frontend
    action: Optional[str] = None
    affectedProperties: Optional[List[str]] = None

class ExecutiveSummaryResponse(BaseModel):
    summary: str
    insights: List[str]
    priority_action: Optional[str] = None
    sentiment: Literal["good", "warning", "critical"]

class IntelligenceDashboardResponse(BaseModel):
    summary: str
    insightCards: List[InsightCard]
    trends: List[str]
    costImpact: Optional[Dict[str, Any]] = None
    seasonalAlerts: List[str]
    priorityActions: List[str]
    sentiment: Literal["excellent", "good", "attention", "critical"]

@router.post("/portfolio-summary", response_model=ExecutiveSummaryResponse)
async def generate_portfolio_summary(data: PortfolioData):
    """Generate AI-powered executive summary of portfolio health"""

    try:
        # Construct prompt for GPT-4o-mini
        prompt = f"""You are an expert property management advisor. Analyze this portfolio data and provide a concise executive summary.

Portfolio Data:
- Total Properties: {data.totalProperties}
- Critical Issues: {data.totalCritical}
- Important Issues: {data.totalImportant}
- Properties with Critical Issues: {data.propertiesWithCritical}

Provide a response in the following JSON format:
{{
  "summary": "2-3 sentence executive summary in natural language",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "priority_action": "if there are critical issues, suggest the most important action",
  "sentiment": "good" | "warning" | "critical"
}}

Guidelines:
- Be conversational and direct
- Focus on actionable insights
- Highlight trends and priorities
- Keep it concise - owners want quick understanding"""

        # Call OpenAI API with GPT-4o-mini for cost efficiency
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Fast and cost-effective
            messages=[
                {"role": "system", "content": "You are a property management AI assistant that provides clear, actionable insights."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=300  # Keep response concise
        )

        # Parse AI response
        ai_response = response.choices[0].message.content
        result = json.loads(ai_response)

        return ExecutiveSummaryResponse(**result)

    except AuthenticationError as e:
        print(f"OpenAI authentication failed, using fallback: {e}")
        return generate_fallback_summary(data)
    except RateLimitError:
        print("OpenAI rate limit reached, using fallback")
        return generate_fallback_summary(data)
    except json.JSONDecodeError:
        # Fallback if AI doesn't return valid JSON
        return generate_fallback_summary(data)
    except Exception as e:
        print(f"AI summary error: {e}")
        return generate_fallback_summary(data)

def generate_fallback_summary(data: PortfolioData) -> ExecutiveSummaryResponse:
    """Generate a rule-based summary if AI fails"""

    if data.totalCritical > 0:
        return ExecutiveSummaryResponse(
            summary=f"Your portfolio requires immediate attention with {data.totalCritical} critical issue{'s' if data.totalCritical > 1 else ''} across {data.propertiesWithCritical} {'properties' if data.propertiesWithCritical > 1 else 'property'}. Address these issues as soon as possible to prevent property damage.",
            insights=[
                f"{data.propertiesWithCritical} {'properties need' if data.propertiesWithCritical > 1 else 'property needs'} immediate attention",
                "Schedule repairs for critical items within 24-48 hours",
                "Review contractor availability for urgent work"
            ],
            priority_action=f"Address the {data.totalCritical} critical issue{'s' if data.totalCritical > 1 else ''} immediately",
            sentiment="critical"
        )

    elif data.totalImportant > 0:
        return ExecutiveSummaryResponse(
            summary=f"Your properties are in relatively good condition with {data.totalImportant} important issue{'s' if data.totalImportant > 1 else ''} that should be addressed soon.",
            insights=[
                "No critical issues detected",
                f"{data.totalImportant} items requiring attention within 30 days",
                "Good overall portfolio health"
            ],
            sentiment="warning"
        )

    else:
        return ExecutiveSummaryResponse(
            summary=f"Excellent news! Your portfolio of {data.totalProperties} {'properties is' if data.totalProperties > 1 else 'property is'} in great condition with no critical or important issues detected.",
            insights=[
                "All properties in good condition",
                "Continue quarterly inspection schedule",
                "Maintain preventive maintenance practices"
            ],
            sentiment="good"
        )

@router.post("/property-intelligence", response_model=IntelligenceDashboardResponse)
async def generate_property_intelligence(data: PortfolioData):
    """Generate AI-powered property intelligence dashboard with trends, patterns, and predictions"""

    # Check cache first
    cached_result = intelligence_cache.get(data)
    if cached_result:
        return cached_result

    try:
        # Get current month for seasonal context
        current_month = datetime.now().month
        current_season = get_season(current_month)

        # Build comprehensive context for AI
        property_list = ""
        if data.properties:
            for prop in data.properties:
                property_list += f"\n- {prop.address}: {prop.criticalIssues} critical, {prop.importantIssues} important"
                if prop.lastInspection:
                    property_list += f" (Last inspected: {prop.lastInspection})"

        # Enhanced prompt for intelligent analysis
        prompt = f"""You are an expert property management AI analyst. Analyze this portfolio and provide intelligent insights beyond basic summarization.

Portfolio Overview:
- Total Properties: {data.totalProperties}
- Critical Issues: {data.totalCritical}
- Important Issues: {data.totalImportant}
- Properties with Critical Issues: {data.propertiesWithCritical}
- Current Season: {current_season}

Property Details:{property_list if property_list else " [Limited data available]"}

Provide a response in JSON format with the following structure:
{{
  "summary": "One concise sentence (15-20 words) about portfolio status",
  "insightCards": [
    {{
      "type": "trend|cost|pattern|seasonal|action",
      "title": "Short title (5-8 words)",
      "description": "Detailed insight (20-30 words)",
      "severity": "info|warning|critical",
      "icon": "TrendingUp|DollarSign|Zap|AlertTriangle|Wrench|Calendar",
      "action": "Optional: Specific next step",
      "affectedProperties": ["List of addresses if applicable"]
    }}
  ],
  "trends": ["trend 1", "trend 2"],
  "costImpact": {{
    "immediateRepairs": "estimated cost string",
    "preventiveSavings": "potential savings string",
    "delayPenalty": "cost of delayed action if applicable"
  }},
  "seasonalAlerts": ["seasonal alert 1", "seasonal alert 2"],
  "priorityActions": ["action 1", "action 2", "action 3"],
  "sentiment": "excellent|good|attention|critical"
}}

ANALYSIS GUIDELINES:
1. **Trend Detection**: Look for patterns across properties (e.g., "3 properties show HVAC aging", "All Seattle properties have roof issues")
2. **Cost Impact**: Estimate costs and savings (e.g., "Delaying repairs will cost $8K-12K more in 6 months")
3. **Cross-Property Patterns**: Find connections between properties (location, age, issue types)
4. **Seasonal Intelligence**: Consider current season ({current_season}) - what maintenance is needed?
5. **Actionable Insights**: Provide specific, implementable recommendations
6. **Smart Prioritization**: Rank by urgency, cost, and impact

Create 3-5 insight cards covering:
- Most urgent trend or pattern
- Cost implications (if issues exist)
- Seasonal recommendations for {current_season}
- Preventive opportunities
- Efficiency wins (bulk scheduling, etc.)

Be specific, quantitative when possible, and focus on insights the owner can ACT on immediately."""

        # Call OpenAI with GPT-4o for better intelligence
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Fast and cost-effective
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert property management AI that detects trends, predicts costs, and provides actionable intelligence. You go beyond summarization to provide real insights."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1000,
            response_format={"type": "json_object"}
        )

        # Parse AI response
        ai_response = response.choices[0].message.content
        result = json.loads(ai_response)

        # Create response object
        intelligence_response = IntelligenceDashboardResponse(**result)

        # Cache the successful result
        intelligence_cache.set(data, intelligence_response)

        return intelligence_response

    except AuthenticationError as e:
        print(f"OpenAI authentication failed, using fallback: {e}")
        fallback = generate_fallback_intelligence(data)
        intelligence_cache.set(data, fallback)
        return fallback
    except RateLimitError:
        print("OpenAI rate limit reached, using fallback")
        fallback = generate_fallback_intelligence(data)
        intelligence_cache.set(data, fallback)
        return fallback
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {e}")
        fallback = generate_fallback_intelligence(data)
        intelligence_cache.set(data, fallback)
        return fallback
    except Exception as e:
        print(f"AI intelligence error: {e}")
        fallback = generate_fallback_intelligence(data)
        intelligence_cache.set(data, fallback)
        return fallback

def get_season(month: int) -> str:
    """Get current season based on month"""
    if month in [12, 1, 2]:
        return "Winter"
    elif month in [3, 4, 5]:
        return "Spring"
    elif month in [6, 7, 8]:
        return "Summer"
    else:
        return "Fall"

def generate_fallback_intelligence(data: PortfolioData) -> IntelligenceDashboardResponse:
    """Generate rule-based intelligence if AI fails"""

    current_season = get_season(datetime.now().month)
    insight_cards = []

    if data.totalCritical > 0:
        # Critical situation
        insight_cards.append(InsightCard(
            type="action",
            title="Immediate Action Required",
            description=f"{data.propertiesWithCritical} properties have {data.totalCritical} critical issues requiring urgent professional attention.",
            severity="critical",
            icon="AlertTriangle",
            action="Schedule repairs within 24-48 hours"
        ))

        insight_cards.append(InsightCard(
            type="cost",
            title="Cost Impact of Delays",
            description="Delaying critical repairs typically increases costs by 40-60% within 3-6 months due to secondary damage.",
            severity="warning",
            icon="DollarSign"
        ))

        sentiment = "critical"
        summary = f"{data.propertiesWithCritical} properties need immediate attention"
        priority_actions = [
            "Address all critical issues within 48 hours",
            "Contact contractors for urgent repairs",
            "Review insurance coverage for damage"
        ]

    elif data.totalImportant > 0:
        # Attention needed
        insight_cards.append(InsightCard(
            type="trend",
            title="Important Items Detected",
            description=f"Portfolio has {data.totalImportant} important maintenance items that should be addressed within 30 days.",
            severity="warning",
            icon="TrendingUp"
        ))

        sentiment = "attention"
        summary = f"{data.totalImportant} important items need attention soon"
        priority_actions = [
            "Schedule maintenance for important items",
            "Get quotes from contractors",
            "Plan budget for upcoming repairs"
        ]
    else:
        # Healthy portfolio
        insight_cards.append(InsightCard(
            type="pattern",
            title="Excellent Portfolio Health",
            description=f"All {data.totalProperties} properties are in good condition with no critical or important issues detected.",
            severity="info",
            icon="CheckCircle"
        ))

        sentiment = "excellent"
        summary = "All properties in excellent condition"
        priority_actions = [
            "Continue quarterly inspection schedule",
            "Maintain preventive maintenance routines",
            "Review upcoming seasonal needs"
        ]

    # Add seasonal alert
    seasonal_tasks = get_seasonal_tasks(current_season)
    if seasonal_tasks:
        insight_cards.append(InsightCard(
            type="seasonal",
            title=f"{current_season} Maintenance",
            description=seasonal_tasks[0],
            severity="info",
            icon="Calendar"
        ))

    return IntelligenceDashboardResponse(
        summary=summary,
        insightCards=insight_cards,
        trends=[f"Analysis based on {data.totalProperties} properties"],
        costImpact={
            "immediateRepairs": "$0-1,000" if data.totalCritical == 0 else f"${data.totalCritical * 800}-{data.totalCritical * 1200}",
            "preventiveSavings": "Regular maintenance saves 20-30% long-term"
        } if data.totalCritical > 0 or data.totalImportant > 0 else None,
        seasonalAlerts=seasonal_tasks,
        priorityActions=priority_actions,
        sentiment=sentiment
    )

def get_seasonal_tasks(season: str) -> List[str]:
    """Get seasonal maintenance recommendations"""
    seasonal_recommendations = {
        "Winter": [
            "Inspect heating systems and furnaces",
            "Check for ice dam formation on roofs",
            "Test carbon monoxide detectors",
            "Insulate exposed pipes"
        ],
        "Spring": [
            "Clean gutters and downspouts",
            "Inspect roof for winter damage",
            "Test AC systems before summer",
            "Check for water damage from snow melt"
        ],
        "Summer": [
            "Inspect and maintain AC systems",
            "Check outdoor drainage",
            "Inspect exterior paint and siding",
            "Clean outdoor vents"
        ],
        "Fall": [
            "Prepare heating systems for winter",
            "Clean gutters before leaf season",
            "Inspect weatherstripping",
            "Check roof before heavy rains"
        ]
    }
    return seasonal_recommendations.get(season, [])

@router.post("/clear-cache")
async def clear_intelligence_cache():
    """Clear the AI intelligence cache (useful for testing or forcing fresh results)"""
    intelligence_cache.clear()
    return {"message": "AI intelligence cache cleared successfully", "status": "ok"}
