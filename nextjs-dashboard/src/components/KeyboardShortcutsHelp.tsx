"use client";
import { useState, useEffect } from "react";
import { X, Keyboard } from "lucide-react";

export default function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  // Toggle with ? key
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (
          target.tagName !== "INPUT" &&
          target.tagName !== "TEXTAREA" &&
          !target.isContentEditable
        ) {
          e.preventDefault();
          setIsOpen(!isOpen);
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isOpen]);

  const shortcuts = [
    {
      category: "Navigation",
      items: [
        { key: "⌘/Ctrl + K", description: "Focus search bar" },
        { key: "R", description: "Switch to Reports view" },
        { key: "P", description: "Open Photos for selected property" },
        { key: "H", description: "Open HVAC maintenance" },
        { key: "Esc", description: "Close modal or clear selection" },
        { key: "1-9", description: "Quick toggle property (by number)" }
      ]
    },
    {
      category: "General",
      items: [
        { key: "?", description: "Show this help dialog" },
        { key: "Tab", description: "Navigate between elements" },
        { key: "Enter", description: "Activate focused element" }
      ]
    }
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 glass-card p-3 rounded-full hover:bg-white/20 transition-all shadow-lg group"
        aria-label="Show keyboard shortcuts"
        title="Keyboard shortcuts (?)"
      >
        <Keyboard className="w-5 h-5 text-white/70 group-hover:text-white" />
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="glass-card rounded-2xl p-6 max-w-2xl w-full shadow-2xl border border-white/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Keyboard className="w-6 h-6 text-purple-400" />
            <h2 className="text-2xl font-bold text-white">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white/60 hover:text-white" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="space-y-6">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wide mb-3">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <span className="text-white/80">{item.description}</span>
                    <kbd className="px-3 py-1.5 text-sm font-mono font-medium bg-white/10 border border-white/20 rounded shadow-sm text-white/90">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-white/10 text-center text-sm text-white/60">
          Press <kbd className="px-2 py-1 bg-white/10 border border-white/20 rounded">?</kbd> to
          toggle this help dialog
        </div>
      </div>
    </div>
  );
}
