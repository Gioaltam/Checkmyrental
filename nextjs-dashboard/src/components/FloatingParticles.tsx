"use client";
import { useEffect, useState } from "react";

export default function FloatingParticles() {
  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    // Check for light mode
    const checkTheme = () => {
      const htmlElement = document.documentElement;
      setIsLightMode(htmlElement.classList.contains('light-mode'));
    };

    checkTheme();

    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Subtle ambient background gradient - blue */}
      <div
        className="absolute inset-0 transition-all duration-300 ease-in-out"
        style={{
          background: isLightMode
            ? 'transparent'
            : 'radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.03) 0%, transparent 50%)',
        }}
      />

      {/* Second subtle gradient spot */}
      <div
        className="absolute inset-0 transition-all duration-300 ease-in-out"
        style={{
          background: isLightMode
            ? 'transparent'
            : 'radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.02) 0%, transparent 50%)',
        }}
      />
    </div>
  );
}
