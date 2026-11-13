import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const sql = readFileSync('drizzle/migrations/0007_principal_and_retained_selections.sql', 'utf8');
it('preserves original expiry when conserving', () => {
  expect(sql).toContain("UPDATE public.picks SET selection_kind='conserved' WHERE id=v_old.id");
  expect(sql).not.toMatch(/SET selection_kind='conserved'[^;]*expires_at/);
});
it('charges only once within the locked insertion', () => {
  expect(sql).toContain('pg_advisory_xact_lock');
  expect(sql).toContain('picks_remaining=picks_remaining-v_cost,total_used=total_used+v_cost');
  expect(sql).toContain('picks_remaining>=v_cost');
});
it('enforces the 5 conserved capacity before charging', () => {
  expect(sql).toContain("IF v_count>=5 THEN RAISE EXCEPTION 'Ya tienes 5 elecciones conservadas'");
  expect(sql.indexOf('IF v_count>=5')).toBeLessThan(sql.indexOf('picks_remaining=picks_remaining-v_cost'));
});
it('excludes expired picks on both matching paths', () => {
  expect(sql).toContain("NEW.expires_at<=now()");
  expect(sql).toContain("p.app_type<>'love' OR p.expires_at>now()");
  expect(sql).toContain("app_type<>'love' OR expires_at>now()");
});
it('keeps direct updates from extending or restoring selections', () => {
  expect(sql).toContain("(to_jsonb(NEW)-'deleted_at') IS DISTINCT FROM (to_jsonb(OLD)-'deleted_at')");
  expect(sql).toContain('Deleted selections cannot be restored');
});