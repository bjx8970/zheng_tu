import { canAttemptExceptionalPromotion } from '../promotion';

describe('canAttemptExceptionalPromotion', () => {
  it('ageGatePass=true → always returns true regardless of other flags', () => {
    expect(canAttemptExceptionalPromotion(true, 0.15, false)).toBe(true);
    expect(canAttemptExceptionalPromotion(true, 0.15, true)).toBe(true);
    expect(canAttemptExceptionalPromotion(true, 0, false)).toBe(true);
    expect(canAttemptExceptionalPromotion(true, 0, true)).toBe(true);
  });

  it('ageGatePass=false + exceptionalChance=0 → returns true (no exceptional path, falls through to normal check)', () => {
    expect(canAttemptExceptionalPromotion(false, 0, false)).toBe(true);
    expect(canAttemptExceptionalPromotion(false, 0, true)).toBe(true);
  });

  it('ageGatePass=false + exceptionalChance>0 + not failed → returns true (first attempt allowed)', () => {
    expect(canAttemptExceptionalPromotion(false, 0.10, false)).toBe(true);
    expect(canAttemptExceptionalPromotion(false, 0.25, false)).toBe(true);
    expect(canAttemptExceptionalPromotion(false, 0.30, false)).toBe(true);
  });

  it('ageGatePass=false + exceptionalChance>0 + already failed → returns false (retry blocked)', () => {
    expect(canAttemptExceptionalPromotion(false, 0.10, true)).toBe(false);
    expect(canAttemptExceptionalPromotion(false, 0.25, true)).toBe(false);
    expect(canAttemptExceptionalPromotion(false, 0.30, true)).toBe(false);
  });

  it('edge case: exceptionalChance at boundary 0 still returns true even when failed', () => {
    expect(canAttemptExceptionalPromotion(false, 0, true)).toBe(true);
  });
});
