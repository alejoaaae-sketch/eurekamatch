import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { LanguageCode, languages } from '@/lib/i18n';

export const useLanguage = () => {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const isLanguageCode = (value: unknown): value is LanguageCode =>
    typeof value === 'string' && languages.some((l) => l.code === value);

  const getStoredLanguage = (): LanguageCode | undefined => {
    const stored = localStorage.getItem('language');
    return isLanguageCode(stored) ? stored : undefined;
  };

  // Sync language from storage/profile on mount/user change
  // IMPORTANT: Prefer localStorage over DB to avoid a race where a slow profile fetch
  // overrides a user-initiated language change ("flicker" then revert).
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

        // Re-read localStorage AFTER the fetch to avoid race conditions with user changes.
        const storedLang = getStoredLanguage();
        const dbLang = isLanguageCode(data?.language) ? (data!.language as LanguageCode) : undefined;
        const desiredLang: LanguageCode = storedLang ?? dbLang ?? 'es';

        if (desiredLang !== i18n.language) {
          await i18n.changeLanguage(desiredLang);
        }
        localStorage.setItem('language', desiredLang);

        // If the user has a stored preference, keep the DB in sync (best-effort).
        if (storedLang && storedLang !== dbLang) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ language: storedLang })
            .eq('user_id', user.id);

          if (updateError) {
            // Don't block UX if DB sync fails.
            console.warn('Could not persist language preference:', updateError);
          }
        }
      } catch (error) {
        console.error('Error fetching language preference:', error);
      }
    };

    syncLanguage();

    return () => {
      cancelled = true;
    };
  }, [user?.id, i18n]);

  const changeLanguage = useCallback(async (langCode: LanguageCode) => {
    setLoading(true);
    
    try {
      // Change language immediately in i18n
      await i18n.changeLanguage(langCode);
      localStorage.setItem('language', langCode);

      // Persist to database if user is logged in
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
