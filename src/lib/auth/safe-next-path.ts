/** Reject protocol-relative and off-site redirects from ?next= query params. */
export function safeNextPath(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes(':\\')) return fallback;
  if (raw.includes('@')) return fallback;
  return raw;
}
