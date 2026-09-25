import React, { useState, useRef, useEffect } from 'react';
import { 
  Bell, 
  RotateCcw, 
  Clock, 
  PlusCircle, 
  Volume2, 
  VolumeX, 
  Download, 
  Upload,
  Smartphone,
  ShieldCheck, 
  CheckCircle2,
  ChevronDown,
  Layers,
  Plus,
  Check,
  Palette,
  Sun,
  Moon
} from 'lucide-react';
import { ChitGroup, NotificationItem } from '../types/chit';
import { formatCurrency } from '../utils/calculations';
import { requestPushNotificationPermission } from '../utils/notifications';
import { useTheme } from '../context/ThemeContext';
import { THEME_OPTIONS } from '../types/theme';

interface NavbarProps {
  group: ChitGroup | null;
  groups: ChitGroup[];
  activeGroupId: string;
  onSelectGroup: (groupId: string) => void;
  onOpenCreatePlanModal: () => void;
  onOpenThemeSettings: () => void;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  unreadCount: number;
  onOpenNotifications: () => void;
  onRunCronScan: () => void;
  onOpenAuctionRunner: () => void;
  onResetData: () => void;
  onExportData: () => void;
  onImportData: (data: any) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  group,
  groups,
  activeGroupId,
  onSelectGroup,
  onOpenCreatePlanModal,
  onOpenThemeSettings,
  currentTab,
  setCurrentTab,
  unreadCount,
  onOpenNotifications,
  onRunCronScan,
  onOpenAuctionRunner,
  onResetData,
  onExportData,
  onImportData,
  soundEnabled,
  setSoundEnabled,
}) => {
  const { color, isDark, toggleMode } = useTheme();
  const [pushStatus, setPushStatus] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [isPlanDropdownOpen, setIsPlanDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        onImportData(json);
      } catch (err) {
        onImportData(null);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsPlanDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEnablePush = async () => {
    const granted = await requestPushNotificationPermission();
    setPushStatus(granted ? 'granted' : 'denied');
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'plans', label: `Chit Plans (${groups.length})` },
    { id: 'ledger', label: 'Payments Ledger' },
    { id: 'auctions', label: 'Auctions & Payouts' },
    { id: 'members', label: 'Members' },
    { id: 'reminders', label: 'Automation & Cron' },
  ];

  const currentTheme = THEME_OPTIONS.find((t) => t.id === color) || THEME_OPTIONS[0];

  return (
    <header className="sticky top-0 z-40 bg-[var(--m3-surface)]/95 backdrop-blur-md border-b border-[var(--m3-outline-variant)] transition-colors">
      {/* Top Utility Ribbon with Material 3 context & Theme toggles */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-3 text-xs border-b border-[var(--m3-outline-variant)]/60 text-[var(--m3-on-surface-variant)]">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {group ? (
            <>
              {/* Plan Selector Trigger */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsPlanDropdownOpen(!isPlanDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--m3-surface-container)] hover:bg-[var(--m3-surface-container-high)] border border-[var(--m3-outline-variant)] text-[var(--m3-on-surface)] font-semibold transition-all cursor-pointer shadow-xs group"
                >
                  <span className="w-2 h-2 rounded-full bg-[var(--m3-primary)] animate-pulse"></span>
                  <span className="max-w-[160px] sm:max-w-xs truncate">{group.name}</span>
                  <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform ${isPlanDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Plan Switcher Dropdown */}
                {isPlanDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-80 sm:w-96 m3-dialog z-50 p-2 space-y-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100 shadow-xl">
                    <div className="px-3 py-2 border-b border-[var(--m3-outline-variant)] flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[var(--m3-on-surface-variant)] uppercase tracking-wider">
                        Select Chit Fund Plan
                      </span>
                      <button
                        onClick={() => {
                          setIsPlanDropdownOpen(false);
                          onOpenCreatePlanModal();
                        }}
                        className="text-xs text-[var(--m3-primary)] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>New Plan</span>
                      </button>
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-1 p-1">
                      {groups.map((g) => {
                        const isSelected = g.id === activeGroupId;
                        return (
                          <button
                            key={g.id}
                            onClick={() => {
                              onSelectGroup(g.id);
                              setIsPlanDropdownOpen(false);
                            }}
                            className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)] font-semibold'
                                : 'hover:bg-[var(--m3-surface-container-high)] text-[var(--m3-on-surface)]'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs truncate">{g.name}</span>
                                {isSelected && (
                                  <span className="text-[10px] bg-[var(--m3-primary)] text-[var(--m3-on-primary)] font-bold px-1.5 py-0.2 rounded-full">
                                    ACTIVE
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] opacity-80 mt-0.5 font-mono">
                                <span className="font-bold">{formatCurrency(g.totalPot)}</span>
                                <span>·</span>
                                <span>{g.durationMonths} Mo</span>
                                <span>·</span>
                                <span>{g.memberCount} M</span>
                                <span>·</span>
                                <span>Fee: {formatCurrency(g.organizerFee)}</span>
                              </div>
                            </div>

                            {isSelected && <Check className="w-4 h-4 text-[var(--m3-primary)] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-2 border-t border-[var(--m3-outline-variant)] px-2 py-1 flex items-center justify-between text-[11px]">
                      <button
                        onClick={() => {
                          setIsPlanDropdownOpen(false);
                          setCurrentTab('plans');
                        }}
                        className="text-[var(--m3-on-surface-variant)] hover:text-[var(--m3-on-surface)] font-medium cursor-pointer"
                      >
                        View All Plans & Schemes →
                      </button>
                      <button
                        onClick={() => {
                          setIsPlanDropdownOpen(false);
                          onOpenCreatePlanModal();
                        }}
                        className="m3-btn-primary px-3 py-1 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Plan</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <span className="opacity-40 hidden sm:inline">·</span>
              <span>Pot: <strong className="font-mono text-[var(--m3-primary)] font-bold">{formatCurrency(group.totalPot)}</strong></span>
              <span className="opacity-40 hidden sm:inline">·</span>
              <span className="hidden sm:inline">Members: <strong className="font-mono">{group.memberCount}</strong></span>
              <span className="opacity-40 hidden sm:inline">·</span>
              <span>Cycle: <strong className="font-mono text-[var(--m3-secondary)]">Month {group.currentMonth}/{group.durationMonths}</strong></span>
              <span className="opacity-40 hidden sm:inline">·</span>
              <span className="hidden md:inline">Fee: <strong className="font-mono">{formatCurrency(group.organizerFee)}/mo</strong></span>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--m3-on-surface-variant)]">No chit plans created yet</span>
              <button
                onClick={onOpenCreatePlanModal}
                className="m3-btn-primary px-2.5 py-0.5 text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Create Plan</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Tools: Theme Color Picker, Dark Mode, Push, Audio, Backup */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Material 3 Color Theme Button */}
          <button
            onClick={onOpenThemeSettings}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--m3-surface-container)] hover:bg-[var(--m3-surface-container-high)] border border-[var(--m3-outline-variant)] text-[var(--m3-on-surface)] text-xs font-medium transition-all cursor-pointer"
            title="Material 3 Theme & Color Settings"
          >
            <div
              className="w-3 h-3 rounded-full shadow-xs ring-1 ring-black/10"
              style={{ backgroundColor: isDark ? currentTheme.primaryDark : currentTheme.primaryLight }}
            />
            <span className="hidden sm:inline">{currentTheme.name}</span>
            <Palette className="w-3.5 h-3.5 opacity-70" />
          </button>

          {/* Light / Dark Mode Toggle */}
          <button
            onClick={toggleMode}
            className="p-1.5 rounded-full hover:bg-[var(--m3-surface-container-high)] text-[var(--m3-on-surface-variant)] hover:text-[var(--m3-on-surface)] transition-colors cursor-pointer"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          <span className="opacity-40">·</span>

          {pushStatus !== 'granted' ? (
            <button
              onClick={handleEnablePush}
              className="flex items-center gap-1 text-[var(--m3-on-surface-variant)] hover:text-[var(--m3-on-surface)] transition-colors cursor-pointer"
              title="Enable Browser Notifications for Payment Reminders"
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Push Alerts</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 text-[var(--m3-primary)] font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Alerts On</span>
            </div>
          )}

          <span className="opacity-40">·</span>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="flex items-center gap-1 text-[var(--m3-on-surface-variant)] hover:text-[var(--m3-on-surface)] transition-colors cursor-pointer"
            title={soundEnabled ? 'Mute Chimes' : 'Enable Chimes'}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 opacity-80" />
                <span className="hidden sm:inline">Audio</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 opacity-50" />
                <span className="hidden sm:inline">Muted</span>
              </>
            )}
          </button>

          <span className="opacity-40">·</span>

          <button
            onClick={onExportData}
            className="flex items-center gap-1 text-[var(--m3-on-surface-variant)] hover:text-[var(--m3-on-surface)] transition-colors cursor-pointer"
            title="Download JSON Ledger Backup"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Backup</span>
          </button>

          <span className="opacity-40">·</span>

          <input
            type="file"
            ref={fileInputRef}
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 text-[var(--m3-on-surface-variant)] hover:text-[var(--m3-on-surface)] transition-colors cursor-pointer"
            title="Restore from JSON Backup File"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Restore</span>
          </button>

          <span className="opacity-40">·</span>

          <button
            onClick={onResetData}
            className="flex items-center gap-1 text-[var(--m3-on-surface-variant)] hover:text-rose-500 transition-colors cursor-pointer"
            title="Reset to Initial Sample Data"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Main Material 3 Top App Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--m3-primary)] text-[var(--m3-on-primary)] flex items-center justify-center shadow-sm font-bold text-xl font-mono">
            ₹
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-[var(--m3-on-surface)] text-base sm:text-lg tracking-tight">ChitLedger</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)]">
                Admin
              </span>
            </div>
            <p className="text-xs text-[var(--m3-on-surface-variant)] hidden sm:block">Automated Chit Fund Manager & Dividend Ledger</p>
          </div>
        </div>

        {/* Navigation Tabs (Material 3 Segmented / Pill Style) */}
        <nav className="hidden md:flex items-center gap-1.5 bg-[var(--m3-surface-container-low)] p-1.5 rounded-full border border-[var(--m3-outline-variant)]">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)] shadow-xs'
                    : 'text-[var(--m3-on-surface-variant)] hover:text-[var(--m3-on-surface)] hover:bg-[var(--m3-surface-container-high)]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Action Controls (Material 3 Buttons) */}
        <div className="flex items-center gap-2">
          {/* Add Plan Button */}
          <button
            onClick={onOpenCreatePlanModal}
            className="m3-btn-tonal flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all cursor-pointer"
            title="Create a new Chit Fund Plan"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Plan</span>
          </button>

          {/* Quick Auction Trigger Button */}
          <button
            onClick={onOpenAuctionRunner}
            className="m3-btn-primary flex items-center gap-1.5 px-4 py-2 text-xs font-bold transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Run</span> Auction
          </button>

          {/* Quick Cron Trigger */}
          <button
            onClick={onRunCronScan}
            className="m3-btn-tonal flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all cursor-pointer"
            title="Simulate daily 8:00 AM Cron scan for pending dues"
          >
            <Clock className="w-3.5 h-3.5 opacity-80" />
            <span className="hidden lg:inline">8 AM Cron</span>
          </button>

          {/* Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2.5 rounded-full hover:bg-[var(--m3-surface-container-high)] text-[var(--m3-on-surface-variant)] hover:text-[var(--m3-on-surface)] transition-colors cursor-pointer border border-[var(--m3-outline-variant)]"
            title="Notifications and Dues Alerts"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-mono text-[10px] flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Nav Tabs */}
      <div className="md:hidden flex items-center overflow-x-auto px-4 py-2 border-t border-[var(--m3-outline-variant)] gap-1 scrollbar-none bg-[var(--m3-surface-container-low)]">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`px-3 py-1.5 text-xs whitespace-nowrap font-medium rounded-full cursor-pointer transition-all ${
                isActive
                  ? 'bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)] font-bold'
                  : 'text-[var(--m3-on-surface-variant)] hover:text-[var(--m3-on-surface)]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
