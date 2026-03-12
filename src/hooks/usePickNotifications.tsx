import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useAppConfig } from './useAppConfig';

interface NotificationRecord {
  created_at: string;
  pick_id: string;
}

export const usePickNotifications = () => {
  const { user } = useAuth();
  const { canUseNotifications } = useAppConfig();
  const [sentNotifications, setSentNotifications] = useState<Record<string, NotificationRecord[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('pick_notifications')
        .select('pick_id, created_at')
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        const map: Record<string, NotificationRecord[]> = {};
        for (const n of data) {
          if (!map[n.pick_id]) map[n.pick_id] = [];
          map[n.pick_id].push({ created_at: n.created_at, pick_id: n.pick_id });
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
    // Check if sent this month for this pick
    const records = sentNotifications[pickId];
    if (records?.length) {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const recentSend = records.find(r => new Date(r.created_at) >= oneMonthAgo);
      if (recentSend) return false;
    }
    return true;
  };

  const wasSentThisMonth = (pickId: string): boolean => {
    const records = sentNotifications[pickId];
    if (!records?.length) return false;
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    return records.some(r => new Date(r.created_at) >= oneMonthAgo);
  };

  const getNotificationDates = (pickId: string): string[] => {
    return (sentNotifications[pickId] || []).map(r => r.created_at);
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
    getNotificationDates,
    sendNotification,
    loading,
    refetch: fetchData,
  };
};
