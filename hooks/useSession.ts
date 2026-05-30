import { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type SessionState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; session: Session };

/**
 * Resolves the current Supabase session and subscribes to auth changes.
 * Starts as 'loading' until the INITIAL_SESSION event fires on subscription.
 * Supabase JS v2 always fires INITIAL_SESSION synchronously on subscribe,
 * so we don't need a separate getSession() call.
 */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ status: 'loading' });

  useEffect(() => {
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
