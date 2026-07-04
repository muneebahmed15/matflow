const CITY_SUFFIXES = ['martial arts', 'bjj', 'mma', 'kids martial arts', 'self defense'];

export function suggestSeoKeywords(input: {
  gymName: string;
  city?: string | null;
  state?: string | null;
  tagline?: string | null;
  programs?: string[];
}): string[] {
  const keywords = new Set<string>();
  const city = input.city?.trim();
  const state = input.state?.trim();
  const location = city ? (state ? `${city} ${state}` : city) : null;

  if (location) {
    for (const suffix of CITY_SUFFIXES) {
      keywords.add(`${location} ${suffix}`);
    }
    keywords.add(`${location} gym`);
    keywords.add(`${location} classes`);
  }

  if (input.gymName.trim()) {
    keywords.add(input.gymName.trim().toLowerCase());
    if (location) keywords.add(`${input.gymName.trim()} ${location}`.toLowerCase());
  }

  for (const program of input.programs ?? []) {
    const p = program.trim().toLowerCase();
    if (p) {
      keywords.add(p);
      if (location) keywords.add(`${p} ${location}`);
    }
  }

  const taglineWords = (input.tagline ?? '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 4);
  for (const word of taglineWords.slice(0, 5)) {
    keywords.add(word);
  }

  return [...keywords].slice(0, 20);
}
