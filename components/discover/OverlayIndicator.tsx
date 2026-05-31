import { StyleSheet, Text } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

type Direction = 'like' | 'pass' | 'ick';

type Props = {
  direction: Direction;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
};

const CONFIG: Record<Direction, { label: string; color: string; threshold: number; side: 'left' | 'right' | 'center' }> = {
  like:  { label: '♥',  color: '#44ff88', threshold: 60,  side: 'left'   },
  pass:  { label: '✕',  color: '#888888', threshold: -60, side: 'right'  },
  ick:   { label: '🤢', color: '#ffffff', threshold: 60,  side: 'center' },
};

export function OverlayIndicator({ direction, translateX, translateY }: Props) {
  const cfg = CONFIG[direction];

  const animatedStyle = useAnimatedStyle(() => {
    let rawProgress = 0;
    if (direction === 'like') {
      rawProgress = translateX.value / cfg.threshold;
    } else if (direction === 'pass') {
      rawProgress = translateX.value / cfg.threshold; // threshold is negative, so this is positive when swiping left
    } else {
      rawProgress = translateY.value / cfg.threshold;
    }
    const opacity = interpolate(rawProgress, [0, 1], [0, 1], 'clamp');
    return { opacity };
  });

  const positionStyle =
    cfg.side === 'left'
      ? styles.topLeft
      : cfg.side === 'right'
        ? styles.topRight
        : styles.center;

  return (
    <Animated.View style={[styles.base, positionStyle, animatedStyle]}>
      <Text style={[styles.label, { color: cfg.color }]}>{cfg.label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
    padding: 8,
  },
  topLeft: {
    top: 16,
    left: 16,
  },
  topRight: {
    top: 16,
    right: 16,
  },
  center: {
    top: 200 as any,
    alignSelf: 'center',
  },
  label: {
    fontSize: 36,
    fontWeight: '900',
  },
});
