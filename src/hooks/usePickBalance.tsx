import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface PickBalance {
  picks_remaining: number;
  total_purchased: number;
  total_used: number;
}

export interface PickPack {
  id: string;
  name: string;
  picks_count: number;
  price: number;
  price_per_pick: number;
  savings_percent: number;
  sort_order: number;
  enabled: boolean;
}

export const usePickBalance = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<PickBalance | null>(null);
  const [packs, setPacks] = useState<PickPack[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBalance = useCallback(async () => {
    if (!user) {
      setBalance(null);
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('user_pick_balance')
        .select('picks_remaining, total_purchased, total_used')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setBalance(data as unknown as PickBalance);
      }
    } catch (err) {
      console.error('Error fetching pick balance:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchPacks = useCallback(async () => {
    const { data } = await supabase
      .from('pick_packs')
      .select('*')
      .eq('enabled', true)
      .order('sort_order');

    if (data) {
      setPacks(data as unknown as PickPack[]);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
    fetchPacks();
  }, [fetchBalance, fetchPacks]);

  // Spend 1 credit via secure server-side RPC. Direct client writes to
  // user_pick_balance are blocked by RLS to prevent self-granting picks.
  const consumePick = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const { error } = await supabase.rpc('consume_pick');
      if (error) throw error;
      await fetchBalance();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error consuming pick',
      };
    }
  };

  return {
    balance,
    packs,
    loading,
    picksRemaining: balance?.picks_remaining ?? 0,
    consumePick,
    refetch: fetchBalance,
  };
};
