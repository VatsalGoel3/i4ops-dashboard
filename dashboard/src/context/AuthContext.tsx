import {
    createContext, useContext, useEffect, useState, type ReactNode
  } from 'react';
  import { supabase } from '../lib/supabaseClient';
  import type { User } from '@supabase/supabase-js';
  
  interface AuthCtx {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
  }
  
  const Ctx = createContext<AuthCtx | null>(null);
  
  export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
  
    useEffect(() => {
      const {
        data: { subscription }
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });
  
      // Get the current session on load
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        setLoading(false);
      });
  
      return () => {
        subscription.unsubscribe();
      };
    }, []);
  
    async function signIn(email: string, password: string) {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) throw error;
    }
  
    async function signOut() {
      await supabase.auth.signOut();
    }
  
    return (
      <Ctx.Provider value={{ user, loading, signIn, signOut }}>
        {children}
      </Ctx.Provider>
    );
  }
  
  export function useAuth() {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
  }  