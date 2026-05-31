import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SwipeCard } from './SwipeCard';
import { OverlayIndicator } from './OverlayIndicator';
import type { DiscoverProfile } from '@/lib/discover';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 120;
const VELOCITY_THRESHOLD = 800;

type SwipeDirection = 'like' | 'pass' | 'ick';

type Props = {
  profiles: DiscoverProfile[];
  onSwipe: (profileId: string, direction: SwipeDirection) => void;
  onCardTap: (profile: DiscoverProfile) => void;
  onFlagLongPress: (flagId: string) => void;
  selectedFlagId: string | null;
  imperativeSwipeRef?: React.MutableRefObject<((dir: SwipeDirection) => void) | null>;
};

export function CardStack({
  profiles,
  onSwipe,
  onCardTap,
  onFlagLongPress,
  selectedFlagId,
  imperativeSwipeRef,
}: Props) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  function fireSwipe(direction: SwipeDirection) {
    if (profiles.length === 0) return;
    const profileId = profiles[0].profileId;

    const targetX =
      direction === 'like'
        ? SCREEN_WIDTH * 1.5
        : direction === 'pass'
          ? -SCREEN_WIDTH * 1.5
          : 0;
    const targetY = direction === 'ick' ? 800 : 0;

    if (direction === 'ick') {
      translateY.value = withTiming(targetY, { duration: 300 }, () => {
        runOnJS(onSwipe)(profileId, direction);
        translateX.value = 0;
        translateY.value = 0;
      });
    } else {
      translateX.value = withTiming(targetX, { duration: 350 }, () => {
        runOnJS(onSwipe)(profileId, direction);
        translateX.value = 0;
        translateY.value = 0;
      });
    }
  }

  if (imperativeSwipeRef) {
    imperativeSwipeRef.current = fireSwipe;
  }

  const gesture = Gesture.Pan()
    .onUpdate(e => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd(e => {
      const absX = Math.abs(e.translationX);
      const velX = Math.abs(e.velocityX);
      const reachedThreshold = absX > SWIPE_THRESHOLD || velX > VELOCITY_THRESHOLD;

      if (reachedThreshold) {
        if (e.translationY > SWIPE_THRESHOLD && absX < SWIPE_THRESHOLD) {
          runOnJS(fireSwipe)('ick');
        } else if (e.translationX > 0) {
          runOnJS(fireSwipe)('like');
        } else {
          runOnJS(fireSwipe)('pass');
        }
      } else {
        translateX.value = withSpring(0, { stiffness: 300, damping: 30 });
        translateY.value = withSpring(0, { stiffness: 300, damping: 30 });
      }
    });

  const topCardStyle = useAnimatedStyle(() => {
    const rotate = (translateX.value / SCREEN_WIDTH) * 15;
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const secondCardStyle = useAnimatedStyle(() => {
    const progress = Math.min(
      Math.sqrt(translateX.value ** 2 + translateY.value ** 2) / SWIPE_THRESHOLD,
      1,
    );
    const scale = 0.95 + progress * 0.05;
    return { transform: [{ scale }] };
  });

  const thirdCardStyle = useAnimatedStyle(() => {
    const progress = Math.min(
      Math.sqrt(translateX.value ** 2 + translateY.value ** 2) / SWIPE_THRESHOLD,
      1,
    );
    const scale = 0.92 + progress * 0.03;
    return { transform: [{ scale }] };
  });

  const cardStyles = [thirdCardStyle, secondCardStyle, topCardStyle];
  const visibleProfiles = profiles.slice(0, 3);

  return (
    <View style={styles.container}>
      {visibleProfiles
        .slice()
        .reverse()
        .map((profile, reversedIndex) => {
          const stackIndex = visibleProfiles.length - 1 - reversedIndex; // 0 = top
          const isTop = stackIndex === 0;
          const animStyle = cardStyles[Math.min(stackIndex, 2)];

          const card = (
            <Animated.View
              key={profile.profileId}
              style={[styles.cardWrapper, animStyle, { zIndex: visibleProfiles.length - stackIndex }]}
            >
              <SwipeCard
                profile={profile}
                onTap={isTop ? () => onCardTap(profile) : undefined}
                onFlagLongPress={isTop ? onFlagLongPress : undefined}
                selectedFlagId={isTop ? selectedFlagId : null}
              />
              {isTop && (
                <>
                  <OverlayIndicator direction="like" translateX={translateX} translateY={translateY} />
                  <OverlayIndicator direction="pass" translateX={translateX} translateY={translateY} />
                  <OverlayIndicator direction="ick" translateX={translateX} translateY={translateY} />
                </>
              )}
            </Animated.View>
          );

          return isTop ? (
            <GestureDetector key={profile.profileId} gesture={gesture}>
              {card}
            </GestureDetector>
          ) : (
            card
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: 12,
  },
  cardWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
