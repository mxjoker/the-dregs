import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import type {
  DiscoverFilters,
  StackEntry,
  SwipeAction,
  ProfilePhoto,
  ProfileRedFlag,
} from './database.types';
import { DEFAULT_FILTERS } from './database.types';

export { DEFAULT_FILTERS };
export type { DiscoverFilters, StackEntry };

export const DISCARD_PILE_KEY = '@dregs/discard_pile';
const FILTERS_KEY = '@dregs/discover_filters';

// ─── Pure helpers (testable without Supabase) ────────────────────────────────

export function buildPhotoUrl(storagePath: string | null): string | null {
  if (!storagePath) return null;
  const { data } = supabase.storage.from('profile-photos').getPublicUrl(storagePath);
  return data.publicUrl;
}

export function formatAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

export function formatDistance(distanceMetres: number): string {
  if (distanceMetres < 1000) return '<1 km';
  return `${Math.round(distanceMetres / 1000)} km`;
}

export function getTopFlags(
  flags: Array<{ id: string; label: string; ick_count: number }>,
  n: number,
): typeof flags {
  return [...flags].sort((a, b) => b.ick_count - a.ick_count).slice(0, n);
}

// ─── Full profile shape assembled from DB ────────────────────────────────────

export type DiscoverProfile = {
  profileId: string;
  displayName: string;
  age: number;
  distanceM: number;
  chaosScore: number;
  employmentStatus: string | null;
  lookingFor: string | null;
  relationshipStructure: string | null;
  pronouns: string;
  primaryPhotoUrl: string | null;
  photos: string[]; // all photo URLs in display_order
  flags: Array<{ id: string; label: string; ick_count: number }>;
  prompts: Array<{ question: string; answer: string }>;
  biggestFailure: string | null;
  exFraming: 'work_history' | 'verified_purchases';
  exEntries: Array<Record<string, unknown>>;
  petActive: boolean;
  petEmoji: string | null;
  petOneliner: string | null;
};

// ─── Stack assembly ──────────────────────────────────────────────────────────

export async function assembleStack(
  viewerProfileId: string,
  filters: DiscoverFilters,
): Promise<string[]> {
  const { data, error } = await supabase.functions.invoke<{ profile_ids: string[] }>(
    'assemble_stack',
    {
      body: {
        viewer_id: viewerProfileId,
        max_distance_km: filters.maxDistanceKm,
        min_age: filters.minAge,
        max_age: filters.maxAge,
        relationship_structure: filters.relationshipStructure,
      },
    },
  );
  if (error || !data) throw error ?? new Error('assemble_stack returned no data');
  return data.profile_ids;
}

// ─── Fetch profile details for a batch of IDs ────────────────────────────────

export async function fetchProfiles(
  profileIds: string[],
  viewerProfileId: string,
): Promise<DiscoverProfile[]> {
  if (profileIds.length === 0) return [];

  const { data: rows, error } = await supabase
    .from('profiles')
    .select(
      `
      id,
      display_name,
      chaos_score,
      employment_status,
      looking_for,
      relationship_structure,
      pronouns,
      biggest_failure,
      ex_review_framing,
      users!inner ( date_of_birth ),
      profile_photos ( id, storage_path, display_order ),
      profile_red_flags ( id, red_flags ( id, label, ick_count ) ),
      profile_prompts ( answer, display_order, prompts ( prompt_text ) )
    `,
    )
    .in('id', profileIds);

  if (error) throw error;
  if (!rows) return [];

  return rows.map((row: any) => {
    const photos = ((row.profile_photos as ProfilePhoto[]) ?? [])
      .sort((a, b) => a.display_order - b.display_order)
      .map((p: ProfilePhoto) => buildPhotoUrl(p.storage_path))
      .filter((u: string | null): u is string => u !== null);

    const flags = ((row.profile_red_flags as ProfileRedFlag[]) ?? []).map((prf: ProfileRedFlag) => ({
      id: prf.red_flags.id,
      label: prf.red_flags.label,
      ick_count: prf.red_flags.ick_count,
    }));

    const prompts = ((row.profile_prompts as any[]) ?? [])
      .sort((a: any, b: any) => a.display_order - b.display_order)
      .map((pp: any) => ({ question: pp.prompts.prompt_text, answer: pp.answer }));

    const dateOfBirth = row.users?.date_of_birth;
    if (!dateOfBirth) throw new Error(`Profile ${row.id} has no linked user date_of_birth`);

    return {
      profileId: row.id,
      displayName: row.display_name,
      age: formatAge(dateOfBirth),
      distanceM: 0, // Distance requires PostGIS — populated by assemble_stack ordering
      chaosScore: row.chaos_score,
      employmentStatus: row.employment_status ?? null,
      lookingFor: row.looking_for ?? null,
      relationshipStructure: row.relationship_structure ?? null,
      pronouns: row.pronouns,
      primaryPhotoUrl: photos[0] ?? null,
      photos,
      flags: getTopFlags(flags, flags.length),
      prompts,
      biggestFailure: row.biggest_failure ?? null,
      exFraming: row.ex_review_framing,
      exEntries: [],
      petActive: false,
      petEmoji: null,
      petOneliner: null,
    };
  });
}

// ─── Record a swipe ──────────────────────────────────────────────────────────

export async function recordSwipe(params: {
  swiperProfileId: string;
  swipedProfileId: string;
  action: SwipeAction;
  targetedFlagId?: string | null;
  butWhyTag?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('swipes').insert({
    swiper_id: params.swiperProfileId,
    swiped_id: params.swipedProfileId,
    action: params.action,
    targeted_flag_id: params.targetedFlagId ?? null,
    but_why_tag: params.butWhyTag ?? null,
  });
  if (error) throw error;
}

// ─── Discard pile (Second Thoughts) ──────────────────────────────────────────

export async function fetchDiscardPile(viewerProfileId: string): Promise<DiscoverProfile[]> {
  const { data: swipeRows, error } = await supabase
    .from('swipes')
    .select('swiped_id, swiped_at')
    .eq('swiper_id', viewerProfileId)
    .eq('action', 'pass')
    .order('swiped_at', { ascending: false });

  if (error) throw error;
  if (!swipeRows || swipeRows.length === 0) return [];

  const ids = swipeRows.map((r: any) => r.swiped_id);
  return fetchProfiles(ids, viewerProfileId);
}

// ─── Filter persistence ──────────────────────────────────────────────────────

export async function loadFilters(): Promise<DiscoverFilters> {
  const raw = await AsyncStorage.getItem(FILTERS_KEY);
  if (!raw) return DEFAULT_FILTERS;
  try {
    return JSON.parse(raw) as DiscoverFilters;
  } catch {
    return DEFAULT_FILTERS;
  }
}

export async function saveFilters(filters: DiscoverFilters): Promise<void> {
  await AsyncStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
}
