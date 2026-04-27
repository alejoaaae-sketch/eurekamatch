import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { appConfig } from '@/config/app.config';
import { useUserCountry } from './useUserCountry';

export interface AppModeConfig {
  app_mode: string;
  max_picks: number;
  free_changes_per_month: number;
  price_per_change: number;
  enabled: boolean;
}

export interface GlobalConfig {
  max_new_users_per_day: number;
  enabled_languages: string[];
  enabled_countries: string[];
  promo_enabled: boolean;
  promo_start: string | null;
  promo_end: string | null;
  promo_max_picks_override: number | null;
  verify_mobile: boolean;
  verify_email: boolean;
  beta_mode: boolean;
  beta_countries: string[];
  notification_countries: string[];
  payment_countries: string[];
}

export interface UserUsage {
  free_changes_used: number;
  paid_changes_used: number;
}

export const useAppConfig = () => {
  const [modeConfig, setModeConfig] = useState<AppModeConfig | null>(null);
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const { country, loading: countryLoading } = useUserCountry();

  const appMode = appConfig.appType;

  const fetchConfig = useCallback(async () => {
    try {
      const [modeRes, globalRes] = await Promise.all([
        supabase.from('app_config').select('*').eq('app_mode', appMode).single(),
        supabase.from('global_config').select('*').limit(1).single(),
      ]);

      if (modeRes.data) {
        setModeConfig(modeRes.data as unknown as AppModeConfig);
      }
      if (globalRes.data) {
        setGlobalConfig(globalRes.data as unknown as GlobalConfig);
      }
    } catch (err) {
      console.error('Error fetching app config:', err);
    } finally {
      setLoading(false);
    }
  }, [appMode]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Compute effective max picks (considering promo)
  const effectiveMaxPicks = (() => {
    const base = modeConfig?.max_picks ?? appConfig.maxPicks;
    if (
      globalConfig?.promo_enabled &&
      globalConfig.promo_start &&
      globalConfig.promo_end &&
      globalConfig.promo_max_picks_override != null
    ) {
      const now = new Date();
      const start = new Date(globalConfig.promo_start);
      const end = new Date(globalConfig.promo_end);
      if (now >= start && now <= end) {
        return globalConfig.promo_max_picks_override;
      }
    }
    return base;
  })();

  const isPromoActive = (() => {
    if (!globalConfig?.promo_enabled || !globalConfig.promo_start || !globalConfig.promo_end) return false;
    const now = new Date();
    return now >= new Date(globalConfig.promo_start) && now <= new Date(globalConfig.promo_end);
  })();

  // Country-aware betaMode:
  // - If global beta_mode is ON → simulation for everyone
  // - If global beta_mode is OFF → check payment_countries
  //   - If payment_countries is empty → real payments for all
  //   - If user country is in payment_countries → real payments
  //   - Otherwise → simulation
  const betaMode = (() => {
    const globalBeta = globalConfig?.beta_mode ?? true;
    if (globalBeta) return true;

    // beta_mode is OFF globally, check payment_countries
    const paymentCountries = globalConfig?.payment_countries ?? [];
    if (paymentCountries.length === 0) return false; // real payments for all

    if (!country) return true; // country unknown, default to simulation

    return !paymentCountries.includes(country); // simulation if NOT in list
  })();

  // Country-aware notifications check
  const canUseNotifications = (() => {
    const notifEnabled = (globalConfig as any)?.notifications_enabled ?? false;
    if (!notifEnabled) return false;

    const notifCountries = globalConfig?.notification_countries ?? [];
    if (notifCountries.length === 0) return true; // enabled for all

    if (!country) return false; // country unknown, disable

    return notifCountries.includes(country);
  })();

  return {
    modeConfig,
    globalConfig,
    loading: loading || countryLoading,
    effectiveMaxPicks,
    isPromoActive,
    pricePerChange: modeConfig?.price_per_change ?? 0.99,
    freeChangesPerMonth: modeConfig?.free_changes_per_month ?? 0,
    appEnabled: modeConfig?.enabled ?? true,
    verifyMobile: globalConfig?.verify_mobile ?? false,
    verifyEmail: globalConfig?.verify_email ?? true,
    betaMode,
    betaCountries: globalConfig?.beta_countries ?? [],
    notificationCountries: globalConfig?.notification_countries ?? [],
    paymentCountries: globalConfig?.payment_countries ?? [],
    canUseNotifications,
    referralEnabled: (globalConfig as any)?.referral_enabled ?? false,
    userCountry: country,
    refetch: fetchConfig,
  };
};
