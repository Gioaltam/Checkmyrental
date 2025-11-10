"use client";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onFocus?: () => void;
  className?: string;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search properties, addresses, or reports...",
  onFocus,
  className = ""
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Keyboard shortcut: Cmd/Ctrl + K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // Escape to clear search
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        onChange("");
        inputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onChange]);

  const handleClear = () => {
    onChange("");
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className={`relative flex items-center glass-card rounded-xl transition-all duration-200 ${
          isFocused
            ? "ring-2 ring-red-500/40 border-red-500/40"
            : "border-white/10"
        }`}
        role="search"
      >
        <Search className="absolute left-4 w-5 h-5 text-white/40" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            onFocus?.();
          }}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="w-full pl-12 pr-24 py-3 bg-transparent text-white placeholder:text-white/40 focus:outline-none"
          aria-label="Search properties, addresses, or reports"
          aria-describedby="search-help"
        />
        {value ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-14 p-1 text-white/40 hover:text-white transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
        <kbd className="absolute right-4 px-2 py-1 text-xs font-medium text-white/40 bg-white/5 border border-white/10 rounded pointer-events-none" aria-hidden="true">
          {typeof navigator !== "undefined" &&
          navigator.platform.toLowerCase().includes("mac")
            ? "⌘K"
            : "Ctrl+K"}
        </kbd>
      </div>
      <div id="search-help" className="sr-only">
        Use Command+K or Ctrl+K to focus search. Press Escape to clear.
      </div>
      {value && (
        <div className="absolute top-full mt-2 text-xs text-white/60" role="status" aria-live="polite">
          Press <kbd className="px-1 py-0.5 bg-white/5 border border-white/10 rounded">Esc</kbd> to clear
        </div>
      )}
    </div>
  );
}
