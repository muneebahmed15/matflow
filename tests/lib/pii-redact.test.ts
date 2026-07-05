import { describe, expect, it } from 'vitest';
import { redactPii } from '@/lib/pii-redact';

describe('redactPii', () => {
  it('redacts email and phone', () => {
    const out = redactPii('Contact john@example.com or 555-123-4567');
    expect(out).not.toContain('john@example.com');
    expect(out).not.toContain('555-123-4567');
    expect(out).toContain('[email]');
    expect(out).toContain('[phone]');
  });
});
