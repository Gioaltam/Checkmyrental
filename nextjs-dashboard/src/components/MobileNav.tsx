"use client";
import { Home, Building2, TrendingUp, Settings, Bell } from "lucide-react";

interface MobileNavProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  notificationCount?: number;
}

export default function MobileNav({ activeTab, onNavigate, notificationCount = 0 }: MobileNavProps) {
  const navItems = [
    { id: "overview", label: "Home", icon: Home },
    { id: "properties", label: "Properties", icon: Building2 },
    { id: "analytics", label: "Analytics", icon: TrendingUp },
    { id: "notifications", label: "Alerts", icon: Bell, badge: notificationCount },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[rgb(20,20,20)] border-t border-white/10 backdrop-blur-xl safe-area-pb">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all min-w-[72px] ${
                isActive
                  ? "bg-red-500/20 text-red-400"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? "animate-bounce-subtle" : ""}`} />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-xs font-medium transition-all ${
                  isActive ? "opacity-100 scale-100" : "opacity-70 scale-95"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Safe area for iOS devices */}
      <div className="h-[env(safe-area-inset-bottom)]"></div>
    </nav>
  );
}
