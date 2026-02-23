import { describe, it, expect } from 'vitest';
import { RUBRIC_DIMENSIONS } from './rubric';

describe('RUBRIC_DIMENSIONS', () => {
  it('contains exactly 8 dimensions', () => {
    expect(RUBRIC_DIMENSIONS).toHaveLength(8);
  });

  it('includes Product north star', () => {
    expect(RUBRIC_DIMENSIONS).toContain('Product north star');
  });

  it('includes ICP and job clarity', () => {
    expect(RUBRIC_DIMENSIONS).toContain('ICP and job clarity');
  });

  it('includes Buyer and budget alignment', () => {
    expect(RUBRIC_DIMENSIONS).toContain('Buyer and budget alignment');
  });

  it('includes Value unit', () => {
    expect(RUBRIC_DIMENSIONS).toContain('Value unit');
  });

  it('includes Cost driver mapping', () => {
    expect(RUBRIC_DIMENSIONS).toContain('Cost driver mapping');
  });

  it('includes Pools and packaging', () => {
    expect(RUBRIC_DIMENSIONS).toContain('Pools and packaging');
  });

  it('includes Overages and risk allocation', () => {
    expect(RUBRIC_DIMENSIONS).toContain('Overages and risk allocation');
  });

  it('includes Safety rails and trust surfaces', () => {
    expect(RUBRIC_DIMENSIONS).toContain('Safety rails and trust surfaces');
  });

  it('is a readonly tuple (no duplicates)', () => {
    const unique = new Set(RUBRIC_DIMENSIONS);
    expect(unique.size).toBe(RUBRIC_DIMENSIONS.length);
  });
});
