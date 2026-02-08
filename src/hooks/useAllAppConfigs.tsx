import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AppModeStatus {
  app_mode: string;
  enabled: boolean;
}

export const useAllAppConfigs = () => {
  const [configs, setConfigs] = useState<AppModeStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('app_config').select('app_mode, enabled');
      if (data) setConfigs(data as AppModeStatus[]);
      setLoading(false);
    };
    fetch();
  }, []);

  const isAppEnabled = (appType: string): boolean => {
    const mode = appType === 'plan' ? 'friends' : appType;
    const found = configs.find(c => c.app_mode === mode);
    return found?.enabled ?? true;
  };

  return { configs, loading, isAppEnabled };
};
