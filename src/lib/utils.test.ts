import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn()', () => {
  it('returns a single class unchanged', () => {
    expect(cn('px-4')).toBe('px-4');
  });

  it('merges multiple class names', () => {
    expect(cn('px-4', 'py-2', 'text-sm')).toBe('px-4 py-2 text-sm');
  });

  it('handles conditional classes — truthy condition included', () => {
    const isActive = true as boolean;
    expect(cn('base', isActive && 'active')).toBe('base active');
  });

  it('handles conditional classes — falsy condition excluded', () => {
    const isActive = false as boolean;
    expect(cn('base', isActive && 'never')).toBe('base');
  });

  it('handles undefined and null values without crashing', () => {
    expect(cn('base', undefined, null as unknown as string)).toBe('base');
  });

  it('resolves Tailwind conflicts — last padding wins', () => {
    // tailwind-merge should deduplicate conflicting utilities
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('resolves Tailwind conflicts — last text color wins', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('returns empty string when given no arguments', () => {
    expect(cn()).toBe('');
  });
});
