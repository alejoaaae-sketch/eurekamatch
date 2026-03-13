import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { LanguageCode, languages as allLanguages } from '@/lib/i18n';

export const useLanguage = () => {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [enabledLanguages, setEnabledLanguages] = useState<string[]>([]);

  // Fetch enabled languages from global_config
  useEffect(() => {
    const fetchEnabledLangs = async () => {
      try {
        const { data } = await supabase
          .from('global_config')
          .select('enabled_languages')
          .limit(1)
          .single();
        if (data?.enabled_languages) {
          setEnabledLanguages(data.enabled_languages as string[]);
        }
      } catch (e) {
        console.warn('Could not fetch enabled languages:', e);
      }
    };
    fetchEnabledLangs();
  }, []);

  // Filter languages to only show enabled ones
  const languages = useMemo(() => {
    if (enabledLanguages.length === 0) return allLanguages;
    return allLanguages.filter(l => enabledLanguages.includes(l.code));
  }, [enabledLanguages]);

  const isLanguageCode = (value: unknown): value is LanguageCode =>
    typeof value === 'string' && allLanguages.some((l) => l.code === value);

  const getStoredLanguage = (): LanguageCode | undefined => {
    const stored = localStorage.getItem('language');
    return isLanguageCode(stored) ? stored : undefined;
  };

  // Sync language from storage/profile on mount/user change
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const syncLanguage = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('language')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        if (cancelled) return;

        const storedLang = getStoredLanguage();
        const dbLang = isLanguageCode(data?.language) ? (data!.language as LanguageCode) : undefined;
        const desiredLang: LanguageCode = storedLang ?? dbLang ?? 'es';

        if (desiredLang !== i18n.language) {
          await i18n.changeLanguage(desiredLang);
        }
        localStorage.setItem('language', desiredLang);

        if (storedLang && storedLang !== dbLang) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ language: storedLang })
            .eq('user_id', user.id);

          if (updateError) {
            console.warn('Could not persist language preference:', updateError);
          }
        }
      } catch (error) {
        console.error('Error fetching language preference:', error);
      }
    };

    syncLanguage();
    return () => { cancelled = true; };
  }, [user?.id, i18n]);

  const changeLanguage = useCallback(async (langCode: LanguageCode) => {
    setLoading(true);
    try {
      await i18n.changeLanguage(langCode);
      localStorage.setItem('language', langCode);

      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ language: langCode })
          .eq('user_id', user.id);
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error changing language:', error);
    } finally {
      setLoading(false);
    }
  }, [i18n, user]);

  return {
    currentLanguage: i18n.language as LanguageCode,
    languages,
    changeLanguage,
    loading,
  };
};
