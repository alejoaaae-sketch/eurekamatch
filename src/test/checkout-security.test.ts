import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getCheckoutOrigin } from '../../supabase/functions/_shared/checkout-origin';

describe('checkout return destinations', () => {
  it.each([
    'https://ysilegustas.com', 'https://www.ysilegustas.com',
    'https://eurekamatch.com', 'https://www.eurekamatch.com',
    'https://eurekamatch.eus', 'https://www.eurekamatch.eus',
    'https://eurekamatch.lovable.app',
    'https://id-preview--526040e8-463d-4fae-a27c-09e5d731ee62.lovable.app',
  ])('allows the exact authorized origin %s', (origin) => {
    expect(getCheckoutOrigin(origin)).toBe(origin);
  });
  it.each([
    'https://attacker.example', 'null', '', 'http://eurekamatch.com',
    'https://eurekamatch.com.attacker.example', 'https://other.lovable.app',
    'https://eurekamatch.com@attacker.example', 'https://eurekamatch.com/path',
    'https://eurekamatch.com:444', 'https://eurekamatch.com/',
  ])('rejects untrusted origin %s', (origin) => {
    expect(() => getCheckoutOrigin(origin)).toThrow('Invalid checkout origin');
  });
  it('uses the canonical domain when Origin is absent', () => {
    expect(getCheckoutOrigin(null)).toBe('https://eurekamatch.com');
  });
  it.each(['create-paypal-order', 'create-checkout'])('validates before provider calls in %s', (name) => {
    const source = readFileSync(`supabase/functions/${name}/index.ts`, 'utf8');
    const validation = source.indexOf('const origin = getCheckoutOrigin');
    expect(validation).toBeGreaterThan(0);
    expect(validation).toBeLessThan(source.indexOf('await userClient.auth.getUser()'));
    expect(source).not.toContain('req.headers.get("origin") ||');
    expect(source).toContain('msg === "Invalid checkout origin" ? 400');
  });
});

describe('signup referral and simulation authorization', () => {
  const sql = readFileSync('drizzle/migrations/0003_secure_beta_and_signup_referrals.sql', 'utf8');
  it('checks administrator before granting simulated credits', () => {
    expect(sql.indexOf("public.has_role(v_user, 'admin'::public.app_role)")).toBeLessThan(sql.indexOf('INSERT INTO public.pack_purchases'));
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.complete_beta_purchase(uuid) FROM PUBLIC, anon');
  });
  it('rejects later attribution changes and grants only through nested signup inserts', () => {
    expect(sql).toContain('NEW.referred_by IS DISTINCT FROM OLD.referred_by');
    expect(sql).toContain("IF TG_OP<>'INSERT' OR pg_trigger_depth()<2");
    expect(sql).toContain('WHERE referral_enabled=true');
    expect(sql).toContain('AFTER INSERT ON public.profiles');
    expect(sql).not.toContain('AFTER INSERT OR UPDATE');
  });
  it('sends attribution with signup rather than an editable profile update', () => {
    const source = readFileSync('src/hooks/useAuth.tsx', 'utf8');
    expect(source).toContain('referral_code: referralCode.toUpperCase()');
    expect(source).not.toContain('referred_by:');
    expect(source).not.toContain('.upsert(');
  });
  it('blocks normal beta purchases without switching them to real charges', () => {
    const source = readFileSync('src/pages/BuyPacks.tsx', 'utf8');
    expect(source).toContain('if (!isAdmin) return;');
    expect(source).toContain('disabled={processing || (betaMode && !isAdmin)}');
    expect(source).toContain('No se realizará ningún cobro.');
  });
});