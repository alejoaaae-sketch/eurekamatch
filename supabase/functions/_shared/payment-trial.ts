export const PAYMENT_TRIAL_USER_ID = '5468d598-29ae-4728-99da-0d20337dcc85';
export function isPaymentTrialAccount(userId: string, isAdmin: boolean): boolean {
  return isAdmin && userId === PAYMENT_TRIAL_USER_ID;
}