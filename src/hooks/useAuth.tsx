import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (phone: string, password: string, displayName: string, email: string, verifyEmail?: boolean) => Promise<{ error: Error | null }>;
  signIn: (phone: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Convert phone to email format for Supabase auth (phone+password workaround)
// Security: Add a hash suffix to make the email pattern less predictable
// This prevents enumeration attacks while maintaining the phone-based auth workaround
const phoneToEmail = (phone: string): string => {
  // Normalize phone: remove spaces, dashes, parentheses
  const normalized = phone.replace(/[\s\-\(\)\.]/g, '');
  // Add a deterministic but non-obvious suffix based on phone
  // This makes the email pattern harder to guess while still being reproducible
  const hash = Array.from(normalized).reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  const suffix = Math.abs(hash).toString(36).slice(0, 6);
  return `${normalized}-${suffix}@phone.eureka`;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (phone: string, password: string, displayName: string, userEmail: string, verifyEmail: boolean = true) => {
    const authEmail = phoneToEmail(phone);
    
    const { data, error } = await supabase.auth.signUp({
      email: authEmail,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          phone: phone,
          display_name: displayName,
          user_email: userEmail,
        },
      },
    });

    if (!error && data.user) {
      // Update the profile with phone, display name, and user's real email
      await supabase
        .from('profiles')
        .upsert({
          user_id: data.user.id,
          phone: phone,
          display_name: displayName,
          email: userEmail,
        }, {
          onConflict: 'user_id',
        });

      // Send email verification link only if verify_email is enabled
      if (verifyEmail) {
        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          const { data: { session } } = await supabase.auth.getSession();
          await fetch(`${supabaseUrl}/functions/v1/send-email-verification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({ email: userEmail }),
          });
        } catch (e) {
          console.error('Failed to send email verification:', e);
        }
      }
    }

    return { error: error as Error | null };
  };

  const signIn = async (phone: string, password: string) => {
    const email = phoneToEmail(phone);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
