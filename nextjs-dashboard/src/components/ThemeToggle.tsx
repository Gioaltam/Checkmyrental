"use client";
import { useTheme } from "@/contexts/ThemeContext";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="theme-toggle-placeholder" style={{ width: "80px", height: "40px" }} />; // Placeholder
  }

  return <ThemeToggleContent />;
}

function ThemeToggleContent() {
  const { theme, toggleTheme } = useTheme();

  const handleToggle = () => {
    toggleTheme();
  };

  return (
    <button
      onClick={handleToggle}
      className="theme-toggle"
      aria-label="Toggle dark/light mode"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      <div className="toggle-track">
        <div className="toggle-thumb">
          <span className="theme-icon">
            {theme === "light" ? "☀️" : "🌙"}
          </span>
        </div>
      </div>
    </button>
  );
}
