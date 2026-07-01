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
};
