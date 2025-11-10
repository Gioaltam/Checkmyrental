"use client";
import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Sparkles, Loader2, AlertTriangle, Home, TrendingUp } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface AIChatAssistantProps {
  portfolioData: {
    totalProperties: number;
    totalCritical: number;
    totalImportant: number;
    propertiesWithCritical: number;
  };
  onNavigate?: (tab: string) => void;
}

export default function AIChatAssistant({ portfolioData, onNavigate }: AIChatAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting: Message = {
        id: "initial",
        role: "assistant",
        content: getGreeting(),
        timestamp: new Date(),
        suggestions: [
          "What needs my attention?",
          "Show me critical issues",
          "View recent inspections",
          "Portfolio summary"
        ]
      };
      setMessages([greeting]);
    }
  }, [isOpen, messages.length]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

    if (portfolioData.totalCritical > 0) {
      return `${timeGreeting}! I noticed you have ${portfolioData.totalCritical} critical ${portfolioData.totalCritical === 1 ? "issue" : "issues"} that need attention. How can I help?`;
    }
    return `${timeGreeting}! Your portfolio looks good. What would you like to know?`;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateResponse = (userMessage: string): Message => {
    const lower = userMessage.toLowerCase();
    let content = "";
    let suggestions: string[] = [];

    // Intent detection
    if (lower.includes("critical") || lower.includes("urgent") || lower.includes("attention")) {
      if (portfolioData.totalCritical > 0) {
        content = `You have ${portfolioData.totalCritical} critical ${portfolioData.totalCritical === 1 ? "issue" : "issues"} across ${portfolioData.propertiesWithCritical} ${portfolioData.propertiesWithCritical === 1 ? "property" : "properties"}. I recommend addressing these immediately to prevent property damage.`;
        suggestions = ["Show me the properties", "View all reports", "What else should I know?"];
      } else {
        content = "Great news! You have no critical issues at the moment. All your properties are in good condition.";
        suggestions = ["Show analytics", "What about important issues?"];
      }
    } else if (lower.includes("inspection")) {
      content = "Your last inspection was completed at Sunset Villa. To arrange new inspections, please coordinate directly with your tenants for property access.";
      suggestions = ["View recent reports", "View property photos", "View property details"];
    } else if (lower.includes("summary") || lower.includes("overview") || lower.includes("portfolio")) {
      content = `Here's your portfolio summary:\n\n• ${portfolioData.totalProperties} properties managed\n• ${portfolioData.totalCritical} critical issues\n• ${portfolioData.totalImportant} important issues\n• ${portfolioData.propertiesWithCritical} properties need attention\n\nYour portfolio health score is ${calculateHealthScore()}%.`;
      suggestions = ["Go to dashboard", "View analytics", "Show critical issues"];
    } else if (lower.includes("report") || lower.includes("reports")) {
      content = "Your most recent report was delivered on August 20th and completed in 24 hours. Would you like to view it or see all reports?";
      suggestions = ["View latest report", "See all reports", "Report history"];
    } else if (lower.includes("photo") || lower.includes("pictures")) {
      content = "I can help you view inspection photos. Which property would you like to see photos for?";
      suggestions = ["Show all photos", "Recent photos", "Photos with issues"];
    } else if (lower.includes("help") || lower.includes("what can you")) {
      content = "I can help you with:\n\n• Finding critical issues and priorities\n• Viewing inspection reports and history\n• Viewing property reports and photos\n• Understanding your portfolio health\n• Navigating to different sections\n\nJust ask me anything!";
      suggestions = ["Show priorities", "Portfolio summary", "Recent inspections"];
    } else {
      content = "I can help you manage your properties, view reports, and monitor issues. What would you like to know?";
      suggestions = ["What needs attention?", "Show portfolio summary", "View analytics"];
    }

    return {
      id: Date.now().toString(),
      role: "assistant",
      content,
      timestamp: new Date(),
      suggestions
    };
  };

  const calculateHealthScore = () => {
    const totalIssues = portfolioData.totalCritical + portfolioData.totalImportant;
    if (totalIssues === 0) return 100;

    const criticalWeight = portfolioData.totalCritical * 10;
    const importantWeight = portfolioData.totalImportant * 5;
    const totalWeight = criticalWeight + importantWeight;

    const score = Math.max(0, 100 - totalWeight);
    return Math.round(score);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date()
    };

    const currentInput = input;
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Call the real AI API
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          portfolioData
        })
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        suggestions: data.suggestions
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Chat error:', error);
      // Fallback to local response
      const assistantMessage = generateResponse(currentInput);
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setTimeout(() => handleSend(), 100);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 group"
        aria-label="Open AI assistant"
      >
        <MessageCircle className="w-6 h-6 text-white" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 z-40 w-96 bg-[rgb(20,20,20)] rounded-2xl shadow-xl border border-white/10 overflow-hidden transition-all duration-300 ${
      isMinimized ? "h-14" : "h-[600px]"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-blue-600/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-white">AI Assistant</h3>
            <div className="flex items-center gap-1 text-xs text-green-400">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
              Online
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            aria-label={isMinimized ? "Maximize chat" : "Minimize chat"}
          >
            <div className="w-4 h-0.5 bg-white/60"></div>
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close chat"
          >
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 h-[calc(600px-140px)]">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-white/10 text-white/90"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-xs text-white/60">AI Assistant</span>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-line leading-relaxed">{message.content}</p>

                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {message.suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="block w-full text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-xs text-white/80 hover:text-white"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/10 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                    <span className="text-sm text-white/60">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask me anything..."
                className="flex-1 bg-white/5 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/40 outline-none border border-white/10 focus:border-blue-500 focus:bg-white/10 transition-all"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
