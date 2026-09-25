export type ThemeColor = 'blue' | 'emerald' | 'purple' | 'teal' | 'amber' | 'rose';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeOption {
  id: ThemeColor;
  name: string;
  primaryLight: string;
  primaryDark: string;
  primaryContainerLight: string;
  primaryContainerDark: string;
  previewColor: string;
  description: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'blue',
    name: 'Google Blue',
    primaryLight: '#0b57d0',
    primaryDark: '#a8c7fa',
    primaryContainerLight: '#d3e3fd',
    primaryContainerDark: '#0842a0',
    previewColor: '#0b57d0',
    description: 'Classic Material 3 signature blue',
  },
  {
    id: 'emerald',
    name: 'Emerald Wealth',
    primaryLight: '#006c4c',
    primaryDark: '#6cdbaf',
    primaryContainerLight: '#8cf8cb',
    primaryContainerDark: '#005138',
    previewColor: '#10b981',
    description: 'Fresh prosperity and financial green',
  },
  {
    id: 'purple',
    name: 'Material Lavender',
    primaryLight: '#6750a4',
    primaryDark: '#d0bcff',
    primaryContainerLight: '#eaddff',
    primaryContainerDark: '#4f378b',
    previewColor: '#8b5cf6',
    description: 'Original Android Material You dynamic purple',
  },
  {
    id: 'teal',
    name: 'Ocean Teal',
    primaryLight: '#006874',
    primaryDark: '#4fd8eb',
    primaryContainerLight: '#97f0ff',
    primaryContainerDark: '#004f58',
    previewColor: '#06b6d4',
    description: 'Cool calm aquatic Material palette',
  },
  {
    id: 'amber',
    name: 'Bronze Gold',
    primaryLight: '#7a5900',
    primaryDark: '#fabd00',
    primaryContainerLight: '#ffe086',
    primaryContainerDark: '#5b4300',
    previewColor: '#f59e0b',
    description: 'Warm gold and treasury tones',
  },
  {
    id: 'rose',
    name: 'Coral Rose',
    primaryLight: '#9c4146',
    primaryDark: '#ffb3b5',
    primaryContainerLight: '#ffdadb',
    primaryContainerDark: '#7f2b30',
    previewColor: '#f43f5e',
    description: 'Vibrant modern accent palette',
  },
];
