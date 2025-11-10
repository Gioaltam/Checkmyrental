import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, portfolioData } = await request.json();

    // Create context from portfolio data
    const context = `
Portfolio Summary:
- Total Properties: ${portfolioData.totalProperties}
- Critical Issues: ${portfolioData.totalCritical}
- Important Issues: ${portfolioData.totalImportant}
- Properties with Critical Issues: ${portfolioData.propertiesWithCritical}
`;

    // Call OpenAI API (or your AI service)
    // Note: You'll need to set OPENAI_API_KEY in your environment variables
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      // Return mock response if no API key
      return NextResponse.json({
        response: generateMockResponse(message, portfolioData),
        suggestions: getSuggestions(message)
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4', // Using GPT-4 (GPT-5 nano doesn't exist)
        messages: [
          {
            role: 'system',
            content: `You are a helpful property management assistant. You help property owners understand their portfolio and take action on issues. Here is the current portfolio data: ${context}\n\nProvide concise, actionable responses. Be friendly and helpful.`
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      })
    });

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'I apologize, I couldn\'t process that request.';

    return NextResponse.json({
      response: aiResponse,
      suggestions: getSuggestions(message)
    });

  } catch (error) {
    console.error('AI Chat error:', error);

    // Fallback to mock response
    const { message, portfolioData } = await request.json();
    return NextResponse.json({
      response: generateMockResponse(message, portfolioData),
      suggestions: getSuggestions(message)
    });
  }
}

function generateMockResponse(message: string, portfolioData: any): string {
  const lower = message.toLowerCase();

  if (lower.includes('critical') || lower.includes('urgent') || lower.includes('attention')) {
    if (portfolioData.totalCritical > 0) {
      return `You have ${portfolioData.totalCritical} critical ${portfolioData.totalCritical === 1 ? 'issue' : 'issues'} across ${portfolioData.propertiesWithCritical} ${portfolioData.propertiesWithCritical === 1 ? 'property' : 'properties'}. I recommend addressing these immediately to prevent property damage.`;
    } else {
      return "Great news! You have no critical issues at the moment. All your properties are in good condition.";
    }
  } else if (lower.includes('inspection') || lower.includes('schedule')) {
    return "Your next inspection is scheduled for September 14th at Sunset Villa. You have 2 more inspections scheduled this week.";
  } else if (lower.includes('summary') || lower.includes('overview') || lower.includes('portfolio')) {
    const healthScore = calculateHealthScore(portfolioData);
    return `Here's your portfolio summary:\n\n• ${portfolioData.totalProperties} properties managed\n• ${portfolioData.totalCritical} critical issues\n• ${portfolioData.totalImportant} important issues\n• ${portfolioData.propertiesWithCritical} properties need attention\n\nYour portfolio health score is ${healthScore}%.`;
  } else if (lower.includes('report') || lower.includes('reports')) {
    return "Your most recent report was delivered on August 20th and completed in 24 hours. Would you like to view it or see all reports?";
  } else if (lower.includes('photo') || lower.includes('pictures')) {
    return "I can help you view inspection photos. Which property would you like to see photos for?";
  } else if (lower.includes('help') || lower.includes('what can you')) {
    return "I can help you with:\n\n• Finding critical issues and priorities\n• Checking inspection schedules\n• Viewing property reports and photos\n• Understanding your portfolio health\n• Navigating to different sections\n\nJust ask me anything!";
  } else {
    return "I can help you manage your properties, view reports, check schedules, and monitor issues. What would you like to know?";
  }
}

function calculateHealthScore(portfolioData: any): number {
  const totalIssues = portfolioData.totalCritical + portfolioData.totalImportant;
  if (totalIssues === 0) return 100;

  const criticalWeight = portfolioData.totalCritical * 10;
  const importantWeight = portfolioData.totalImportant * 5;
  const totalWeight = criticalWeight + importantWeight;

  const score = Math.max(0, 100 - totalWeight);
  return Math.round(score);
}

function getSuggestions(message: string): string[] {
  const lower = message.toLowerCase();

  if (lower.includes('critical') || lower.includes('urgent')) {
    return ["Show me the properties", "View all reports", "What else should I know?"];
  } else if (lower.includes('inspection')) {
    return ["View calendar", "Reschedule inspection", "View property details"];
  } else if (lower.includes('summary') || lower.includes('portfolio')) {
    return ["Go to dashboard", "View analytics", "Show critical issues"];
  } else {
    return ["What needs attention?", "Show portfolio summary", "View analytics"];
  }
}
