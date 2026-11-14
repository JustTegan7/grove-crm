import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider, useSession } from "../lib/session";
import { useTheme } from "../lib/theme";
import { Empty } from "../components/ui";

function Gate() {
  const { state } = useSession();
  const t = useTheme();
  if (state.status === "loading") return <Empty text="Loading Grove..." />;
  const out = state.status === "out";
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: t.surface }, headerTintColor: t.fg, contentStyle: { backgroundColor: t.bg } }}>
      <Stack.Protected guard={out}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!out}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="business/[id]" options={{ title: "Business" }} />
        <Stack.Screen name="new-lead" options={{ title: "New lead", presentation: "modal" }} />
        <Stack.Screen name="scan" options={{ title: "Scan to log in", presentation: "modal" }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="auto" />
        <Gate />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
