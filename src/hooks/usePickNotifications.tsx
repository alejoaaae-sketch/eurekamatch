import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const usePickNotifications = () => {
  const { user } = useAuth();
  const [sentNotifications, setSentNotifications] = useState<Record<string, string>>({});
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const [notifRes, configRes] = await Promise.all([
        supabase
          .from('pick_notifications')
          .select('pick_id, created_at')
          .eq('sender_id', user.id)
          .gte('created_at', oneMonthAgo.toISOString()),
        supabase
          .from('global_config')
          .select('notifications_enabled')
          .limit(1)
          .single(),
      ]);

      if (notifRes.data) {
        const map: Record<string, string> = {};
        for (const n of notifRes.data) {
          map[n.pick_id] = n.created_at;
        }
        setSentNotifications(map);
      }

      if (configRes.data) {
        setNotificationsEnabled((configRes.data as any).notifications_enabled ?? false);
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
    if (!notificationsEnabled) return false;
    if (!pickedUserId) return false; // not registered
    if (sentNotifications[pickId]) return false; // already sent this month
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
        // Try to parse the error message from the function response
        const msg = typeof error === 'object' && 'message' in error ? error.message : String(error);
        return { success: false, error: msg };
      }

      if (data?.error) {
        return { success: false, error: data.error };
      }

      // Refresh data
      await fetchData();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Error sending notification' };
    }
  };

  return {
    notificationsEnabled,
    canNotify,
    wasSentThisMonth,
    sendNotification,
    loading,
    refetch: fetchData,
  };
};
