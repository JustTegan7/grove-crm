import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider, useSession } from "../lib/session";
import { useTheme } from "../lib/theme";
import { Body, Button, Empty } from "../components/ui";
import { View } from "react-native";

function Gate() {
  const { state, refresh, signOut } = useSession();
  const t = useTheme();
  if (state.status === "loading") return <Empty text="Loading Grove..." />;
  if (state.status === "error") {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, justifyContent: "center", padding: 24, gap: 12 }}>
        <Body bold>Grove could not load</Body>
        <Body small muted>{state.message}</Body>
        <Button title="Try again" onPress={refresh} />
        <Button kind="soft" title="Sign out" onPress={signOut} />
      </View>
    );
  }
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
