import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { appConfig } from '@/config/app.config';

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
}

export interface UserUsage {
  free_changes_used: number;
  paid_changes_used: number;
}

// Map app_type (love/plan/sex) to app_mode (love/friends/sex)
const toAppMode = (appType: string): string => {
  return appType === 'plan' ? 'friends' : appType;
};

export const useAppConfig = () => {
  const [modeConfig, setModeConfig] = useState<AppModeConfig | null>(null);
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const appMode = toAppMode(appConfig.appType);

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

  return {
    modeConfig,
    globalConfig,
    loading,
    effectiveMaxPicks,
    isPromoActive,
    pricePerChange: modeConfig?.price_per_change ?? 0.99,
    freeChangesPerMonth: modeConfig?.free_changes_per_month ?? 0,
    appEnabled: modeConfig?.enabled ?? true,
    verifyMobile: globalConfig?.verify_mobile ?? false,
    verifyEmail: globalConfig?.verify_email ?? true,
    betaMode: globalConfig?.beta_mode ?? true,
    refetch: fetchConfig,
  };
};
