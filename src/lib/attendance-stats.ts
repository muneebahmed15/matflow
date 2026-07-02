/** Count check-ins in the current calendar month. */
export function countThisMonth(dates: string[]): number {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  return dates.filter((d) => {
    const dt = new Date(d);
    return dt.getFullYear() === y && dt.getMonth() === m;
  }).length;
}

/** Longest streak of consecutive calendar days with at least one check-in. */
export function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const days = new Set(
    dates.map((d) => new Date(d).toISOString().split('T')[0])
  );
  const sorted = [...days].sort().reverse();

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) streak++;
    else break;
  }

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (!days.has(today) && !days.has(yesterday)) return 0;

  return streak;
}
