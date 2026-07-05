import sharp from 'sharp';
import { BELT_COLORS } from '@/lib/belt-colors';

export type BeltShareImageInput = {
  gymName: string;
  memberName: string;
  fromBelt: string;
  toBelt: string;
  promotedAt: string;
};

function beltHex(belt: string): string {
  const cls = BELT_COLORS[belt.toLowerCase()] ?? '';
  if (cls.includes('yellow')) return '#eab308';
  if (cls.includes('orange')) return '#f97316';
  if (cls.includes('green')) return '#22c55e';
  if (cls.includes('blue')) return '#3b82f6';
  if (cls.includes('purple')) return '#a855f7';
  if (cls.includes('brown')) return '#92400e';
  if (cls.includes('black')) return '#171717';
  if (cls.includes('white')) return '#f5f5f5';
  if (cls.includes('red')) return '#ef4444';
  return '#64748b';
}

/** Generate a 1200×630 PNG share card for belt promotions. */
export async function buildBeltSharePng(input: BeltShareImageInput): Promise<Buffer> {
  const dateStr = new Date(input.promotedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a"/>
      <stop offset="100%" style="stop-color:#1e3a5f"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <text x="600" y="80" text-anchor="middle" fill="#94a3b8" font-family="Arial,sans-serif" font-size="28">BELT PROMOTION</text>
  <text x="600" y="140" text-anchor="middle" fill="#ffffff" font-family="Arial,sans-serif" font-size="36" font-weight="bold">${escapeXml(input.gymName)}</text>
  <text x="600" y="280" text-anchor="middle" fill="#ffffff" font-family="Arial,sans-serif" font-size="52" font-weight="bold">${escapeXml(input.memberName)}</text>
  <rect x="340" y="330" width="80" height="24" rx="4" fill="${beltHex(input.fromBelt)}"/>
  <text x="430" y="350" fill="#cbd5e1" font-family="Arial,sans-serif" font-size="24">${escapeXml(capitalize(input.fromBelt))}</text>
  <text x="600" y="350" text-anchor="middle" fill="#64748b" font-family="Arial,sans-serif" font-size="32">→</text>
  <rect x="670" y="330" width="80" height="24" rx="4" fill="${beltHex(input.toBelt)}"/>
  <text x="760" y="350" fill="#ffffff" font-family="Arial,sans-serif" font-size="24" font-weight="bold">${escapeXml(capitalize(input.toBelt))}</text>
  <text x="600" y="430" text-anchor="middle" fill="#94a3b8" font-family="Arial,sans-serif" font-size="22">${escapeXml(dateStr)}</text>
  <text x="600" y="580" text-anchor="middle" fill="#475569" font-family="Arial,sans-serif" font-size="18">Powered by MatsFlow</text>
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
