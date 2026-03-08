import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useAppConfig } from './useAppConfig';

export const usePickNotifications = () => {
  const { user } = useAuth();
  const { canUseNotifications } = useAppConfig();
  const [sentNotifications, setSentNotifications] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const { data } = await supabase
        .from('pick_notifications')
        .select('pick_id, created_at')
        .eq('sender_id', user.id)
        .gte('created_at', oneMonthAgo.toISOString());

      if (data) {
        const map: Record<string, string> = {};
        for (const n of data) {
          map[n.pick_id] = n.created_at;
        }
        setSentNotifications(map);
      }
    } catch (err) {
      console.error('Error fetching notifications data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const canNotify = (pickId: string, pickedUserId: string | null): boolean => {
    if (!canUseNotifications) return false;
    if (!pickedUserId) return false;
    if (sentNotifications[pickId]) return false;
    return true;
  };

  const wasSentThisMonth = (pickId: string): boolean => {
    return !!sentNotifications[pickId];
  };

  const sendNotification = async (pickId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('send-pick-notification', {
        body: { pickId },
      });

      if (error) {
        const msg = typeof error === 'object' && 'message' in error ? error.message : String(error);
        return { success: false, error: msg };
      }

      if (data?.error) {
        return { success: false, error: data.error };
      }

      await fetchData();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Error sending notification' };
    }
  };

  return {
    notificationsEnabled: canUseNotifications,
    canNotify,
    wasSentThisMonth,
    sendNotification,
    loading,
    refetch: fetchData,
  };
};
