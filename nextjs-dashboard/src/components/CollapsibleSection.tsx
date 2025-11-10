"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  icon?: React.ReactNode;
}

export default function CollapsibleSection({
  title,
  children,
  defaultExpanded = true,
  icon
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="space-y-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between group hover:bg-white/5 rounded-lg p-3 transition-all"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-red-400">{icon}</span>}
          <h2 className="text-lg font-semibold group-hover:text-red-400 transition-colors">
            {title}
          </h2>
        </div>
        <ChevronDown
          className={`w-5 h-5 transition-transform duration-300 group-hover:text-red-400 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ${
          isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
