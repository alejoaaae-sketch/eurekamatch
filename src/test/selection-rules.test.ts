import { describe, expect, it } from 'vitest';
import { additionCost, CONSERVED_LIMIT, daysRemaining, isSelectionActive, PRINCIPAL_LIMIT, replacementCost, SELECTION_DAYS } from '@/lib/selection-rules';

describe('selection business rules', () => {
  it('allows 2 principals', () => expect(PRINCIPAL_LIMIT).toBe(2));
  it('allows 5 conserved', () => expect(CONSERVED_LIMIT).toBe(5));
  it('makes the first two additions free', () => { expect(additionCost(0)).toBe(0); expect(additionCost(1)).toBe(0); expect(additionCost(2)).toBe(1); });
  it('charges 1 credit when deleting the previous selection', () => expect(replacementCost(false)).toBe(1));
  it('charges 3 credits when conserving the previous selection', () => expect(replacementCost(true)).toBe(3));
  it('uses a 90-day lifespan', () => expect(SELECTION_DAYS).toBe(90));
  it('excludes a selection at its exact expiry', () => {
    const expiry = '2026-11-13T12:00:00Z';
    expect(isSelectionActive({ app_type: 'love', expires_at: expiry }, Date.parse(expiry)-1)).toBe(true);
    expect(isSelectionActive({ app_type: 'love', expires_at: expiry }, Date.parse(expiry))).toBe(false);
  });
  it('conserving does not restart the remaining lifespan', () => {
    expect(daysRemaining('2026-11-15T12:00:00Z', Date.parse('2026-11-13T12:00:00Z'))).toBe(2);
  });
});