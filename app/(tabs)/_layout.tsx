import { Tabs } from 'expo-router';
import { Colors } from '@/constants/Colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.accent,
        tabBarStyle: { backgroundColor: Colors.bg, borderTopColor: Colors.border },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'discover', tabBarLabel: 'discover' }}
      />
      <Tabs.Screen
        name="two"
        options={{ title: 'matches', tabBarLabel: 'matches' }}
      />
    </Tabs>
  );
}
