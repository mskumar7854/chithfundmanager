import React from 'react';
import { 
  X, 
  Palette, 
  Sun, 
  Moon, 
  Laptop, 
  Check, 
  Sparkles, 
  SlidersHorizontal,
  CheckCircle2
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { THEME_OPTIONS, ThemeColor, ThemeMode } from '../types/theme';

interface ThemeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeSettingsModal: React.FC<ThemeSettingsModalProps> = ({ isOpen, onClose }) => {
  const { color, mode, isDark, setColor, setMode } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg m3-dialog p-6 overflow-hidden flex flex-col gap-5 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--m3-outline-variant)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)]">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--m3-on-surface)] flex items-center gap-2">
                <span>Material 3 Appearance</span>
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)]">
                  Dynamic UI
                </span>
              </h3>
              <p className="text-xs text-[var(--m3-on-surface-variant)]">
                Customize colors, light/dark surfaces, and Google Material You styling
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--m3-surface-container-highest)] text-[var(--m3-on-surface-variant)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: Color Mode (Light / Dark / System) */}
        <div>
          <label className="text-xs font-bold text-[var(--m3-on-surface)] uppercase tracking-wider mb-2.5 block">
            Surface Mode
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'light', label: 'Light', icon: Sun, desc: 'Clean & Crisp' },
              { id: 'dark', label: 'Dark', icon: Moon, desc: 'Deep Surface' },
              { id: 'system', label: 'System', icon: Laptop, desc: 'Auto-sync' },
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = mode === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setMode(item.id as ThemeMode)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)] border-[var(--m3-primary)] shadow-sm'
                      : 'bg-[var(--m3-surface-container)] text-[var(--m3-on-surface)] border-[var(--m3-outline-variant)] hover:bg-[var(--m3-surface-container-high)]'
                  }`}
                >
                  <Icon className="w-5 h-5 mb-1" />
                  <span className="text-xs font-bold">{item.label}</span>
                  <span className="text-[10px] opacity-75">{item.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Material 3 Dynamic Palette */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-xs font-bold text-[var(--m3-on-surface)] uppercase tracking-wider">
              Dynamic Color Palette
            </label>
            <span className="text-[11px] text-[var(--m3-on-surface-variant)]">
              {THEME_OPTIONS.find((t) => t.id === color)?.name}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {THEME_OPTIONS.map((theme) => {
              const isSelected = color === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => setColor(theme.id)}
                  className={`p-3 rounded-2xl border flex items-center gap-3 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[var(--m3-primary)] bg-[var(--m3-surface-container-high)] ring-2 ring-[var(--m3-primary)]/20 shadow-sm'
                      : 'border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container)] hover:bg-[var(--m3-surface-container-high)]'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm"
                    style={{ backgroundColor: isDark ? theme.primaryDark : theme.primaryLight }}
                  >
                    {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-[var(--m3-on-surface)] truncate">
                      {theme.name}
                    </div>
                    <div className="text-[10px] text-[var(--m3-on-surface-variant)] truncate">
                      {theme.id}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: Live Material 3 Element Preview */}
        <div className="p-4 rounded-2xl bg-[var(--m3-surface-container-low)] border border-[var(--m3-outline-variant)]">
          <div className="text-[11px] font-bold text-[var(--m3-on-surface-variant)] uppercase tracking-wider mb-2.5 flex items-center justify-between">
            <span>Material 3 Live Preview</span>
            <Sparkles className="w-3.5 h-3.5 text-[var(--m3-primary)]" />
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button className="m3-btn-primary px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Primary Button</span>
              </button>

              <button className="m3-btn-tonal px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer">
                <span>Tonal Button</span>
              </button>

              <button className="m3-btn-outlined px-3.5 py-1.5 text-xs cursor-pointer">
                <span>Outlined</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="m3-chip m3-chip-selected text-[11px] cursor-pointer">
                <span>Active Filter Chip</span>
              </span>
              <span className="m3-chip text-[11px] cursor-pointer">
                <span>Secondary Tag</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--m3-primary)] text-[var(--m3-on-primary)] text-[10px] font-bold font-mono">
                ₹50,000 Pot
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--m3-outline-variant)]">
          <button
            onClick={onClose}
            className="m3-btn-primary px-5 py-2 text-xs font-bold cursor-pointer"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
