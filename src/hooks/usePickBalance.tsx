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

  const purchasePack = async (pack: PickPack): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      // Record purchase
      const { error: purchaseError } = await supabase
        .from('pack_purchases')
        .insert({
          user_id: user.id,
          pack_id: pack.id,
          pack_name: pack.name,
          picks_count: pack.picks_count,
          price: pack.price,
          payment_method: 'simulation',
        });

      if (purchaseError) throw purchaseError;

      // Update balance
      const currentRemaining = balance?.picks_remaining ?? 0;
      const currentPurchased = balance?.total_purchased ?? 0;

      const { error: balanceError } = await supabase
        .from('user_pick_balance')
        .upsert({
          user_id: user.id,
          picks_remaining: currentRemaining + pack.picks_count,
          total_purchased: currentPurchased + pack.picks_count,
          total_used: balance?.total_used ?? 0,
        }, { onConflict: 'user_id' });

      if (balanceError) throw balanceError;

      await fetchBalance();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error purchasing pack',
      };
    }
  };

  const consumePick = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user || !balance) return { success: false, error: 'No balance' };
    if (balance.picks_remaining <= 0) return { success: false, error: 'No picks remaining' };

    try {
      const { error } = await supabase
        .from('user_pick_balance')
        .update({
          picks_remaining: balance.picks_remaining - 1,
          total_used: balance.total_used + 1,
        })
        .eq('user_id', user.id);

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
    purchasePack,
    consumePick,
    refetch: fetchBalance,
  };
};
