import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { appConfig } from '@/config/app.config';
export interface Match {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  other_user_name: string;
  other_user_email: string | null;
  other_user_phone: string | null;
}

export const useMatches = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = async () => {
    if (!user) {
      setMatches([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get matches using the secure view (hides pick IDs)
      // We need to filter by app_type, but matches_safe doesn't have it
      // So we get all matches and filter client-side based on the user's picks
      const { data: matchData, error: matchError } = await supabase
        .from('matches_safe')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (matchError) throw matchError;

      // For each match, get the other user's profile info using secure function
      // AND filter by current app_type
      const enrichedMatches = await Promise.all(
        (matchData || []).map(async (match) => {
          // Get the other user's ID
          const otherUserId = match.user1_id === user.id ? match.user2_id : match.user1_id;
          
          // Get the pick that the current user made for this other user
          // This only returns picks the current user created (RLS enforced)
          // Also verify this pick is for the current app_type
          const { data: pickData } = await supabase
            .from('picks')
            .select('picked_name, app_type')
            .eq('picker_id', user.id)
            .eq('picked_user_id', otherUserId)
            .eq('is_matched', true)
            .eq('app_type', appConfig.appType)
            .maybeSingle();

          // If no pick found for this app_type, this match doesn't belong here
          if (!pickData) {
            return null;
          }

          // Use secure function to get matched user's profile
          const { data: profileData } = await supabase
            .rpc('get_matched_user_profile', { p_match_id: match.id })
            .maybeSingle();

          return {
            ...match,
            other_user_name: pickData?.picked_name || profileData?.display_name || 'Usuario',
            other_user_email: profileData?.email || null,
            other_user_phone: profileData?.phone || null,
          };
        })
      );

      // Filter out null entries (matches that don't belong to current app)
      const filteredMatches = enrichedMatches.filter((m): m is Match => m !== null);

      setMatches(filteredMatches);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar coincidencias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [user]);

  return {
    matches,
    loading,
    error,
    refetch: fetchMatches,
  };
};
