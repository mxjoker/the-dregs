import { View, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

export function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i < current ? styles.dotDone : i === current ? styles.dotActive : styles.dotFuture,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 32 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotDone: { backgroundColor: '#3a3a3a' },
  dotActive: { backgroundColor: Colors.accent },
  dotFuture: { backgroundColor: '#1e1e1e' },
});
