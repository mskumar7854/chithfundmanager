import React from 'react';
import { X, Bell, Check, Trash2, Smartphone, Volume2, Clock, CheckCircle } from 'lucide-react';
import { NotificationItem } from '../types/chit';
import { playNotificationTone, requestPushNotificationPermission } from '../utils/notifications';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onSelectNotification?: (item: NotificationItem) => void;
  soundEnabled: boolean;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onClearAll,
  onSelectNotification,
  soundEnabled,
}) => {
  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const testPush = async () => {
    await requestPushNotificationPermission();
    if (soundEnabled) {
      playNotificationTone('reminder');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="m3-dialog w-full max-w-lg overflow-hidden my-6">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--m3-outline-variant)] flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)] flex items-center justify-center font-bold">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[var(--m3-on-surface)]">Notifications & Alerts</h2>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--m3-on-surface-variant)] mt-0.5">Payment deadlines, auction results, and automated cron alerts</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--m3-on-surface-variant)] hover:text-[var(--m3-on-surface)] hover:bg-[var(--m3-surface-container-highest)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="px-5 py-2.5 bg-[var(--m3-surface-container-low)] border-b border-[var(--m3-outline-variant)] flex items-center justify-between text-xs text-[var(--m3-on-surface-variant)]">
          <button
            onClick={testPush}
            className="text-[var(--m3-primary)] hover:underline flex items-center gap-1 cursor-pointer font-bold"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Test Push / Audio</span>
          </button>

          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="hover:text-[var(--m3-on-surface)] flex items-center gap-1 cursor-pointer font-medium"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark read</span>
              </button>
            )}

            {notifications.length > 0 && (
              <button
                onClick={onClearAll}
                className="hover:text-rose-500 flex items-center gap-1 cursor-pointer font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="p-4 space-y-2.5 max-h-[60vh] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-[var(--m3-on-surface-variant)] opacity-70 text-xs">
              No notifications yet. You will see alerts when the 8:00 AM Cron scans run or auctions finalize.
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl border text-xs transition-all ${
                  item.read
                    ? 'bg-[var(--m3-surface-container-low)] border-[var(--m3-outline-variant)] text-[var(--m3-on-surface-variant)] opacity-80'
                    : 'bg-[var(--m3-surface-container)] border-[var(--m3-primary)]/40 text-[var(--m3-on-surface)] shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--m3-primary)] shrink-0" />
                    <h4 className="font-bold text-[var(--m3-on-surface)] text-xs">{item.title}</h4>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--m3-on-surface-variant)] opacity-75 shrink-0">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p className="mt-1.5 text-xs text-[var(--m3-on-surface)] pl-4 leading-relaxed opacity-90">
                  {item.message}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
