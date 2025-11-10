"use client";
import { useEffect, useState } from "react";
import { Calendar, Sunrise, Sun, Sunset, Moon, Lightbulb, CheckCircle2 } from "lucide-react";

interface DashboardGreetingProps {
  ownerName?: string;
}

export default function DashboardGreeting({ ownerName = "Owner" }: DashboardGreetingProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState("");
  const [greetingIcon, setGreetingIcon] = useState<React.ReactNode>(null);

  useEffect(() => {
    const updateTimeAndGreeting = () => {
      const now = new Date();
      setCurrentTime(now);

      const hour = now.getHours();

      if (hour >= 5 && hour < 12) {
        setGreeting("Good Morning");
        setGreetingIcon(<Sunrise className="w-5 h-5 text-orange-400" />);
      } else if (hour >= 12 && hour < 17) {
        setGreeting("Good Afternoon");
        setGreetingIcon(<Sun className="w-5 h-5 text-yellow-400" />);
      } else if (hour >= 17 && hour < 21) {
        setGreeting("Good Evening");
        setGreetingIcon(<Sunset className="w-5 h-5 text-orange-500" />);
      } else {
        setGreeting("Good Evening");
        setGreetingIcon(<Moon className="w-5 h-5 text-blue-300" />);
      }
    };

    updateTimeAndGreeting();
    const timer = setInterval(updateTimeAndGreeting, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const dailyMessages = [
    "Regular maintenance keeps your properties in top condition.",
    "Stay proactive with inspections to prevent costly repairs.",
    "A well-maintained property retains its value over time.",
    "Early detection of issues saves money in the long run.",
    "Your properties are looking great! Keep up the good work.",
    "Consistent care today means fewer problems tomorrow.",
    "Quality maintenance leads to happy tenants and higher returns.",
  ];

  const dayOfYear = Math.floor((currentTime.getTime() - new Date(currentTime.getFullYear(), 0, 0).getTime()) / 86400000);
  const dailyMessage = dailyMessages[dayOfYear % dailyMessages.length];

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="glass-card rounded-2xl p-6 sm:p-8 mb-6 border border-white/10 shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="flex-1">
          {/* Greeting */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20">
              {greetingIcon}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              {greeting}, <span className="bg-gradient-to-r from-white to-white/90 bg-clip-text text-transparent">{ownerName}</span>
            </h1>
          </div>

          {/* Date and Time */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="flex items-center gap-2 text-white/70">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">{formatDate(currentTime)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-white/30"></div>
              <span className="text-sm font-medium text-white/50">
                {formatTime(currentTime)}
              </span>
            </div>
          </div>

          {/* Daily Tip */}
          <div className="inline-flex items-start gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500/15 to-purple-500/10 border border-blue-400/20 backdrop-blur-sm">
            <Lightbulb className="w-4 h-4 text-blue-300 mt-0.5 flex-shrink-0" />
            <p className="text-sm font-medium text-blue-200/90 leading-relaxed">
              {dailyMessage}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="hidden lg:flex flex-col items-end">
          <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-sm font-semibold text-white/90">All Systems Operational</span>
            </div>
            <div className="text-xs text-white/50 text-right">
              Dashboard Overview
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
