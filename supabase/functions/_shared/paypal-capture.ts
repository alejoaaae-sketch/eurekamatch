export function completedCaptureAmount(order: any): string {
  const captures = order.purchase_units?.[0]?.payments?.captures;
  if (order.status !== 'COMPLETED' || !Array.isArray(captures) || captures.length !== 1) {
    throw new Error('Payment capture not completed');
  }
  const capture = captures[0];
  if (capture.status !== 'COMPLETED' || capture.amount?.currency_code !== 'EUR' ||
      typeof capture.amount.value !== 'string' || !/^\d+\.\d{2}$/.test(capture.amount.value)) {
    throw new Error('Invalid completed capture');
  }
  return capture.amount.value;
}