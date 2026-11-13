import { createContext } from 'react';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (phone: string, password: string, displayName: string, email: string, verifyEmail?: boolean, referralCode?: string, birthYear?: number) => Promise<{ error: Error | null }>;
  signIn: (phone: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

// Keep the context identity independent of hot updates to the provider or hook.
export const AuthContext = createContext<AuthContextType | undefined>(undefined);