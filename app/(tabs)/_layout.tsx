// Placeholder tabs layout — will be replaced when building main navigation.
import { Tabs } from 'expo-router';
import { Colors } from '@/constants/Colors';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: Colors.accent, headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="two" options={{ title: 'Two' }} />
    </Tabs>
  );
}
