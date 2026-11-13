// Regression checks for ordering and removal of the selected attack paths.
// Live authorization rejection is additionally checked against deployed functions.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = (name: string) => readFileSync(`supabase/functions/${name}/index.ts`, 'utf8');
describe('selected security fixes', () => {
  it('checks PayPal ownership before completed status and capture', () => {
    const s = source('capture-paypal-order');
    const check = s.indexOf('meta.user_id !== userId');
    expect(check).toBeGreaterThan(0);
    expect(check).toBeLessThan(s.indexOf('orderDetails.status === "COMPLETED"'));
    expect(check).toBeLessThan(s.indexOf('const captureRes'));
  });
  it('does not trust the public db-trigger header', () => {
    const s = source('send-match-notification');
    expect(s).not.toContain('internalSource === "db-trigger"');
    expect(s).toContain('match_notification_authorizations');
    expect(s).toContain('if (consumeError || !consumed)');
  });
  it('does not log verification email or phone values on success', () => {
    for (const name of ['send-email-verification','verify-email','send-otp','verify-otp']) {
      expect(source(name)).not.toMatch(/console\.log\([^\n]*(?:email|normalizedPhone|verification\.email)/i);
    }
  });
  it('does not debit a pick separately from insertion', () => {
    expect(readFileSync('src/pages/AddPick.tsx','utf8')).not.toContain('await consumePick()');
  });
});