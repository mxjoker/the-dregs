import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useUnreadCount(profileId: string | null): { count: number } {
  const [count, setCount] = useState(0);
  const profileIdRef = useRef(profileId);
  profileIdRef.current = profileId;

  useEffect(() => {
    if (!profileId) {
      setCount(0);
      return;
    }

    let cancelled = false;

    async function fetchCount() {
      const currentProfileId = profileIdRef.current;
      const { data, error } = await (supabase.rpc as any)('get_unread_count', {
        viewer_profile_id: currentProfileId,
      });
      if (!cancelled && profileIdRef.current === currentProfileId && !error && typeof data === 'number') {
        setCount(data);
      }
    }

    fetchCount();

    // Re-fetch on any new message or new match
    const channel = supabase
      .channel(`unread_count:${profileId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => fetchCount(),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matches' },
        () => fetchCount(),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches' },
        () => fetchCount(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [profileId]);

  return { count };
}
