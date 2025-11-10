"use client";
import { useState } from "react";
import { X, Check, AlertTriangle, Info, CheckCircle, Clock, Trash2 } from "lucide-react";

interface Notification {
  id: string;
  type: "critical" | "warning" | "info" | "success";
  title: string;
  message: string;
  time: string;
  read: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
}

export default function NotificationCenter({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete
}: NotificationCenterProps) {
  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getBgColor = (type: Notification['type']) => {
    switch (type) {
      case 'critical':
        return 'bg-red-500/10 border-red-500/20';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/20';
      case 'success':
        return 'bg-green-500/10 border-green-500/20';
      default:
        return 'bg-blue-500/10 border-blue-500/20';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end pt-16 px-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-[rgb(20,20,20)] rounded-xl shadow-2xl shadow-red-500/20 border border-white/10 overflow-hidden animate-in slide-in-from-right-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-white/80 font-medium mb-1">All caught up!</p>
              <p className="text-xs text-white/60">No new notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-white/5 transition-all ${
                    !notification.read ? 'bg-white/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${getBgColor(notification.type)}`}>
                      {getIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className={`text-sm font-medium ${
                          !notification.read ? 'text-white' : 'text-white/80'
                        }`}>
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-1"></div>
                        )}
                      </div>

                      <p className="text-xs text-white/60 mb-2">{notification.message}</p>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-white/40">{notification.time}</span>

                        <div className="flex items-center gap-2">
                          {notification.actionLabel && notification.onAction && (
                            <button
                              onClick={notification.onAction}
                              className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                            >
                              {notification.actionLabel}
                            </button>
                          )}

                          {!notification.read && (
                            <button
                              onClick={() => onMarkAsRead(notification.id)}
                              className="p-1 hover:bg-white/10 rounded transition-colors"
                              title="Mark as read"
                            >
                              <Check className="w-3.5 h-3.5 text-white/60" />
                            </button>
                          )}

                          <button
                            onClick={() => onDelete(notification.id)}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-white/60" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close */}
      <div
        className="fixed inset-0 -z-10"
        onClick={onClose}
      />
    </div>
  );
}
