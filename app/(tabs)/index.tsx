import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Colors } from '@/constants/Colors';
import { CardStack } from '@/components/discover/CardStack';
import { ActionButtons } from '@/components/discover/ActionButtons';
import { ButWhySheet } from '@/components/discover/ButWhySheet';
import { FiltersSheet } from '@/components/discover/FiltersSheet';
import {
  assembleStack,
  fetchDiscardPile,
  fetchProfiles,
  loadFilters,
  recordSwipe,
  saveFilters,
  type DiscoverFilters,
  type DiscoverProfile,
  DEFAULT_FILTERS,
} from '@/lib/discover';
import { supabase } from '@/lib/supabase';
import { useOnboarding } from '@/context/OnboardingContext';

type SwipeDirection = 'like' | 'pass' | 'ick';

const REFILL_THRESHOLD = 5;
const BATCH_SIZE = 10;

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { userId } = useOnboarding();

  const [profiles, setProfiles] = useState<DiscoverProfile[]>([]);
  const [stackIds, setStackIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<DiscoverFilters>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [exhausted, setExhausted] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [butWhyProfile, setButWhyProfile] = useState<string | null>(null);
  const [selectedFlagId, setSelectedFlagId] = useState<string | null>(null);
  const [discardPileEmpty, setDiscardPileEmpty] = useState(true);

  const imperativeSwipe = useRef<((dir: SwipeDirection) => void) | null>(null);
  const viewerProfileIdRef = useRef<string | null>(null);
  const fetchingRef = useRef(false);

  // Load filters and assemble stack on mount
  useEffect(() => {
    async function init() {
      const savedFilters = await loadFilters();
      setFilters(savedFilters);

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId!)
        .single();
      if (!profile) return;
      viewerProfileIdRef.current = profile.id;

      await fetchStack(profile.id, savedFilters);
      const pile = await fetchDiscardPile(profile.id);
      setDiscardPileEmpty(pile.length === 0);
      setLoading(false);
    }
    if (userId) init();
  }, [userId]);

  // Realtime match subscription
  useEffect(() => {
    if (!viewerProfileIdRef.current) return;
    const channel = supabase
      .channel('matches')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matches' },
        payload => {
          const match = payload.new as { id: string; user_a_id: string; user_b_id: string };
          const profileId = viewerProfileIdRef.current;
          if (match.user_a_id === profileId || match.user_b_id === profileId) {
            // Match moment screen is out of scope (separate spec) — wire navigation there.
            console.log('match detected:', match.id);
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [viewerProfileIdRef.current]);

  async function fetchStack(profileId: string, currentFilters: DiscoverFilters) {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const ids = await assembleStack(profileId, currentFilters);
      if (ids.length === 0) {
        setExhausted(true);
        return;
      }
      setStackIds(ids);
      const firstBatch = ids.slice(0, BATCH_SIZE);
      const fetched = await fetchProfiles(firstBatch, profileId);
      setProfiles(fetched);
    } finally {
      fetchingRef.current = false;
    }
  }

  async function maybePrefetch(currentProfiles: DiscoverProfile[]) {
    if (fetchingRef.current) return;
    if (currentProfiles.length > REFILL_THRESHOLD) return;
    if (!viewerProfileIdRef.current) return;

    const loadedIds = currentProfiles.map(p => p.profileId);
    const remaining = stackIds.filter(id => !loadedIds.includes(id));
    if (remaining.length === 0) return;

    fetchingRef.current = true;
    const nextBatch = remaining.slice(0, BATCH_SIZE);
    const fetched = await fetchProfiles(nextBatch, viewerProfileIdRef.current);
    setProfiles(prev => [...prev, ...fetched]);
    fetchingRef.current = false;
  }

  const handleSwipe = useCallback(
    async (profileId: string, direction: SwipeDirection) => {
      setSelectedFlagId(null);

      setProfiles(prev => {
        const next = prev.filter(p => p.profileId !== profileId);
        maybePrefetch(next);
        if (next.length === 0) setExhausted(true);
        return next;
      });

      if (viewerProfileIdRef.current) {
        await recordSwipe({
          swiperProfileId: viewerProfileIdRef.current,
          swipedProfileId: profileId,
          action: direction,
          targetedFlagId: selectedFlagId,
        });
      }

      if (direction === 'pass') {
        setDiscardPileEmpty(false);
      }

      if (direction === 'like') {
        setButWhyProfile(profileId);
      }
    },
    [selectedFlagId],
  );

  async function handleFiltersClose(newFilters: DiscoverFilters) {
    setShowFilters(false);
    setFilters(newFilters);
    await saveFilters(newFilters);
    setProfiles([]);
    setExhausted(false);
    if (viewerProfileIdRef.current) {
      setLoading(true);
      await fetchStack(viewerProfileIdRef.current, newFilters);
      setLoading(false);
    }
  }

  async function handleButWhyClose(tag: string | null) {
    if (tag && butWhyProfile && viewerProfileIdRef.current) {
      supabase
        .from('swipes')
        .update({ but_why_tag: tag })
        .eq('swiper_id', viewerProfileIdRef.current)
        .eq('swiped_id', butWhyProfile);
    }
    setButWhyProfile(null);
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>assembling your stack...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        {!discardPileEmpty && (
          <Pressable onPress={() => router.push('/discover/second-thoughts')}>
            <Text style={styles.secondThoughtsBtn}>second thoughts</Text>
          </Pressable>
        )}
        <View style={styles.topBarSpacer} />
        <Pressable onPress={() => setShowFilters(true)}>
          <Text style={styles.filterIcon}>⊞</Text>
        </Pressable>
      </View>

      {/* Card stack */}
      <View style={styles.stackContainer}>
        {exhausted || profiles.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>
              {exhausted
                ? "you've seen everyone. they've seen you. ball's in someone's court."
                : 'loading...'}
            </Text>
          </View>
        ) : (
          <CardStack
            profiles={profiles}
            onSwipe={handleSwipe}
            onCardTap={profile =>
              router.push({ pathname: '/discover/full-profile', params: { profileId: profile.profileId } })
            }
            onFlagLongPress={flagId => setSelectedFlagId(flagId)}
            selectedFlagId={selectedFlagId}
            imperativeSwipeRef={imperativeSwipe}
          />
        )}
      </View>

      {/* Action buttons */}
      <ActionButtons
        onPass={() => imperativeSwipe.current?.('pass')}
        onIck={() => imperativeSwipe.current?.('ick')}
        onLike={() => imperativeSwipe.current?.('like')}
        disabled={exhausted || profiles.length === 0}
      />

      {/* Sheets */}
      <ButWhySheet
        visible={butWhyProfile !== null}
        onClose={handleButWhyClose}
      />
      <FiltersSheet
        visible={showFilters}
        filters={filters}
        onClose={handleFiltersClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 48,
  },
  secondThoughtsBtn: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  topBarSpacer: {
    flex: 1,
  },
  filterIcon: {
    fontSize: 20,
    color: Colors.textSecondary,
  },
  stackContainer: {
    flex: 1,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
  },
});
