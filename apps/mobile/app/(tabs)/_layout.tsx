import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "../../lib/session";
import { useTheme } from "../../lib/theme";

export default function TabsLayout() {
  const t = useTheme();
  const { state } = useSession();
  const due = state.status === "in" ? state.me.dueCount : 0;
  return (
    <Tabs screenOptions={{ headerStyle: { backgroundColor: t.surface }, headerTintColor: t.fg, tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.border }, tabBarActiveTintColor: t.fg, tabBarInactiveTintColor: t.muted }}>
      <Tabs.Screen name="today" options={{ title: "Today", tabBarBadge: due > 0 ? due : undefined, tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-circle-outline" size={size} color={String(color)} /> }} />
      <Tabs.Screen name="pipeline" options={{ title: "Pipeline", tabBarIcon: ({ color, size }) => <Ionicons name="funnel-outline" size={size} color={String(color)} /> }} />
      <Tabs.Screen name="businesses" options={{ title: "Businesses", tabBarIcon: ({ color, size }) => <Ionicons name="business-outline" size={size} color={String(color)} /> }} />
      <Tabs.Screen name="more" options={{ title: "More", tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal-circle-outline" size={size} color={String(color)} /> }} />
    </Tabs>
  );
}
