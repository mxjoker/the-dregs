import { supabase } from './supabase';
import { buildPhotoUrl } from './discover';

export type MatchMomentData = {
  matchId: string;
  otherProfileId: string;
  otherName: string;
  otherPhotoUrl: string | null;
  viewerName: string;
  sharedFlags: Array<{ id: string; label: string }>;
};

export async function fetchMatchMomentData(
  matchId: string,
  viewerProfileId: string,
): Promise<MatchMomentData> {
  // 1. Resolve the other profile ID from the match row
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('user_a_id, user_b_id')
    .eq('id', matchId)
    .single();
  if (matchError) throw matchError;
  if (!match) throw new Error('match not found');

  const otherProfileId =
    match.user_a_id === viewerProfileId ? match.user_b_id : match.user_a_id;

  // 2. Fetch display_name + primary photo for both profiles in parallel
  const [{ data: otherProfile, error: otherError }, { data: viewerProfile, error: viewerError }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('display_name, profile_photos(storage_path, display_order)')
        .eq('id', otherProfileId)
        .single(),
      supabase
        .from('profiles')
        .select('display_name')
        .eq('id', viewerProfileId)
        .single(),
    ]);
  if (otherError) throw otherError;
  if (viewerError) throw viewerError;

  const photos = ((otherProfile.profile_photos as any[]) ?? [])
    .sort((a: any, b: any) => a.display_order - b.display_order);
  const otherPhotoUrl = buildPhotoUrl(photos[0]?.storage_path ?? null);

  // 3. Fetch red flags for both profiles in one query
  const { data: flagRows, error: flagsError } = await supabase
    .from('profile_red_flags')
    .select('profile_id, red_flags(id, label)')
    .in('profile_id', [viewerProfileId, otherProfileId]);
  if (flagsError) throw flagsError;

  const viewerFlagIds = new Set(
    (flagRows ?? [])
      .filter((r: any) => r.profile_id === viewerProfileId)
      .map((r: any) => r.red_flags.id),
  );

  const sharedFlags = (flagRows ?? [])
    .filter((r: any) => r.profile_id === otherProfileId && viewerFlagIds.has(r.red_flags.id))
    .map((r: any) => ({ id: r.red_flags.id as string, label: r.red_flags.label as string }));

  return {
    matchId,
    otherProfileId,
    otherName: otherProfile.display_name,
    otherPhotoUrl,
    viewerName: viewerProfile.display_name,
    sharedFlags,
  };
}

export type MatchListItem = {
  matchId: string;
  otherProfileId: string;
  otherName: string;
  matchedAt: string;
  lastMessageBody: string | null;
  lastMessageAt: string | null;
};

export type Message = {
  id: string;
  matchId: string;
  senderId: string;
  body: string | null;
  messageType: string;
  sentAt: string;
};

export async function fetchMatches(viewerProfileId: string): Promise<MatchListItem[]> {
  const { data: rows, error } = await supabase
    .from('matches_with_context')
    .select('id, user_a_id, user_b_id, user_a_name, user_b_name, matched_at, last_message_at')
    .or(`user_a_id.eq.${viewerProfileId},user_b_id.eq.${viewerProfileId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false } as any)
    .order('matched_at', { ascending: false });
  if (error) throw error;

  const matchIds = (rows ?? []).map((r: any) => r.id as string);
  let lastMsgMap: Map<string, { body: string | null; sent_at: string }> = new Map();

  if (matchIds.length > 0) {
    const { data: msgRows, error: msgError } = await supabase
      .from('messages')
      .select('match_id, body, sent_at')
      .in('match_id', matchIds)
      .order('sent_at', { ascending: false });
    if (msgError) throw msgError;
    for (const m of msgRows ?? []) {
      if (!lastMsgMap.has(m.match_id)) {
        lastMsgMap.set(m.match_id, { body: m.body, sent_at: m.sent_at });
      }
    }
  }

  return (rows ?? []).map((r: any) => {
    const isA = r.user_a_id === viewerProfileId;
    const lastMsg = lastMsgMap.get(r.id) ?? null;
    return {
      matchId: r.id,
      otherProfileId: isA ? r.user_b_id : r.user_a_id,
      otherName: isA ? r.user_b_name : r.user_a_name,
      matchedAt: r.matched_at,
      lastMessageBody: lastMsg?.body ?? null,
      lastMessageAt: lastMsg?.sent_at ?? null,
    };
  });
}

export async function fetchMessages(matchId: string, limit = 50): Promise<Message[]> {
  const { data: rows, error } = await supabase
    .from('messages')
    .select('id, match_id, sender_id, body, message_type, sent_at')
    .eq('match_id', matchId)
    .order('sent_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (rows ?? []).map((r: any) => ({
    id: r.id,
    matchId: r.match_id,
    senderId: r.sender_id,
    body: r.body,
    messageType: r.message_type,
    sentAt: r.sent_at,
  }));
}

export async function sendMessage({
  matchId,
  senderId,
  body,
}: {
  matchId: string;
  senderId: string;
  body: string;
}): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ match_id: matchId, sender_id: senderId, body, message_type: 'text' })
    .select('id, match_id, sender_id, body, message_type, sent_at')
    .single();
  if (error) throw error;
  if (!data) throw new Error('sendMessage: no data returned');
  return {
    id: data.id,
    matchId: data.match_id,
    senderId: data.sender_id,
    body: data.body,
    messageType: data.message_type,
    sentAt: data.sent_at,
  };
}
