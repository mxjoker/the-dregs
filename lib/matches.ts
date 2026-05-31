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
