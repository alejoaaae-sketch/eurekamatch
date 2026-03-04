import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const SESSION_KEY = 'eureka_session_id';

const getAppType = (): string => {
  return sessionStorage.getItem('eureka_app_type') || 'love';
};

const getAccessToken = (): string | null => {
  try {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const raw = localStorage.getItem(`sb-${projectId}-auth-token`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.access_token || null;
  } catch {
    return null;
  }
};

export const useSessionTracking = () => {
  const { user } = useAuth();
  const sessionIdRef = useRef<string | null>(null);

  const startSession = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .insert({ user_id: userId, app_type: getAppType() })
        .select('id')
        .single();

      if (!error && data) {
        sessionIdRef.current = data.id;
        localStorage.setItem(SESSION_KEY, data.id);
      }
    } catch (e) {
      console.error('Failed to start session:', e);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      sessionIdRef.current = null;
      return;
    }

    // Start or restore session
    const existingId = localStorage.getItem(SESSION_KEY);
    if (existingId) {
      sessionIdRef.current = existingId;
    } else {
      startSession(user.id);
    }

    // Handle browser/tab close - use fetch with keepalive for reliability
    const handleBeforeUnload = () => {
      const sid = sessionIdRef.current || localStorage.getItem(SESSION_KEY);
      if (!sid) return;

      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_sessions?id=eq.${sid}`;
      const token = getAccessToken();
      if (!token) return;

      fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${token}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ ended_at: new Date().toISOString(), exit_type: 'browser_close' }),
        keepalive: true,
      }).catch(() => {});

      localStorage.removeItem(SESSION_KEY);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user, startSession]);
};
