export type DigestSectionKey = 'leads' | 'payments' | 'retention' | 'classes' | 'belts' | 'ai';

export type DigestSections = Record<DigestSectionKey, boolean>;

export const DEFAULT_DIGEST_SECTIONS: DigestSections = {
  leads: true,
  payments: true,
  retention: true,
  classes: true,
  belts: true,
  ai: true,
};

export function parseDigestSections(raw: unknown): DigestSections {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_DIGEST_SECTIONS };
  }
  const obj = raw as Record<string, unknown>;
  return {
    leads: obj.leads !== false,
    payments: obj.payments !== false,
    retention: obj.retention !== false,
    classes: obj.classes !== false,
    belts: obj.belts !== false,
    ai: obj.ai !== false,
  };
}

export function recommendationSection(title: string): DigestSectionKey {
  const lower = title.toLowerCase();
  if (lower.includes('lead') || lower.includes('trial')) return 'leads';
  if (lower.includes('past due') || lower.includes('payment') || lower.includes('renewal')) {
    return 'payments';
  }
  if (lower.includes('inactive') || lower.includes('churn') || lower.includes('member')) {
    return 'retention';
  }
  if (lower.includes('class') || lower.includes('attendance') || lower.includes('cancellation')) {
    return 'classes';
  }
  if (lower.includes('promotion') || lower.includes('belt') || lower.includes('ceremony')) {
    return 'belts';
  }
  if (lower.includes('ai') || lower.includes('escalat') || lower.includes('chat')) return 'ai';
  if (lower.includes('waiver')) return 'retention';
  return 'leads';
}
