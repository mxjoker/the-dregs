import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/hooks/useSession';

// Resolves the signed-in user's profile id (auth user → users row → profiles row).
// Unlike OnboardingContext, this works on any screen and after app restarts.
export function useMyProfileId(): string | null {
  const sessionState = useSession();
  const authId =
    sessionState.status === 'authenticated' ? sessionState.session.user.id : null;
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (!authId) {
      setProfileId(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', authId)
        .single();
      if (!userData || cancelled) return;
      const { data: prof } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.id)
        .single();
      if (prof && !cancelled) setProfileId(prof.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [authId]);

  return profileId;
}
