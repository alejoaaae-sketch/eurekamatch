import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export const useBlockedUsers = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [blocking, setBlocking] = useState(false);

  const blockUser = async (blockedUserId: string, matchId?: string): Promise<boolean> => {
    if (!user) return false;
    setBlocking(true);

    try {
      // Insert block record
      const { error: blockError } = await supabase
        .from('blocked_users')
        .insert({ blocker_id: user.id, blocked_id: blockedUserId });

      if (blockError) {
        if (blockError.code === '23505') {
          // Already blocked
          toast.info(t("block.alreadyBlocked"));
          return true;
        }
        throw blockError;
      }

      // If there's a match, mark it as blocked in matches_safe
      if (matchId) {
        await supabase
          .from('matches_safe')
          .update({ blocked: true })
          .eq('id', matchId);
      }

      toast.success(t("block.success"));
      return true;
    } catch (err) {
      console.error('Block error:', err);
      toast.error(t("common.error"));
      return false;
    } finally {
      setBlocking(false);
    }
  };

  const unblockUser = async (blockedUserId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedUserId);

      if (error) throw error;
      toast.success(t("block.unblocked"));
      return true;
    } catch {
      toast.error(t("common.error"));
      return false;
    }
  };

  return { blockUser, unblockUser, blocking };
};
