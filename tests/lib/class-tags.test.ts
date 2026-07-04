import { describe, expect, it } from 'vitest';
import {
  classAccentColor,
  normalizeCategoryTag,
  normalizeClassColor,
} from '@/lib/class-tags';

describe('normalizeClassColor', () => {
  it('accepts valid hex colors', () => {
    expect(normalizeClassColor('#3b82f6')).toBe('#3B82F6');
  });

  it('rejects invalid values', () => {
    expect(normalizeClassColor('blue')).toBeNull();
    expect(normalizeClassColor('#fff')).toBeNull();
    expect(normalizeClassColor('')).toBeNull();
  });
});

describe('normalizeCategoryTag', () => {
  it('trims and caps length', () => {
    expect(normalizeCategoryTag('  BJJ  ')).toBe('BJJ');
    expect(normalizeCategoryTag('x'.repeat(50))?.length).toBe(40);
  });

  it('returns null for empty tags', () => {
    expect(normalizeCategoryTag('   ')).toBeNull();
  });
});

describe('classAccentColor', () => {
  it('falls back when color is missing or invalid', () => {
    expect(classAccentColor(null)).toBe('#3B82F6');
    expect(classAccentColor('nope', '#FF0000')).toBe('#FF0000');
  });
});
