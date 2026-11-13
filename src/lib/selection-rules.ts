export const PRINCIPAL_LIMIT = 2;
export const CONSERVED_LIMIT = 5;
export const SELECTION_DAYS = 90;
export const replacementCost = (keepPrevious: boolean) => keepPrevious ? 3 : 1;
export const additionCost = (historicalCount: number) => historicalCount < PRINCIPAL_LIMIT ? 0 : 1;
export const daysRemaining = (expiresAt: string, now = Date.now()) =>
  Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 86400000));
export const isSelectionActive = (pick: { app_type: string; expires_at?: string | null }, now = Date.now()) =>
  pick.app_type !== 'love' || Boolean(pick.expires_at && new Date(pick.expires_at).getTime() > now);