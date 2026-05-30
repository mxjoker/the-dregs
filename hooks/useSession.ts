import { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type SessionState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; session: Session };

/**
 * Resolves the current Supabase session and subscribes to auth changes.
 * Starts as 'loading' until the first getSession() resolves.
 */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ status: 'loading' });

  useEffect(() => {
    // Resolve initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(
        session
          ? { status: 'authenticated', session }
          : { status: 'unauthenticated' },
      );
    });

    // Subscribe to future auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(
        session
          ? { status: 'authenticated', session }
          : { status: 'unauthenticated' },
      );
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
