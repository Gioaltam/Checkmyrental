"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import PropertyAccordion from "./PropertyAccordion";

interface Property {
  id: string;
  name: string;
  address: string;
  status?: "ok" | "attention" | "critical";
  lastInspection?: string;
  latestReport?: any;
  reports: any[];
  photos: any[];
}

interface LazyPropertyListProps {
  properties: Property[];
  onOpenReport: (report: any) => void;
  onOpenPhotos: (property: Property) => void;
  onOpenHVAC: (address: string) => void;
  expandedProperty: string | null;
  onToggleProperty: (id: string) => void;
  selectedYear: string;
  selectedQuarter: string;
  onYearChange: (year: string) => void;
  onQuarterChange: (quarter: string) => void;
  expandedReports: Record<string, boolean>;
  onToggleReports: (id: string) => void;
  pinnedProperties: Set<string>;
  onPin: (id: string) => void;
  selectedProperties?: Set<string>;
  onSelectProperty?: (id: string, checked: boolean) => void;
  showCheckboxes?: boolean;
}

export default function LazyPropertyList({
  properties,
  onOpenReport,
  onOpenPhotos,
  onOpenHVAC,
  expandedProperty,
  onToggleProperty,
  selectedYear,
  selectedQuarter,
  onYearChange,
  onQuarterChange,
  expandedReports,
  onToggleReports,
  pinnedProperties,
  onPin,
  selectedProperties,
  onSelectProperty,
  showCheckboxes = false
}: LazyPropertyListProps) {
  const [visibleCount, setVisibleCount] = useState(10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Load more properties when user scrolls to bottom
  const loadMore = useCallback(() => {
    if (visibleCount >= properties.length) return;

    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount(prev => Math.min(prev + 10, properties.length));
      setIsLoadingMore(false);
    }, 300); // Simulate loading delay
  }, [visibleCount, properties.length]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMore, isLoadingMore]);

  const visibleProperties = properties.slice(0, visibleCount);
  const hasMore = visibleCount < properties.length;

  return (
    <div className="space-y-4">
      {/* Property List */}
      {visibleProperties.map((property, index) => (
        <PropertyAccordion
          key={property.id}
          property={property}
          isExpanded={expandedProperty === property.id}
          onToggle={() => onToggleProperty(property.id)}
          onOpenReport={onOpenReport}
          onOpenPhotos={() => onOpenPhotos(property)}
          onOpenHVAC={() => onOpenHVAC(property.address)}
          selectedYear={selectedYear}
          selectedQuarter={selectedQuarter}
          onYearChange={onYearChange}
          onQuarterChange={onQuarterChange}
          showAllReports={expandedReports[property.id] || false}
          onToggleReports={() => onToggleReports(property.id)}
          isPinned={pinnedProperties.has(property.id)}
          onPin={() => onPin(property.id)}
          showCheckbox={showCheckboxes}
          isSelected={selectedProperties?.has(property.id) || false}
          onSelect={onSelectProperty ? (e) => onSelectProperty(property.id, e.target.checked) : undefined}
        />
      ))}

      {/* Loading Indicator / Load More Trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="py-8 flex flex-col items-center gap-3">
          {isLoadingMore ? (
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
              <span className="text-white/60 text-sm">Loading more properties...</span>
            </div>
          ) : (
            <button
              onClick={loadMore}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white font-medium transition-all"
            >
              Load More ({properties.length - visibleCount} remaining)
            </button>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="text-center text-white/60 text-sm py-4">
        Showing {visibleCount} of {properties.length} properties
      </div>
    </div>
  );
}
