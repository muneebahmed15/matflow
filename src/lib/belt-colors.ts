import type { CSSProperties } from 'react';

export const BELT_RANKS = [
  'white',
  'yellow',
  'orange',
  'green',
  'blue',
  'purple',
  'brown',
  'black',
] as const;

export const BELT_COLORS: Record<string, string> = {
  white: 'bg-white/10 text-white',
  yellow: 'bg-yellow-500/20 text-yellow-400',
  orange: 'bg-orange-500/20 text-orange-400',
  green: 'bg-green-500/20 text-green-400',
  blue: 'bg-blue-500/20 text-blue-400',
  purple: 'bg-purple-500/20 text-purple-400',
  brown: 'bg-amber-700/20 text-amber-500',
  black: 'bg-white/5 text-white/60',
  grey: 'bg-white/10 text-white/50',
  gray: 'bg-white/10 text-white/50',
  red: 'bg-red-500/20 text-red-400',
};

const DEFAULT_HEX: Record<string, string> = {
  white: '#ffffff',
  yellow: '#eab308',
  orange: '#f97316',
  green: '#22c55e',
  blue: '#3b82f6',
  purple: '#a855f7',
  brown: '#b45309',
  black: '#525252',
  grey: '#9ca3af',
  gray: '#9ca3af',
  red: '#ef4444',
};

/** Tailwind badge classes, with optional per-gym hex overrides rendered inline. */
export function getBeltBadgeStyle(
  belt: string,
  overrides?: Record<string, string> | null
): { className: string; style?: CSSProperties } {
  const key = belt.trim().toLowerCase();
  const hex = overrides?.[key];
  if (hex && /^#[0-9A-Fa-f]{6}$/.test(hex)) {
    return {
      className: 'capitalize text-xs font-medium px-2.5 py-0.5 rounded-full border border-white/10',
      style: { backgroundColor: `${hex}33`, color: hex },
    };
  }
  return {
    className: `capitalize text-xs font-medium px-2.5 py-0.5 rounded-full ${BELT_COLORS[key] ?? 'bg-white/5 text-white/40'}`,
  };
}

export function defaultBeltHex(belt: string): string {
  return DEFAULT_HEX[belt.trim().toLowerCase()] ?? '#6b7280';
}
