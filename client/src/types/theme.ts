export type ThemeMode = 'light' | 'dark';

export interface AccentColorDefinition {
  primary: string;
  primaryContainer: string;
  onPrimary: string;
  glow: string;
}

export interface AccentColorPreset {
  id: string;
  name: string;
  description: string;
  swatchHex: string;
  light: AccentColorDefinition;
  dark: AccentColorDefinition;
}

export const ACCENT_COLOR_PRESETS: AccentColorPreset[] = [
  {
    id: 'rose',
    name: 'Hồng phấn (Pastel Rose)',
    description: 'Tông hồng nhạt thanh lịch, dịu mắt',
    swatchHex: '#fb7185',
    light: {
      primary: '#e11d48',
      primaryContainer: '#f43f5e',
      onPrimary: '#ffffff',
      glow: 'rgba(244, 63, 94, 0.45)',
    },
    dark: {
      primary: '#fda4af',
      primaryContainer: '#e11d48',
      onPrimary: '#ffffff',
      glow: 'rgba(244, 63, 94, 0.55)',
    },
  },
  {
    id: 'lavender',
    name: 'Tím nhạt (Soft Lavender)',
    description: 'Tím hoa cà nhẹ nhàng, hiện đại',
    swatchHex: '#a78bfa',
    light: {
      primary: '#7c3aed',
      primaryContainer: '#8b5cf6',
      onPrimary: '#ffffff',
      glow: 'rgba(139, 92, 246, 0.45)',
    },
    dark: {
      primary: '#c4b5fd',
      primaryContainer: '#7c3aed',
      onPrimary: '#ffffff',
      glow: 'rgba(124, 58, 237, 0.55)',
    },
  },
  {
    id: 'mint',
    name: 'Bạc hà nhạt (Pastel Mint)',
    description: 'Xanh ngọc bạc hà mát mẻ, tinh tế',
    swatchHex: '#34d399',
    light: {
      primary: '#059669',
      primaryContainer: '#10b981',
      onPrimary: '#ffffff',
      glow: 'rgba(16, 185, 129, 0.45)',
    },
    dark: {
      primary: '#6ee7b7',
      primaryContainer: '#059669',
      onPrimary: '#ffffff',
      glow: 'rgba(16, 185, 129, 0.55)',
    },
  },
  {
    id: 'sky',
    name: 'Lam nhạt (Soft Sky)',
    description: 'Xanh da trời thanh khiết Apple style',
    swatchHex: '#38bdf8',
    light: {
      primary: '#0284c7',
      primaryContainer: '#0ea5e9',
      onPrimary: '#ffffff',
      glow: 'rgba(14, 165, 233, 0.45)',
    },
    dark: {
      primary: '#7dd3fc',
      primaryContainer: '#0284c7',
      onPrimary: '#ffffff',
      glow: 'rgba(2, 132, 199, 0.55)',
    },
  },
  {
    id: 'peach',
    name: 'Cam đào nhạt (Pastel Peach)',
    description: 'Sắc đào ấm áp, thân thiện',
    swatchHex: '#fb923c',
    light: {
      primary: '#ea580c',
      primaryContainer: '#f97316',
      onPrimary: '#ffffff',
      glow: 'rgba(249, 115, 22, 0.45)',
    },
    dark: {
      primary: '#fdba74',
      primaryContainer: '#ea580c',
      onPrimary: '#ffffff',
      glow: 'rgba(234, 88, 12, 0.55)',
    },
  },
  {
    id: 'indigo',
    name: 'Indigo Cổ điển (Original)',
    description: 'Tím than đậm phong cách DocStack gốc',
    swatchHex: '#6366f1',
    light: {
      primary: '#4f46e5',
      primaryContainer: '#4f46e5',
      onPrimary: '#ffffff',
      glow: 'rgba(79, 70, 229, 0.45)',
    },
    dark: {
      primary: '#c3c0ff',
      primaryContainer: '#4f46e5',
      onPrimary: '#1d00a5',
      glow: 'rgba(79, 70, 229, 0.55)',
    },
  },
];
