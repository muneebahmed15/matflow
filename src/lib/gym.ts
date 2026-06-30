/** Slugify a gym name for URL-safe identifiers. */
export function slugifyGymName(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'my-gym';
}

/** Default gym name for a newly registered owner. */
export function defaultGymName(metadata: Record<string, unknown> | undefined): string {
  const first = typeof metadata?.first_name === 'string' ? metadata.first_name.trim() : '';
  const last = typeof metadata?.last_name === 'string' ? metadata.last_name.trim() : '';
  if (first && last) return `${first} ${last}'s Gym`;
  if (first) return `${first}'s Gym`;
  return 'My Gym';
}
