import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('drizzle/migrations/0004_allow_repeated_mutual_matches.sql', 'utf8');

describe('repeated mutual matches', () => {
  it('removes user-pair uniqueness so prior matches cannot block a new choice pair', () => {
    expect(migration).toMatch(/ALTER TABLE public\.matches DROP CONSTRAINT matches_user1_id_user2_id_key;/);
    expect(migration).not.toMatch(/UNIQUE[^;]*\(user1_id, user2_id\)/);
  });

  it('keeps uniqueness for the same two choices in either order', () => {
    expect(migration).toMatch(/CREATE UNIQUE INDEX matches_pick_pair_unique ON public\.matches \(LEAST\(pick1_id, pick2_id\), GREATEST\(pick1_id, pick2_id\)\);/);
  });
});