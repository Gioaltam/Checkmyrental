import { useEffect, useCallback } from "react";

interface KeyboardNavigationOptions {
  onReportsView?: () => void;
  onPhotosView?: (propertyId: string) => void;
  onHVACView?: (propertyId: string) => void;
  onNumberKeyPress?: (index: number) => void;
  onEscape?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onEnter?: () => void;
  enabled?: boolean;
  properties?: Array<{ id: string }>;
}

export function useKeyboardNavigation({
  onReportsView,
  onPhotosView,
  onHVACView,
  onNumberKeyPress,
  onEscape,
  onArrowUp,
  onArrowDown,
  onEnter,
  enabled = true,
  properties = []
}: KeyboardNavigationOptions) {
  const handleKeyPress = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Keyboard shortcuts
      switch (e.key.toLowerCase()) {
        case "r":
          e.preventDefault();
          onReportsView?.();
          break;

        case "p":
          if (properties.length > 0 && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            // Open photos for first selected/expanded property
            onPhotosView?.(properties[0].id);
          }
          break;

        case "h":
          if (properties.length > 0) {
            e.preventDefault();
            onHVACView?.(properties[0].id);
          }
          break;

        case "escape":
          e.preventDefault();
          onEscape?.();
          break;

        case "arrowup":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            onArrowUp?.();
          }
          break;

        case "arrowdown":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            onArrowDown?.();
          }
          break;

        case "enter":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            onEnter?.();
          }
          break;

        // Number keys 1-9 for quick property access
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
          if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
            e.preventDefault();
            const index = parseInt(e.key) - 1;
            if (index < properties.length) {
              onNumberKeyPress?.(index);
            }
          }
          break;
      }
    },
    [
      enabled,
      onReportsView,
      onPhotosView,
      onHVACView,
      onNumberKeyPress,
      onEscape,
      onArrowUp,
      onArrowDown,
      onEnter,
      properties
    ]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handleKeyPress, enabled]);

  return {
    // Utility functions for focus management
    focusFirstProperty: () => {
      const firstProperty = document.querySelector('[data-property-card]') as HTMLElement;
      firstProperty?.focus();
    },
    focusNextProperty: () => {
      const active = document.activeElement as HTMLElement;
      const next = active?.nextElementSibling as HTMLElement;
      if (next && next.hasAttribute('data-property-card')) {
        next.focus();
      }
    },
    focusPreviousProperty: () => {
      const active = document.activeElement as HTMLElement;
      const prev = active?.previousElementSibling as HTMLElement;
      if (prev && prev.hasAttribute('data-property-card')) {
        prev.focus();
      }
    }
  };
}
