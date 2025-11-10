"use client";
import { useState, useRef, useEffect } from "react";
import { MoreVertical, Star, Download, Share2, FileText, Image, Edit3, Clock } from "lucide-react";

interface Property {
  id: string;
  name: string;
  address: string;
  reports: any[];
  photos: any[];
}

interface QuickActionsMenuProps {
  property: Property;
  isPinned?: boolean;
  onPin?: () => void;
  onDownloadReports?: () => void;
  onDownloadPhotos?: () => void;
  onSetNickname?: () => void;
  onShare?: () => void;
  onViewHistory?: () => void;
}

export default function QuickActionsMenu({
  property,
  isPinned = false,
  onPin,
  onDownloadReports,
  onDownloadPhotos,
  onSetNickname,
  onShare,
  onViewHistory
}: QuickActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const menuItems = [
    {
      icon: Star,
      label: isPinned ? "Unpin Property" : "Pin Property",
      onClick: () => {
        onPin?.();
        setIsOpen(false);
      },
      className: isPinned ? "text-yellow-400" : ""
    },
    {
      icon: FileText,
      label: "Download All Reports",
      onClick: () => {
        onDownloadReports?.();
        setIsOpen(false);
      },
      disabled: property.reports.length === 0
    },
    {
      icon: Image,
      label: "Download All Photos",
      onClick: () => {
        onDownloadPhotos?.();
        setIsOpen(false);
      },
      disabled: property.photos.length === 0
    },
    {
      icon: Edit3,
      label: "Set Nickname",
      onClick: () => {
        onSetNickname?.();
        setIsOpen(false);
      }
    },
    {
      icon: Share2,
      label: "Share Property Report",
      onClick: () => {
        onShare?.();
        setIsOpen(false);
      }
    },
    {
      icon: Clock,
      label: "View Maintenance History",
      onClick: () => {
        onViewHistory?.();
        setIsOpen(false);
      }
    }
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 hover:bg-white/10 rounded-lg transition-colors group"
        aria-label="Quick actions"
        aria-expanded={isOpen}
      >
        <MoreVertical className="w-5 h-5 text-white/60 group-hover:text-white" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 glass-card rounded-xl shadow-2xl border border-white/20 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="py-2">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={index}
                  onClick={item.onClick}
                  disabled={item.disabled}
                  className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/10 transition-colors text-left ${
                    item.disabled
                      ? "opacity-40 cursor-not-allowed"
                      : "cursor-pointer"
                  } ${item.className || ""}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
