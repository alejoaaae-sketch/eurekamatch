import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  email_verified: boolean;
  phone_verified: boolean;
  age_verified: boolean;
  birth_year: number | null;
  created_at: string;
  updated_at: string;
  language?: string;
}

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Defense-in-depth: Explicitly select only the fields we need
      // rather than using select('*') to minimize data exposure
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, email, phone, email_verified, phone_verified, age_verified, birth_year, created_at, updated_at, language')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      // Application-layer validation: Verify the returned profile belongs to the authenticated user
      // This provides defense-in-depth on top of RLS policies
      if (data && data.user_id !== user.id) {
        console.error('Security: Profile user_id mismatch detected');
        throw new Error('Profile access denied');
      }
      
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar perfil');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: {
    display_name?: string;
    phone?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'No autenticado' };

    // Application-layer validation: Sanitize input before updating
    const sanitizedUpdates: { display_name?: string; phone?: string } = {};
    
    if (updates.display_name !== undefined) {
      // Basic sanitization - trim whitespace, limit length
      sanitizedUpdates.display_name = updates.display_name.trim().slice(0, 100);
    }
    
    if (updates.phone !== undefined) {
      // Normalize phone number - remove non-numeric characters except + at start
      const normalizedPhone = updates.phone.replace(/[^\d+]/g, '');
      if (normalizedPhone.length > 0 && normalizedPhone.length <= 20) {
        sanitizedUpdates.phone = normalizedPhone;
      }
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          email: user.email,
          ...sanitizedUpdates,
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;
      await fetchProfile();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error al actualizar perfil',
      };
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  return {
    profile,
    loading,
    error,
    updateProfile,
    refetch: fetchProfile,
  };
};
