export function paidStripeAmount(session: {
  livemode: boolean; payment_status: string; status: string | null;
  currency: string | null; amount_total: number | null;
}): number {
  if (!session.livemode || session.payment_status !== 'paid' || session.status !== 'complete' ||
      session.currency !== 'eur' || session.amount_total === null ||
      !Number.isSafeInteger(session.amount_total) || session.amount_total <= 0) {
    throw new Error('El pago real todavía no está confirmado');
  }
  return session.amount_total / 100;
}