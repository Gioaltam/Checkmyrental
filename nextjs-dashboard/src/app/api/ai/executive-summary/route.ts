import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const portfolioData = await request.json();

    // Get OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        error: 'OpenAI API key not configured',
        summary: 'Unable to generate AI summary. Please configure OpenAI API key.',
        priorityLevel: 'Error',
        priorityColor: 'red',
        healthScore: 0,
        recommendations: ['Configure OpenAI API key to enable AI summaries'],
        keyMetrics: portfolioData.keyMetrics || {}
      }, { status: 500 });
    }

    // Create detailed context for OpenAI
    const context = createDetailedContext(portfolioData);

    // Call OpenAI API for intelligent summary
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Using efficient model for summaries
        messages: [
          {
            role: 'system',
            content: `You are an expert property management advisor creating executive summaries for property owners.

Your task is to analyze the property portfolio data and provide DIRECT, ACTIONABLE guidance.

CRITICAL REQUIREMENTS:
1. **Always mention specific property addresses** when discussing issues
2. **Be direct and clear** - no vague statements like "some properties need attention"
3. **Prioritize by urgency** - critical issues first, with specific addresses
4. **Provide actionable next steps** - what to do, where, and when
5. **Use professional but accessible language** - property owners need to understand and act
6. **NEVER truncate or use ellipsis (...)** - Always list ALL properties with issues
7. **Be comprehensive** - Owners need complete information about their entire portfolio

Format your response to include:
- Summary: Direct assessment with specific addresses of problem properties
- Critical Properties: List each critical property with its specific issues
- Priority Actions: Numbered list of immediate actions needed, mentioning specific addresses
- Insights: Pattern analysis and trends across the portfolio
- Recommendations: Strategic advice for portfolio management

Example of GOOD output:
"Your property at 123 Main St has 2 critical issues requiring immediate attention: HVAC system failure and electrical hazards. Contact a licensed contractor within 24 hours."

Example of BAD output:
"Some properties need attention for various maintenance issues."

Always be specific, direct, and actionable.`
          },
          {
            role: 'user',
            content: `Please analyze this property portfolio and provide an executive summary:\n\n${context}\n\nProvide a JSON response with the following structure:
{
  "summary": "Executive summary (2-3 sentences) - MUST include specific property addresses with critical issues",
  "priorityLevel": "Urgent|Moderate|Good",
  "priorityColor": "red|yellow|green",
  "healthScore": number (0-100),
  "criticalProperties": [
    {
      "address": "Full property address",
      "issues": ["Specific issue 1", "Specific issue 2"],
      "urgency": "Action required within X timeframe"
    }
  ],
  "priorityActions": [
    "1. Specific action for specific address (e.g., 'Schedule HVAC repair at 123 Main St within 24 hours')",
    "2. Next specific action with address",
    "3. Third specific action with address"
  ],
  "insights": ["Portfolio-level insight 1", "Trend insight 2", "Pattern insight 3"],
  "recommendations": ["Strategic recommendation 1", "Preventive recommendation 2"]
}

REQUIREMENTS:
- Every mention of a problem MUST include the specific property address
- Priority actions MUST be specific and actionable
- If there are critical issues, criticalProperties array MUST be populated
- Order everything by urgency (most critical first)`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000, // Increased to allow for comprehensive property listings
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiSummary = JSON.parse(data.choices?.[0]?.message?.content || '{}');

    // Merge AI summary with portfolio metrics
    return NextResponse.json({
      ...aiSummary,
      keyMetrics: {
        totalProperties: portfolioData.totalProperties || 0,
        criticalIssues: portfolioData.criticalIssues || 0,
        importantIssues: portfolioData.importantIssues || 0,
        propertiesWithIssues: portfolioData.propertiesWithIssues || 0
      }
    });

  } catch (error) {
    console.error('Executive summary error:', error);

    // Return error response with basic data
    return NextResponse.json({
      error: 'Failed to generate AI summary',
      summary: 'Unable to generate executive summary at this time. Please try again later.',
      priorityLevel: 'Error',
      priorityColor: 'gray',
      healthScore: 0,
      recommendations: ['Please refresh and try again'],
      keyMetrics: request.body ? await request.json().then(d => d.keyMetrics || {}) : {}
    }, { status: 500 });
  }
}

function createDetailedContext(data: any): string {
  const properties = data.properties || [];
  const totalProperties = data.totalProperties || properties.length;
  const totalCritical = data.totalCritical || 0;
  const totalImportant = data.totalImportant || 0;

  // Separate properties by status
  const criticalProperties = properties.filter((p: any) => p.status === 'critical' || (p.criticalIssues && p.criticalIssues > 0));
  const attentionProperties = properties.filter((p: any) => p.status === 'attention' || (p.importantIssues && p.importantIssues > 0 && !p.criticalIssues));
  const healthyProperties = properties.filter((p: any) => p.status === 'ok' || (!p.criticalIssues && !p.importantIssues));

  let context = `Portfolio Overview for ${data.ownerName || 'Property Owner'}:
==========================================================
Total Properties: ${totalProperties}
Total Critical Issues: ${totalCritical}
Total Important Issues: ${totalImportant}
Properties Requiring Immediate Attention: ${criticalProperties.length}

CRITICAL PROPERTIES (${criticalProperties.length}):
==========================================================
`;

  // Add critical properties first
  if (criticalProperties.length > 0) {
    criticalProperties.forEach((prop: any, index: number) => {
      const lastInspection = prop.lastInspection || prop.latestReportDate;
      const inspectionDate = lastInspection ? new Date(lastInspection).toLocaleDateString() : 'No recent inspection';

      context += `
${index + 1}. **${prop.address}** (CRITICAL)
   - Critical Issues: ${prop.criticalIssues || 0}
   - Important Issues: ${prop.importantIssues || 0}
   - Last Inspection: ${inspectionDate}
   - Status: REQUIRES IMMEDIATE ACTION
`;
      if (prop.issues && prop.issues.length > 0) {
        context += `   - Specific Issues: ${prop.issues.join(', ')}\n`;
      }
    });
  } else {
    context += 'None - Excellent!\n';
  }

  context += `
PROPERTIES NEEDING ATTENTION (${attentionProperties.length}):
==========================================================
`;

  if (attentionProperties.length > 0) {
    // Show ALL properties needing attention, not just first 5
    attentionProperties.forEach((prop: any, index: number) => {
      const lastInspection = prop.lastInspection || prop.latestReportDate;
      const inspectionDate = lastInspection ? new Date(lastInspection).toLocaleDateString() : 'No recent inspection';

      context += `
${index + 1}. ${prop.address}
   - Important Issues: ${prop.importantIssues || 0}
   - Last Inspection: ${inspectionDate}
`;
    });
  } else {
    context += 'None\n';
  }

  context += `
HEALTHY PROPERTIES (${healthyProperties.length}):
==========================================================
`;

  if (healthyProperties.length > 0) {
    // List ALL healthy properties
    context += `${healthyProperties.length} properties in good condition:\n`;
    healthyProperties.forEach((prop: any, index: number) => {
      context += `${index + 1}. ${prop.address}\n`;
    });
  } else {
    context += 'None\n';
  }

  return context;
}

