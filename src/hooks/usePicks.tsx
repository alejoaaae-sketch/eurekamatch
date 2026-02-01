import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { appConfig, AppType } from '@/config/app.config';

const formatSupabaseError = (err: unknown, fallback: string) => {
  if (err && typeof err === 'object') {
    const e = err as any;
    const parts = [
      typeof e.message === 'string' ? e.message : null,
      typeof e.details === 'string' ? e.details : null,
      typeof e.hint === 'string' ? e.hint : null,
      typeof e.code === 'string' ? `code: ${e.code}` : null,
    ].filter(Boolean);
    if (parts.length) return parts.join(' • ');
  }
  return fallback;
};

export interface Pick {
  id: string;
  picker_id: string;
  picked_identifier: string;
  picked_name: string;
  identifier_type: 'phone' | 'email';
  picked_user_id: string | null;
  is_matched: boolean;
  created_at: string;
  app_type: AppType;
}

export const usePicks = () => {
  const { user } = useAuth();
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPicks = async () => {
    if (!user) {
      setPicks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('picks')
        .select('*')
        .eq('app_type', appConfig.appType)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPicks(data as Pick[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar elecciones');
    } finally {
      setLoading(false);
    }
  };

  const addPick = async (
    name: string,
    identifier: string,
    type: 'phone' | 'email'
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'No autenticado' };

    try {
      const { error } = await supabase.from('picks').insert({
        picker_id: user.id,
        picked_name: name,
        picked_identifier: identifier,
        identifier_type: type,
        app_type: appConfig.appType,
      });

      if (error) throw error;
      await fetchPicks();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error al añadir elección',
      };
    }
  };

  const deletePick = async (pickId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'No autenticado' };

    try {
      // Soft delete: set deleted_at timestamp instead of hard deleting
      // NOTE: we also filter deleted_at IS NULL to make it idempotent.
      const { error } = await supabase
        .from('picks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', pickId)
        .eq('picker_id', user.id)
        .is('deleted_at', null);

      if (error) throw error;
      await fetchPicks();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: formatSupabaseError(err, 'Error al eliminar elección'),
      };
    }
  };

  useEffect(() => {
    fetchPicks();
  }, [user]);

  const pendingPicks = picks.filter(p => !p.is_matched);
  const matchedPicks = picks.filter(p => p.is_matched);

  return {
    picks,
    pendingPicks,
    matchedPicks,
    loading,
    error,
    addPick,
    deletePick,
    refetch: fetchPicks,
  };
};
