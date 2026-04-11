import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type Profile = {
  id: string;
  school_id: string | null;
  role: 'student' | 'teacher' | 'admin';
  full_name: string | null;
  email: string | null;
};

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      },
    );
    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, school_id, role, full_name, email')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as Profile;
}

export async function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}
