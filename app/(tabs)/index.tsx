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
import { fetchMatchMomentData, type MatchMomentData } from '@/lib/matches';
import { MatchMomentModal } from '@/components/discover/MatchMomentModal';

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
  const [pendingMatch, setPendingMatch] = useState<MatchMomentData | null>(null);
  const pendingMatchRef = useRef<MatchMomentData | null>(null);
  const matchQueueRef = useRef<MatchMomentData[]>([]);
  // iOS can only present one native Modal at a time: when the but-why sheet
  // is up, match moments must queue, then present after the sheet closes.
  const butWhyProfileRef = useRef<string | null>(null);
  // A match can arrive via both the swipe response and realtime — dedupe.
  const seenMatchIdsRef = useRef<Set<string>>(new Set());

  function presentOrQueueMatch(data: MatchMomentData) {
    if (seenMatchIdsRef.current.has(data.matchId)) return;
    seenMatchIdsRef.current.add(data.matchId);
    if (pendingMatchRef.current || butWhyProfileRef.current) {
      matchQueueRef.current.push(data);
    } else {
      setPendingMatch(data);
    }
  }

  const [viewerProfileId, setViewerProfileId] = useState<string | null>(null);

  const imperativeSwipe = useRef<((dir: SwipeDirection) => void) | null>(null);
  const viewerProfileIdRef = useRef<string | null>(null);
  const fetchingRef = useRef(false);

  useEffect(() => {
    pendingMatchRef.current = pendingMatch;
  }, [pendingMatch]);

  // Load filters and assemble stack on mount
  useEffect(() => {
    async function init() {
      console.log('init called, userId:', userId);
      const savedFilters = await loadFilters();
      setFilters(savedFilters);

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId!)
        .single();
      if (!profile) return;
      viewerProfileIdRef.current = profile.id;
      setViewerProfileId(profile.id);

      await fetchStack(profile.id, savedFilters);
      const pile = await fetchDiscardPile(profile.id);
      setDiscardPileEmpty(pile.length === 0);
      setLoading(false);
      console.log('init complete, profileId:', profile.id);
    }
    if (userId) init();
  }, [userId]);

  // Realtime match subscription
  useEffect(() => {
    if (!viewerProfileId) return;
    console.log('[match] subscribing for profileId:', viewerProfileId);
    const channel = supabase
      .channel(`matches:${viewerProfileId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matches' },
        payload => {
          console.log('[match] realtime INSERT received:', JSON.stringify(payload.new));
          const match = payload.new as { id: string; user_a_id: string; user_b_id: string };
          const profileId = viewerProfileIdRef.current;
          console.log('[match] checking profileId:', profileId, 'against', match.user_a_id, match.user_b_id);
          if (match.user_a_id === profileId || match.user_b_id === profileId) {
            console.log('[match] match is mine — fetching moment data');
            fetchMatchMomentData(match.id, profileId)
              .then(data => {
                console.log('[match] fetchMatchMomentData resolved:', JSON.stringify(data));
                presentOrQueueMatch(data);
              })
              .catch(err => console.error('[match] fetchMatchMomentData error:', err));
          }
        },
      )
      .subscribe((status) => {
        console.log('[match] subscription status:', status);
      });
    return () => {
      console.log('[match] removing channel for profileId:', viewerProfileId);
      supabase.removeChannel(channel);
    };
  }, [viewerProfileId]);

  async function fetchStack(profileId: string, currentFilters: DiscoverFilters) {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const ids = await assembleStack(profileId, currentFilters);
      console.log('assembleStack returned ids:', ids);
      if (ids.length === 0) {
        setExhausted(true);
        return;
      }
      setStackIds(ids);
      const firstBatch = ids.slice(0, BATCH_SIZE);
      const fetched = await fetchProfiles(firstBatch, profileId);
      console.log('fetchProfiles returned:', fetched.length, 'profiles');
      setProfiles(fetched);
    } catch (e) {
      console.error('fetchStack error:', JSON.stringify(e), e);
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
        const result = await recordSwipe({
          swiperProfileId: viewerProfileIdRef.current,
          swipedProfileId: profileId,
          action: direction,
          targetedFlagId: selectedFlagId,
        });
        if (result.matched && result.matchId) {
          fetchMatchMomentData(result.matchId, viewerProfileIdRef.current)
            .then(presentOrQueueMatch)
            .catch(err => console.error('[match] fetchMatchMomentData from swipe error:', err));
        }
      }

      if (direction === 'pass') {
        setDiscardPileEmpty(false);
      }

      if (direction === 'like') {
        butWhyProfileRef.current = profileId;
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

  function handleMatchDismiss() {
    setPendingMatch(null);
    if (matchQueueRef.current.length > 0) {
      setTimeout(() => {
        const next = matchQueueRef.current.shift();
        if (next) setPendingMatch(next);
      }, 200);
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
    butWhyProfileRef.current = null;
    setButWhyProfile(null);
    if (!pendingMatchRef.current && matchQueueRef.current.length > 0) {
      setTimeout(() => {
        const next = matchQueueRef.current.shift();
        if (next) setPendingMatch(next);
      }, 250);
    }
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
      {!exhausted && profiles.length > 0 && (
        <ActionButtons
          onPass={() => imperativeSwipe.current?.('pass')}
          onIck={() => imperativeSwipe.current?.('ick')}
          onLike={() => imperativeSwipe.current?.('like')}
        />
      )}

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
      <MatchMomentModal
        visible={pendingMatch !== null}
        data={pendingMatch}
        onDismiss={handleMatchDismiss}
        onSendLine={(_line) => {
          const matchId = pendingMatch?.matchId;
          handleMatchDismiss();
          if (matchId) {
            router.push({ pathname: '/matches/[matchId]' as any, params: { matchId } });
          } else {
            router.push('/(tabs)/two' as any);
          }
        }}
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
