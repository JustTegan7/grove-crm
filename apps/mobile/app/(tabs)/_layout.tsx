import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "../../lib/session";
import { useTheme } from "../../lib/theme";

// Open on Today, not whichever tab was last.
export const unstable_settings = { initialRouteName: "today" };

type IconName = React.ComponentProps<typeof Ionicons>["name"];

// Filled icon when the tab is selected, outline when it is not.
const icon = (on: IconName, off: IconName) =>
  function TabIcon({ color, focused }: { color: string | unknown; focused: boolean }) {
    return <Ionicons name={focused ? on : off} size={24} color={String(color)} />;
  };

export default function TabsLayout() {
  const t = useTheme();
  const { state } = useSession();
  const due = state.status === "in" ? state.me.dueCount : 0;
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: t.surface },
        headerTintColor: t.fg,
        headerTitleStyle: { fontWeight: "700" },
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.border, paddingTop: 6 },
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarBadgeStyle: { backgroundColor: t.overdue, color: "#fff", fontSize: 11, fontWeight: "700" },
      }}
    >
      <Tabs.Screen name="today" options={{ title: "Today", tabBarBadge: due > 0 ? due : undefined, tabBarIcon: icon("checkmark-circle", "checkmark-circle-outline") }} />
      <Tabs.Screen name="pipeline" options={{ title: "Pipeline", tabBarIcon: icon("funnel", "funnel-outline") }} />
      <Tabs.Screen name="businesses" options={{ title: "Businesses", tabBarIcon: icon("business", "business-outline") }} />
      <Tabs.Screen name="more" options={{ title: "More", tabBarIcon: icon("ellipsis-horizontal-circle", "ellipsis-horizontal-circle-outline") }} />
    </Tabs>
  );
}
