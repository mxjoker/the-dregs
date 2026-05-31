import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  onPass: () => void;
  onIck: () => void;
  onLike: () => void;
  disabled?: boolean;
};

export function ActionButtons({ onPass, onIck, onLike, disabled = false }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.buttonWrap}>
        <Pressable
          style={({ pressed }) => [styles.btn, styles.pass, pressed && styles.pressed]}
          onPress={onPass}
          disabled={disabled}
        >
          <Text style={styles.passIcon}>✕</Text>
        </Pressable>
        <Text style={styles.label}>pass</Text>
      </View>

      <View style={styles.buttonWrap}>
        <Pressable
          style={({ pressed }) => [styles.btn, styles.ick, styles.ickSize, pressed && styles.pressed]}
          onPress={onIck}
          disabled={disabled}
        >
          <Text style={styles.ickIcon}>🤢</Text>
        </Pressable>
        <Text style={styles.label}>ick</Text>
      </View>

      <View style={styles.buttonWrap}>
        <Pressable
          style={({ pressed }) => [styles.btn, styles.like, pressed && styles.pressed]}
          onPress={onLike}
          disabled={disabled}
        >
          <Text style={styles.likeIcon}>♥</Text>
        </Pressable>
        <Text style={styles.label}>like</Text>
      </View>
    </View>
  );
}

const BTN = 56;
const ICK = 44;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 12,
  },
  buttonWrap: {
    alignItems: 'center',
    gap: 4,
  },
  btn: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.93 }],
  },
  pass: {
    backgroundColor: '#2a2a2a',
  },
  passIcon: {
    fontSize: 22,
    color: '#aaaaaa',
  },
  ick: {
    backgroundColor: '#1e2a1a',
  },
  ickSize: {
    width: ICK,
    height: ICK,
    borderRadius: ICK / 2,
  },
  ickIcon: {
    fontSize: 18,
  },
  like: {
    backgroundColor: '#cc0040',
    shadowColor: '#ff0060',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  likeIcon: {
    fontSize: 22,
    color: '#ffffff',
  },
  label: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 0.5,
  },
});
