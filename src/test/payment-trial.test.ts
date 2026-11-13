import { describe, expect, it } from 'vitest';
import { canUseRealPaymentTrial, PAYMENT_TRIAL_USER_ID } from '../lib/payment-trial';
import { isPaymentTrialAccount } from '../../supabase/functions/_shared/payment-trial';
import { completedCaptureAmount } from '../../supabase/functions/_shared/paypal-capture';

describe('owner-only live trial', () => {
  it.each([canUseRealPaymentTrial, isPaymentTrialAccount])('requires both the owner account and verified administrator role', (allowed) => {
    expect(allowed(PAYMENT_TRIAL_USER_ID, true)).toBe(true);
    expect(allowed(PAYMENT_TRIAL_USER_ID, false)).toBe(false);
    expect(allowed('other-account', true)).toBe(false);
    expect(allowed('other-account', false)).toBe(false);
  });
});

describe('verified paid captures', () => {
  const order = (status = 'COMPLETED', currency = 'EUR', captureStatus = 'COMPLETED') => ({
    status, purchase_units: [{ payments: { captures: [{ status: captureStatus, amount: { value: '3.00', currency_code: currency } }] } }],
  });
  it('accepts a completed 3 euro capture', () => expect(completedCaptureAmount(order())).toBe('3.00'));
  it('rejects an unapproved order', () => expect(() => completedCaptureAmount(order('CREATED'))).toThrow());
  it('rejects an unpaid capture', () => expect(() => completedCaptureAmount(order('COMPLETED', 'EUR', 'PENDING'))).toThrow());
  it('rejects a different currency', () => expect(() => completedCaptureAmount(order('COMPLETED', 'USD'))).toThrow());
});